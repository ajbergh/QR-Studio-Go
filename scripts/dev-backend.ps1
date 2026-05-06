<#
.SYNOPSIS
    QR Studio — Dev Backend Launcher (for use with Vite)

.DESCRIPTION
    Starts the Wails Go backend in development mode while pointing it at an
    external Vite dev server. Use this when you want to run the Vite HMR
    server independently and still have full access to Wails backend bindings
    (SQLite, native dialogs, file export, etc.).

    Typical workflow:
        Terminal 1 — start Vite:    cd frontend; npm run dev
        Terminal 2 — start backend: .\scripts\dev-backend.ps1

    The Wails window will load the Vite dev server URL instead of building
    the frontend itself. Hot-module replacement works normally via Vite.

.PARAMETER ViteUrl
    URL of the running Vite dev server. Default: http://localhost:5173

.PARAMETER WailsArgs
    Additional arguments forwarded verbatim to `wails dev`. Example:
    -WailsArgs "-tags dev -v"

.EXAMPLE
    .\dev-backend.ps1
    Start the backend using the default Vite URL (http://localhost:5173)

.EXAMPLE
    .\dev-backend.ps1 -ViteUrl http://localhost:3001
    Use a non-default Vite port

.NOTES
    Requires: Go 1.21+, Wails CLI v2+
    The Vite dev server must already be running before the Wails window opens.
#>

param(
    [string]$ViteUrl   = "http://localhost:3000",
    [string]$WailsArgs = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent

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

# ── Header ─────────────────────────────────────────────────────────────────────
Write-Host "`n$($Colors.Info)═══════════════════════════════════════════════════════════════$($Colors.Reset)"
Write-Host "$($Colors.Info)   QR Studio — Dev Backend (Wails + external Vite)$($Colors.Reset)"
Write-Host "$($Colors.Info)═══════════════════════════════════════════════════════════════$($Colors.Reset)`n"

# ── Prerequisites ──────────────────────────────────────────────────────────────
foreach ($cmd in @("go","wails")) {
    if (-not (Test-Command $cmd)) {
        Write-Status "$cmd is not installed or not in PATH" -Type Error; exit 1
    }
}
Write-Status "go   : $(go version 2>&1 | Select-Object -First 1)" -Type Success
Write-Status "wails: $(wails version 2>&1 | Select-Object -First 1)" -Type Success

# ── Check if Vite is reachable ─────────────────────────────────────────────────
Write-Host ""
Write-Status "Checking Vite dev server at $ViteUrl ..." -Type Info
try {
    $resp = Invoke-WebRequest -Uri $ViteUrl -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Status "Vite server is responding (HTTP $($resp.StatusCode))" -Type Success
} catch {
    Write-Status "Vite server not reachable at $ViteUrl" -Type Warning
    Write-Status "Make sure 'npm run dev' is running in the frontend directory first." -Type Warning
    Write-Host ""
    $confirm = Read-Host "Continue anyway? [y/N]"
    if ($confirm -notmatch '^[Yy]') { exit 0 }
}

# ── Launch Wails dev with external frontend URL ────────────────────────────────
Write-Host ""
Write-Status "Starting Wails backend..." -Type Info
Write-Status "Frontend URL : $ViteUrl" -Type Info
Write-Status "Press Ctrl+C to stop." -Type Info
Write-Host ""

Push-Location $ProjectRoot
try {
    $cmdParts = "wails dev -frontenddevserverurl `"$ViteUrl`""
    if ($WailsArgs) { $cmdParts += " $WailsArgs" }
    Write-Host "$($Colors.Warning)> $cmdParts$($Colors.Reset)`n"
    Invoke-Expression $cmdParts
} finally {
    Pop-Location
}
