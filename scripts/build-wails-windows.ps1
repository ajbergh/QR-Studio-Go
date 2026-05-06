<#
.SYNOPSIS
    QR Studio Wails Build Script — Windows

.DESCRIPTION
    Builds the QR Studio desktop application for Windows using Wails.
    Supports Windows x86-64 (amd64) and ARM64 targets.

.PARAMETER Architecture
    Target architecture. Values: amd64, arm64, all. Default: amd64

.PARAMETER Clean
    Clean build directories before building

.PARAMETER SkipDeps
    Skip dependency installation (Go modules, npm packages)

.EXAMPLE
    .\build-wails-windows.ps1
    Build for Windows x86-64

.EXAMPLE
    .\build-wails-windows.ps1 -Architecture arm64
    Build for Windows ARM64

.EXAMPLE
    .\build-wails-windows.ps1 -Architecture all -Clean
    Clean and build for all Windows architectures

.NOTES
    Requires: Go 1.21+, Node.js 18+, Wails CLI v2+
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
    Write-Host "$($Colors.Info)   QR Studio — Wails Build (Windows)$($Colors.Reset)"
    Write-Host "$($Colors.Info)═══════════════════════════════════════════════════════════════$($Colors.Reset)`n"

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
    $platform = "windows/$Arch"
    Write-Host "`n$($Colors.Info)Building for $platform...$($Colors.Reset)"
    Push-Location $ProjectRoot
    try {
        wails build -clean -platform $platform
        if ($LASTEXITCODE -ne 0) {
            Write-Status "Build failed for $platform (exit $LASTEXITCODE)" -Type Error; exit 1
        }
        $suffix = if ($Arch -eq "arm64") { "_arm64" } else { "" }
        $exe = Join-Path $BinDir "QRStudio${suffix}.exe"
        # Wails outputs QRStudio.exe regardless of arch; rename if building both
        $default = Join-Path $BinDir "QRStudio.exe"
        if (($Architecture -eq "all") -and (Test-Path $default) -and ($suffix -ne "")) {
            Move-Item $default $exe -Force
            Write-Status "Renamed to QRStudio_arm64.exe" -Type Info
        }
        if (Test-Path $default) {
            $size = [math]::Round((Get-Item $default).Length / 1MB, 2)
            Write-Status "Output : $default ($size MB)" -Type Success
        } elseif (Test-Path $exe) {
            $size = [math]::Round((Get-Item $exe).Length / 1MB, 2)
            Write-Status "Output : $exe ($size MB)" -Type Success
        }
    } finally { Pop-Location }
}

# ── Main ─────────────────────────────────────────────────────────────────────
try {
    $start = Get-Date
    Test-Prerequisites
    if ($Clean)    { Invoke-Clean }
    if (-not $SkipDeps) { Install-Dependencies }

    $targets = if ($Architecture -eq "all") { @("amd64","arm64") } else { @($Architecture) }
    foreach ($arch in $targets) { Invoke-WailsBuild $arch }

    $dur = (Get-Date) - $start
    Write-Host "`n$($Colors.Success)All Windows builds completed in $($dur.Minutes)m $($dur.Seconds)s$($Colors.Reset)`n"
} catch {
    Write-Status "Build failed: $_" -Type Error
    Write-Host $_.ScriptStackTrace
    exit 1
}
