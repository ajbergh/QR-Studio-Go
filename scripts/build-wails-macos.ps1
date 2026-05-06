<#
.SYNOPSIS
    QR Studio Wails Build Script — macOS

.DESCRIPTION
    Builds the QR Studio desktop application for macOS using Wails.
    Supports Intel (amd64), Apple Silicon (arm64), and Universal binaries.

    NOTE: Cross-compiling for macOS from a non-macOS host requires a macOS
    toolchain (Xcode) and CGO cross-compilation setup. For best results,
    run this script on a macOS machine or a macOS CI runner.

.PARAMETER Architecture
    Target architecture. Values: amd64, arm64, universal, all. Default: universal
    - amd64    : Intel x86-64
    - arm64    : Apple Silicon (M-series)
    - universal: Fat binary combining amd64 + arm64
    - all      : Builds amd64, arm64, and universal separately

.PARAMETER Clean
    Clean build directories before building

.PARAMETER SkipDeps
    Skip dependency installation (Go modules, npm packages)

.EXAMPLE
    .\build-wails-macos.ps1
    Build a Universal (Intel + Apple Silicon) binary

.EXAMPLE
    .\build-wails-macos.ps1 -Architecture arm64
    Build for Apple Silicon only

.EXAMPLE
    .\build-wails-macos.ps1 -Architecture all -Clean
    Clean and build all macOS variants

.NOTES
    Requires: Go 1.21+, Node.js 18+, Wails CLI v2+, Xcode Command Line Tools
#>

param(
    [ValidateSet("amd64", "arm64", "universal", "all")]
    [string]$Architecture = "universal",
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
    Write-Host "$($Colors.Info)   QR Studio — Wails Build (macOS)$($Colors.Reset)"
    Write-Host "$($Colors.Info)═══════════════════════════════════════════════════════════════$($Colors.Reset)`n"

    if ($IsWindows) {
        Write-Status "WARNING: Cross-compiling for macOS from Windows requires a macOS" -Type Warning
        Write-Status "         toolchain and CGO cross-compilation setup." -Type Warning
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

    # Warn if Xcode CLT missing (macOS only)
    if ($IsMacOS) {
        $xcrun = & xcode-select -p 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Status "Xcode CLT: $xcrun" -Type Success
        } else {
            Write-Status "Xcode Command Line Tools not found. Run: xcode-select --install" -Type Warning
        }
    }

    Write-Host ""
    if (-not $ok) { Write-Status "Install missing prerequisites and retry." -Type Error; exit 1 }
}

function Invoke-Clean {
    Write-Host "`n$($Colors.Warning)Cleaning build artifacts...$($Colors.Reset)"
    foreach ($d in @((Join-Path $FrontendDir "dist"), $BinDir, (Join-Path $FrontendDir "node_modules\.vite"))) {
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
    $platform = "darwin/$Arch"
    Write-Host "`n$($Colors.Info)Building for $platform...$($Colors.Reset)"
    Push-Location $ProjectRoot
    try {
        wails build -clean -platform $platform
        if ($LASTEXITCODE -ne 0) {
            Write-Status "Build failed for $platform (exit $LASTEXITCODE)" -Type Error; exit 1
        }
        # Report output
        $appBundle = Join-Path $BinDir "QRStudio.app"
        $binary    = Join-Path $BinDir "QRStudio"
        if (Test-Path $appBundle) {
            Write-Status "Output : $appBundle" -Type Success
        } elseif (Test-Path $binary) {
            $size = [math]::Round((Get-Item $binary).Length / 1MB, 2)
            Write-Status "Output : $binary ($size MB)" -Type Success
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

    $targets = switch ($Architecture) {
        "all"       { @("amd64","arm64","universal") }
        "universal" { @("universal") }
        default     { @($Architecture) }
    }

    foreach ($arch in $targets) { Invoke-WailsBuild $arch }

    $dur = (Get-Date) - $start
    Write-Host "`n$($Colors.Success)All macOS builds completed in $($dur.Minutes)m $($dur.Seconds)s$($Colors.Reset)`n"
} catch {
    Write-Status "Build failed: $_" -Type Error
    Write-Host $_.ScriptStackTrace
    exit 1
}
