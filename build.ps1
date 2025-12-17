<#
.SYNOPSIS
    QR Studio Windows Build Script
    
.DESCRIPTION
    Comprehensive build script for QR Studio that handles:
    - Prerequisite verification (Go, Node.js, Wails CLI)
    - Dependency installation (Go modules, npm packages)
    - Icon generation (creates .ico from SVG)
    - Frontend build (Vite bundling)
    - Wails production build (Windows executable)
    
    This script produces a production-ready Windows executable in the
    build/bin directory.
    
.PARAMETER Clean
    Clean build directories before building
    
.PARAMETER SkipIconGeneration
    Skip icon generation if appicon.png already exists
    
.PARAMETER DevMode
    Run in development mode instead of building
    
.EXAMPLE
    .\build.ps1
    Full production build
    
.EXAMPLE
    .\build.ps1 -Clean
    Clean build directories and rebuild
    
.EXAMPLE
    .\build.ps1 -DevMode
    Start development server with hot reload
    
.NOTES
    Author: QR Studio Team
    Version: 1.0.0
    Requires: Go 1.21+, Node.js 18+, Wails CLI v2.10+
#>

param(
    [switch]$Clean,
    [switch]$SkipIconGeneration,
    [switch]$DevMode
)

# ============================================================================
# CONFIGURATION
# ============================================================================
$ErrorActionPreference = "Stop"
$ScriptRoot = $PSScriptRoot
$BuildDir = Join-Path $ScriptRoot "build"
$BinDir = Join-Path $BuildDir "bin"
$IconPath = Join-Path $BuildDir "appicon.png"
$FrontendDir = Join-Path $ScriptRoot "frontend"

