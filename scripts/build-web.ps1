<#
.SYNOPSIS
    QR Studio Web Build Script

.DESCRIPTION
    Builds the QR Studio frontend as a standard browser-based web application.
    Runs `npm run build:web` which produces a static site in frontend/dist.
    No Go/Wails toolchain is required.

.PARAMETER Clean
    Remove existing dist and Vite cache before building

.PARAMETER SkipInstall
    Skip `npm install` (use when node_modules is already up to date)

.PARAMETER OutDir
    Override the output directory. Default: <project-root>/frontend/dist

.EXAMPLE
    .\build-web.ps1
    Install deps and build the web app

.EXAMPLE
    .\build-web.ps1 -Clean
    Clean dist, then build

.EXAMPLE
    .\build-web.ps1 -SkipInstall
    Build without reinstalling npm packages

.NOTES
    Requires: Node.js 18+, npm
    Output: frontend/dist (static files — serve with any HTTP server)
#>

param(
    [switch]$Clean,
    [switch]$SkipInstall,
    [string]$OutDir = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$FrontendDir = Join-Path $ProjectRoot "frontend"
$DistDir     = if ($OutDir) { $OutDir } else { Join-Path $FrontendDir "dist" }

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

# ── Prerequisites ─────────────────────────────────────────────────────────────
Write-Host "`n$($Colors.Info)═══════════════════════════════════════════════════════════════$($Colors.Reset)"
Write-Host "$($Colors.Info)   QR Studio — Web Build$($Colors.Reset)"
Write-Host "$($Colors.Info)═══════════════════════════════════════════════════════════════$($Colors.Reset)`n"

foreach ($cmd in @("node","npm")) {
    if (Test-Command $cmd) {
        $ver = & $cmd --version 2>&1 | Select-Object -First 1
        Write-Status "$cmd`: $ver" -Type Success
    } else {
        Write-Status "$cmd is not installed or not in PATH" -Type Error
        exit 1
    }
}

# ── Clean ─────────────────────────────────────────────────────────────────────
if ($Clean) {
    Write-Host "`n$($Colors.Warning)Cleaning...$($Colors.Reset)"
    foreach ($d in @($DistDir, (Join-Path $FrontendDir "node_modules\.vite"))) {
        if (Test-Path $d) { Remove-Item $d -Recurse -Force; Write-Status "Removed: $d" -Type Warning }
    }
    Write-Status "Clean complete" -Type Success
}

# ── Install ───────────────────────────────────────────────────────────────────
Push-Location $FrontendDir
try {
    if (-not $SkipInstall) {
        Write-Host "`n$($Colors.Info)Installing npm packages...$($Colors.Reset)"
        npm install --silent
        Write-Status "npm packages ready" -Type Success
    }

    # ── Build ──────────────────────────────────────────────────────────────────
    Write-Host "`n$($Colors.Info)Building web application...$($Colors.Reset)"
    $start = Get-Date

    if ($OutDir) {
        # Pass custom outDir via env variable consumed by vite.config.ts, or fallback to default
        $env:BUILD_OUT_DIR = $OutDir
    }

    npm run build:web

    if ($LASTEXITCODE -ne 0) {
        Write-Status "npm build failed (exit $LASTEXITCODE)" -Type Error; exit 1
    }

    $dur = (Get-Date) - $start
    Write-Host "`n$($Colors.Success)═══════════════════════════════════════════════════════════════$($Colors.Reset)"
    Write-Host "$($Colors.Success)   WEB BUILD SUCCESSFUL!$($Colors.Reset)"
    Write-Host "$($Colors.Success)═══════════════════════════════════════════════════════════════$($Colors.Reset)"

    if (Test-Path $DistDir) {
        $files = (Get-ChildItem $DistDir -Recurse -File).Count
        $sizeKB = [math]::Round((Get-ChildItem $DistDir -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1KB, 1)
        Write-Status "Output : $DistDir" -Type Success
        Write-Status "Files  : $files files, ${sizeKB} KB total" -Type Info
    }
    Write-Status "Built in $($dur.Seconds)s" -Type Info
    Write-Host ""
} finally {
    Pop-Location
    if ($OutDir) { Remove-Item Env:\BUILD_OUT_DIR -ErrorAction SilentlyContinue }
}
