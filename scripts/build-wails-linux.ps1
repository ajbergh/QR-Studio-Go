<#
.SYNOPSIS
    QR Studio Wails Build Script — Linux

.DESCRIPTION
    Builds the QR Studio desktop application for Linux using Wails.
    Supports x86-64 (amd64) and ARM64 targets.

    NOTE: Cross-compiling for Linux with CGO (required by Wails/SQLite) from a
    non-Linux host requires a Linux cross-compiler toolchain. For best results,
    run this script on a Linux machine or a Linux CI runner (e.g., Ubuntu).
    On Linux, install build dependencies: gcc libgtk-3-dev libwebkit2gtk-4.0-dev

.PARAMETER Architecture
    Target architecture. Values: amd64, arm64, all. Default: amd64

.PARAMETER Clean
    Clean build directories before building

.PARAMETER SkipDeps
    Skip dependency installation (Go modules, npm packages)

.EXAMPLE
    .\build-wails-linux.ps1
    Build for Linux x86-64

.EXAMPLE
    .\build-wails-linux.ps1 -Architecture arm64
    Build for Linux ARM64

.EXAMPLE
    .\build-wails-linux.ps1 -Architecture all -Clean
    Clean and build for both Linux architectures

.NOTES
    Requires: Go 1.21+, Node.js 18+, Wails CLI v2+
    Linux native: gcc, libgtk-3-dev, libwebkit2gtk-4.0-dev
#>

param(
    [ValidateSet("amd64", "arm64", "all")]
    [string]$Architecture = "amd64",
    [switch]$Clean,
    [switch]$SkipDeps
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$BuildDir    = Join-Path $ProjectRoot "build"
$BinDir      = Join-Path $BuildDir "bin"
$FrontendDir = Join-Path $ProjectRoot "frontend"

$Colors = @{
    Success = "`e[32m"; Error = "`e[31m"; Warning = "`e[33m"
    Info    = "`e[36m"; Reset  = "`e[0m"
}

function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    $color  = $Colors[$Type]
    $prefix = switch ($Type) {
        "Success" { "✓" } "Error" { "✗" } "Warning" { "⚠" } default { "→" }
    }
    Write-Host "$color$prefix $Message$($Colors.Reset)"
}

function Test-Command { param([string]$Command); return [bool](Get-Command $Command -ErrorAction SilentlyContinue) }

function Test-Prerequisites {
    Write-Host "`n$($Colors.Info)═══════════════════════════════════════════════════════════════$($Colors.Reset)"
    Write-Host "$($Colors.Info)   QR Studio — Wails Build (Linux)$($Colors.Reset)"
    Write-Host "$($Colors.Info)═══════════════════════════════════════════════════════════════$($Colors.Reset)`n"

    if ($IsWindows -or $IsMacOS) {
        Write-Status "WARNING: Cross-compiling for Linux requires a Linux cross-compiler" -Type Warning
        Write-Status "         toolchain with CGO support. Consider using a Linux runner." -Type Warning
        Write-Host ""
    }

    $ok = $true
    foreach ($cmd in @("go","node","npm","wails")) {
        if (Test-Command $cmd) {
            $ver = & $cmd --version 2>&1 | Select-Object -First 1
            Write-Status "$cmd`: $ver" -Type Success
        } else {
            Write-Status "$cmd is not installed or not in PATH" -Type Error
            $ok = $false
        }
    }

    # On Linux, check for required system libs
    if ($IsLinux) {
        foreach ($pkg in @("gcc","pkg-config")) {
            if (Test-Command $pkg) {
                Write-Status "$pkg found" -Type Success
            } else {
                Write-Status "$pkg not found. Install build-essential and GTK/WebKit dev headers." -Type Warning
            }
        }
    }

    Write-Host ""
    if (-not $ok) { Write-Status "Install missing prerequisites and retry." -Type Error; exit 1 }
}

function Invoke-Clean {
    Write-Host "`n$($Colors.Warning)Cleaning build artifacts...$($Colors.Reset)"
    foreach ($d in @((Join-Path $FrontendDir "dist"), $BinDir, (Join-Path $FrontendDir "node_modules/.vite"))) {
        if (Test-Path $d) { Remove-Item $d -Recurse -Force; Write-Status "Removed: $d" -Type Warning }
    }
    Write-Status "Clean complete" -Type Success
}

function Install-Dependencies {
    Write-Host "`n$($Colors.Info)Installing dependencies...$($Colors.Reset)"
    Push-Location $ProjectRoot
    try { go mod download; go mod tidy; Write-Status "Go modules ready" -Type Success } finally { Pop-Location }
    Push-Location $FrontendDir
    try { npm install --silent; Write-Status "npm packages ready" -Type Success } finally { Pop-Location }
}

function Invoke-WailsBuild {
    param([string]$Arch)
    $platform = "linux/$Arch"
    Write-Host "`n$($Colors.Info)Building for $platform...$($Colors.Reset)"
    Push-Location $ProjectRoot
    try {
        wails build -clean -platform $platform
        if ($LASTEXITCODE -ne 0) {
            Write-Status "Build failed for $platform (exit $LASTEXITCODE)" -Type Error; exit 1
        }
        $binary = Join-Path $BinDir "QRStudio"
        if (Test-Path $binary) {
            $size = [math]::Round((Get-Item $binary).Length / 1MB, 2)
            # Rename if building both arches so they don't overwrite each other
            if ($Architecture -eq "all") {
                $dest = Join-Path $BinDir "QRStudio-linux-$Arch"
                Move-Item $binary $dest -Force
                Write-Status "Output : $dest ($size MB)" -Type Success
            } else {
                Write-Status "Output : $binary ($size MB)" -Type Success
            }
        } else {
            Write-Status "Build complete — check $BinDir for output" -Type Success
        }
    } finally { Pop-Location }
}

# ── Main ─────────────────────────────────────────────────────────────────────
try {
    $start = Get-Date
    Test-Prerequisites
    if ($Clean)         { Invoke-Clean }
    if (-not $SkipDeps) { Install-Dependencies }

    $targets = if ($Architecture -eq "all") { @("amd64","arm64") } else { @($Architecture) }
    foreach ($arch in $targets) { Invoke-WailsBuild $arch }

    $dur = (Get-Date) - $start
    Write-Host "`n$($Colors.Success)All Linux builds completed in $($dur.Minutes)m $($dur.Seconds)s$($Colors.Reset)`n"
} catch {
    Write-Status "Build failed: $_" -Type Error
    Write-Host $_.ScriptStackTrace
    exit 1
}