# ANSI colors for output
$Colors = @{
    Success = "`e[32m"
    Error   = "`e[31m"
    Warning = "`e[33m"
    Info    = "`e[36m"
    Reset   = "`e[0m"
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Status {
    <#
    .SYNOPSIS
        Writes a colored status message to the console
    #>
    param(
        [string]$Message,
        [string]$Type = "Info"
    )
    
    $color = $Colors[$Type]
    $prefix = switch ($Type) {
        "Success" { "✓" }
        "Error"   { "✗" }
        "Warning" { "⚠" }
        "Info"    { "→" }
    }
    
    Write-Host "$color$prefix $Message$($Colors.Reset)"
}

function Test-Command {
    <#
    .SYNOPSIS
        Tests if a command exists in the system PATH
    #>
    param([string]$Command)
    
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Get-CommandVersion {
    <#
    .SYNOPSIS
        Gets the version of a command
    #>
    param(
        [string]$Command,
        [string]$VersionArg = "--version"
    )
    
    try {
        $version = & $Command $VersionArg 2>&1 | Select-Object -First 1
        return $version
    }
    catch {
        return "Unknown"
    }
}

# ============================================================================
# PREREQUISITE CHECKS
# ============================================================================

function Test-Prerequisites {
    <#
    .SYNOPSIS
        Verifies all required tools are installed and available
    #>
    Write-Host "`n$($Colors.Info)═══════════════════════════════════════════════════════════════$($Colors.Reset)"
    Write-Host "$($Colors.Info)   QR Studio Build Script - Checking Prerequisites$($Colors.Reset)"
    Write-Host "$($Colors.Info)═══════════════════════════════════════════════════════════════$($Colors.Reset)`n"
    
    $allGood = $true
    
    # Check Go
    if (Test-Command "go") {
        $goVersion = Get-CommandVersion "go" "version"
        Write-Status "Go: $goVersion" -Type Success
    }
    else {
        Write-Status "Go is not installed. Download from https://golang.org/dl/" -Type Error
        $allGood = $false
    }
    
    # Check Node.js
    if (Test-Command "node") {
        $nodeVersion = Get-CommandVersion "node" "--version"
        Write-Status "Node.js: $nodeVersion" -Type Success
    }
    else {
        Write-Status "Node.js is not installed. Download from https://nodejs.org/" -Type Error
        $allGood = $false
    }
    
    # Check npm
    if (Test-Command "npm") {
        $npmVersion = Get-CommandVersion "npm" "--version"
        Write-Status "npm: v$npmVersion" -Type Success
    }
    else {
        Write-Status "npm is not installed." -Type Error
        $allGood = $false
    }
    
    # Check Wails CLI
    if (Test-Command "wails") {
        $wailsVersion = Get-CommandVersion "wails" "version"
        Write-Status "Wails CLI: $wailsVersion" -Type Success
    }
    else {
        Write-Status "Wails CLI is not installed. Install with: go install github.com/wailsapp/wails/v2/cmd/wails@latest" -Type Error
        $allGood = $false
    }
    
    Write-Host ""
    
    if (-not $allGood) {
        Write-Status "Please install missing prerequisites before building." -Type Error
        exit 1
    }
    
    Write-Status "All prerequisites satisfied!" -Type Success
}

# ============================================================================
# CLEAN BUILD
# ============================================================================

function Invoke-Clean {
    <#
    .SYNOPSIS
        Cleans build artifacts and directories
    #>
    Write-Host "`n$($Colors.Warning)Cleaning build directories...$($Colors.Reset)"
    
    $dirsToClean = @(
        (Join-Path $FrontendDir "dist"),
        (Join-Path $ScriptRoot "build\bin"),
        (Join-Path $FrontendDir "node_modules\.vite")
    )
    
    foreach ($dir in $dirsToClean) {
        if (Test-Path $dir) {
            Remove-Item -Path $dir -Recurse -Force
            Write-Status "Removed: $dir" -Type Warning
        }
    }
    
    Write-Status "Clean complete!" -Type Success
}

# ============================================================================
# ICON GENERATION
# ============================================================================

function New-ApplicationIcon {
    <#
    .SYNOPSIS
        Creates the application icon for Windows builds
        
    .DESCRIPTION
        Generates a 1024x1024 PNG icon file that Wails will convert to ICO format.
        Uses a base64-encoded PNG if no source icon exists.
    #>
    
    if ($SkipIconGeneration -and (Test-Path $IconPath)) {
        Write-Status "Skipping icon generation (appicon.png exists)" -Type Info
        return
    }
    
    Write-Host "`n$($Colors.Info)Generating application icon...$($Colors.Reset)"
    
    # Ensure build directory exists
    if (-not (Test-Path $BuildDir)) {
        New-Item -Path $BuildDir -ItemType Directory -Force | Out-Null
    }
    
    # Check if we have a source icon
    $sourceIcon = Join-Path $ScriptRoot "assets\icon.png"
    if (Test-Path $sourceIcon) {
        Copy-Item -Path $sourceIcon -Destination $IconPath -Force
        Write-Status "Copied icon from assets\icon.png" -Type Success
        return
    }
    
    # Generate a simple QR-themed icon using ImageMagick if available
    if (Test-Command "magick") {
        Write-Status "Generating icon with ImageMagick..." -Type Info
        
        # Create a simple QR-themed icon
        # Purple gradient background with QR pattern overlay
        $magickArgs = @(
            "-size", "1024x1024",
            "xc:none",
            "-fill", "gradient:#8b5cf6-#6366f1",
            "-draw", "roundrectangle 50,50 974,974 100,100",
            # Add QR-like pattern
            "-fill", "white",
            "-draw", "rectangle 200,200 350,350",
            "-draw", "rectangle 200,400 350,550",
            "-draw", "rectangle 200,600 350,750",
            "-draw", "rectangle 400,200 550,350",
            "-draw", "rectangle 600,200 750,350",
            "-draw", "rectangle 400,400 550,550",
            "-draw", "rectangle 600,400 750,550",
            "-draw", "rectangle 400,600 550,750",
            "-draw", "rectangle 600,600 750,750",
            "-draw", "rectangle 700,700 824,824",
            $IconPath
        )
        
        & magick @magickArgs
        Write-Status "Icon generated with ImageMagick" -Type Success
    }
    else {
        # Create a placeholder icon using pure PowerShell/.NET
        Write-Status "ImageMagick not found, creating basic icon..." -Type Warning
        
        # Use .NET to create a simple icon
        Add-Type -AssemblyName System.Drawing
        
        $bitmap = New-Object System.Drawing.Bitmap(1024, 1024)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        
        # Enable anti-aliasing
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        
        # Background gradient (purple theme)
        $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            (New-Object System.Drawing.Point(0, 0)),
            (New-Object System.Drawing.Point(1024, 1024)),
            [System.Drawing.Color]::FromArgb(139, 92, 246),  # #8b5cf6
            [System.Drawing.Color]::FromArgb(99, 102, 241)   # #6366f1
        )
        
        # Draw rounded rectangle background
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $rect = New-Object System.Drawing.Rectangle(50, 50, 924, 924)
        $radius = 100
        $path.AddArc($rect.X, $rect.Y, $radius * 2, $radius * 2, 180, 90)
        $path.AddArc($rect.Right - $radius * 2, $rect.Y, $radius * 2, $radius * 2, 270, 90)
        $path.AddArc($rect.Right - $radius * 2, $rect.Bottom - $radius * 2, $radius * 2, $radius * 2, 0, 90)
        $path.AddArc($rect.X, $rect.Bottom - $radius * 2, $radius * 2, $radius * 2, 90, 90)
        $path.CloseFigure()
        
        $graphics.FillPath($brush, $path)
        
        # Draw QR-like pattern (white squares)
        $whiteBrush = [System.Drawing.Brushes]::White
        
        # Grid of squares representing a stylized QR code
        $squares = @(
            @(200, 200, 150, 150),
            @(200, 400, 150, 150),
            @(200, 600, 150, 150),
            @(400, 200, 150, 150),
            @(600, 200, 150, 150),
            @(400, 400, 150, 150),
            @(600, 400, 150, 150),
            @(400, 600, 150, 150),
            @(600, 600, 150, 150),
            @(674, 674, 150, 150)
        )
        
        foreach ($sq in $squares) {
            $graphics.FillRectangle($whiteBrush, $sq[0], $sq[1], $sq[2], $sq[3])
        }
        
        # Draw corner position markers (QR code style)
        $cornerSize = 200
        $innerSize = 100
        $dotSize = 60
        
        # Top-left corner marker
        $graphics.FillRectangle($whiteBrush, 150, 150, $cornerSize, $cornerSize)
        $graphics.FillRectangle($brush, 175, 175, 150, 150)
        $graphics.FillRectangle($whiteBrush, 195, 195, 110, 110)
        
        # Save the bitmap
        $bitmap.Save($IconPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        # Cleanup
        $graphics.Dispose()
        $bitmap.Dispose()
        $brush.Dispose()
        $path.Dispose()
        
        Write-Status "Basic icon created with .NET" -Type Success
    }
}

# ============================================================================
# DEPENDENCY INSTALLATION
# ============================================================================

function Install-Dependencies {
    <#
    .SYNOPSIS
        Installs Go modules and npm packages
    #>
    Write-Host "`n$($Colors.Info)Installing dependencies...$($Colors.Reset)"
    
    # Go modules
    Write-Status "Downloading Go modules..." -Type Info
    Push-Location $ScriptRoot
    try {
        go mod download
        go mod tidy
        Write-Status "Go modules installed" -Type Success
    }
    finally {
        Pop-Location
    }
    
    # npm packages (from frontend directory)
    Write-Status "Installing npm packages..." -Type Info
    Push-Location $FrontendDir
    try {
        npm install --silent
        Write-Status "npm packages installed" -Type Success
    }
    finally {
        Pop-Location
    }
}

# ============================================================================
# BUILD PROCESS
# ============================================================================

function Invoke-Build {
    <#
    .SYNOPSIS
        Executes the Wails production build
    #>
    Write-Host "`n$($Colors.Info)═══════════════════════════════════════════════════════════════$($Colors.Reset)"
    Write-Host "$($Colors.Info)   Building QR Studio for Windows$($Colors.Reset)"
    Write-Host "$($Colors.Info)═══════════════════════════════════════════════════════════════$($Colors.Reset)`n"
    
    Push-Location $ScriptRoot
    try {
        # Run Wails build
        Write-Status "Starting Wails build..." -Type Info
        wails build -clean -platform windows/amd64
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n$($Colors.Success)═══════════════════════════════════════════════════════════════$($Colors.Reset)"
            Write-Host "$($Colors.Success)   BUILD SUCCESSFUL!$($Colors.Reset)"
            Write-Host "$($Colors.Success)═══════════════════════════════════════════════════════════════$($Colors.Reset)`n"
            
            $exePath = Join-Path $BinDir "QRStudio.exe"
            if (Test-Path $exePath) {
                $fileInfo = Get-Item $exePath
                $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
                Write-Status "Executable: $exePath" -Type Success
                Write-Status "Size: $sizeMB MB" -Type Info
            }
        }
        else {
            Write-Status "Build failed with exit code $LASTEXITCODE" -Type Error
            exit 1
        }
    }
    finally {
        Pop-Location
    }
}

function Invoke-DevMode {
    <#
    .SYNOPSIS
        Starts the Wails development server with hot reload
    #>
    Write-Host "`n$($Colors.Info)Starting development mode...$($Colors.Reset)"
    Write-Status "Hot reload enabled. Press Ctrl+C to stop." -Type Info
    
    Push-Location $ScriptRoot
    try {
        wails dev
    }
    finally {
        Pop-Location
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

try {
    # Record start time
    $startTime = Get-Date
    
    # Check prerequisites
    Test-Prerequisites
    
    # Clean if requested
    if ($Clean) {
        Invoke-Clean
    }
    
    # Development mode
    if ($DevMode) {
        Invoke-DevMode
        exit 0
    }
    
    # Generate icon
    New-ApplicationIcon
    
    # Install dependencies
    Install-Dependencies
    
    # Build
    Invoke-Build
    
    # Calculate build time
    $endTime = Get-Date
    $duration = $endTime - $startTime
    Write-Host "`n$($Colors.Info)Build completed in $($duration.Minutes)m $($duration.Seconds)s$($Colors.Reset)`n"
}
catch {
    Write-Status "Build failed: $_" -Type Error
    Write-Host $_.ScriptStackTrace
    exit 1
}
