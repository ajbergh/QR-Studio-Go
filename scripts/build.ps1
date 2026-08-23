<#
.SYNOPSIS
  Compatibility entry point for QR Studio Windows builds.

.DESCRIPTION
  The original build script installed mutable dependencies and duplicated the
  release pipeline. This wrapper delegates to the reproducible Windows script.
#>
param(
  [switch]$Clean,
  [switch]$SkipIconGeneration,
  [switch]$DevMode
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path $PSScriptRoot -Parent

if ($DevMode) {
  Push-Location $ProjectRoot
  try { wails dev } finally { Pop-Location }
  exit $LASTEXITCODE
}

if ($SkipIconGeneration) {
  Write-Warning '-SkipIconGeneration is retained for compatibility; icon generation is managed by Wails build assets.'
}

$arguments = @('-Architecture', 'amd64')
if ($Clean) { $arguments += '-Clean' }
& (Join-Path $PSScriptRoot 'build-wails-windows.ps1') @arguments
exit $LASTEXITCODE
