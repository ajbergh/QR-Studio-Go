<#
.SYNOPSIS
  Reproducible QR Studio Windows release build.

.DESCRIPTION
  Uses the committed npm lockfile and Go module graph. Each architecture is
  copied into an isolated output directory before the next Wails build starts,
  preventing -clean from deleting a previously built artifact.
#>

param(
  [ValidateSet('amd64', 'arm64', 'all')]
  [string]$Architecture = 'amd64',
  [switch]$Clean,
  [switch]$SkipDeps
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$FrontendDir = Join-Path $ProjectRoot 'frontend'
$WailsBinDir = Join-Path $ProjectRoot 'build/bin'
$OutputDir = Join-Path $ProjectRoot 'output/windows'

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' is not installed or is not in PATH."
  }
}

foreach ($command in @('go', 'node', 'npm', 'wails')) { Require-Command $command }

if ($Clean) {
  Remove-Item (Join-Path $FrontendDir 'dist') -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item $WailsBinDir -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item $OutputDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item $OutputDir -ItemType Directory -Force | Out-Null

if (-not $SkipDeps) {
  Push-Location $ProjectRoot
  try {
    go mod download
    go mod verify
  } finally { Pop-Location }

  Push-Location $FrontendDir
  try { npm ci } finally { Pop-Location }
}

Push-Location $FrontendDir
try {
  npm test
  npm run build:web
} finally { Pop-Location }

$targets = if ($Architecture -eq 'all') { @('amd64', 'arm64') } else { @($Architecture) }
foreach ($arch in $targets) {
  Push-Location $ProjectRoot
  try {
    wails build -clean -platform "windows/$arch"
    if ($LASTEXITCODE -ne 0) { throw "Wails build failed for windows/$arch." }
  } finally { Pop-Location }

  $source = Join-Path $WailsBinDir 'QRStudio.exe'
  if (-not (Test-Path $source)) { throw "Expected build artifact was not produced: $source" }
  $destination = Join-Path $OutputDir "QRStudio_windows_$arch.exe"
  Copy-Item $source $destination -Force
  $hash = (Get-FileHash $destination -Algorithm SHA256).Hash.ToLowerInvariant()
  "$hash  $(Split-Path $destination -Leaf)" | Set-Content "$destination.sha256" -Encoding ascii
  Write-Host "Built $destination"
}
