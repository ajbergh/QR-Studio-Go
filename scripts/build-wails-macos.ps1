<# Reproducible QR Studio macOS release build. Run on macOS with Xcode tools. #>
param(
  [ValidateSet('amd64', 'arm64', 'universal', 'all')]
  [string]$Architecture = 'universal',
  [switch]$Clean,
  [switch]$SkipDeps
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$FrontendDir = Join-Path $ProjectRoot 'frontend'
$WailsBinDir = Join-Path $ProjectRoot 'build/bin'
$OutputDir = Join-Path $ProjectRoot 'output/macos'

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "Required command '$Name' is unavailable." }
}
foreach ($command in @('go', 'node', 'npm', 'wails', 'ditto', 'lipo', 'unzip')) { Require-Command $command }
if (-not $IsMacOS) { throw 'macOS release builds must run on macOS with Xcode Command Line Tools.' }
& xcode-select -p | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Xcode Command Line Tools are required.' }

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
    if ($LASTEXITCODE -ne 0) { throw 'Go module download failed.' }
    go mod verify
    if ($LASTEXITCODE -ne 0) { throw 'Go module verification failed.' }
  } finally { Pop-Location }
  Push-Location $FrontendDir
  try {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
  } finally { Pop-Location }
}
Push-Location $FrontendDir
try {
  npm test
  if ($LASTEXITCODE -ne 0) { throw 'Frontend tests failed.' }
  npm run build:web
  if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
} finally { Pop-Location }

$targets = switch ($Architecture) {
  'all' { @('amd64', 'arm64', 'universal') }
  default { @($Architecture) }
}
foreach ($arch in $targets) {
  Push-Location $ProjectRoot
  try {
    wails build -clean -platform "darwin/$arch"
    if ($LASTEXITCODE -ne 0) { throw "Wails build failed for darwin/$arch." }
  } finally { Pop-Location }

  $bundle = Join-Path $WailsBinDir 'QRStudio.app'
  if (-not (Test-Path $bundle)) { throw "Expected app bundle was not produced: $bundle" }
  $binary = Join-Path $bundle 'Contents/MacOS/QRStudio'
  if (-not (Test-Path $binary)) { throw "App executable is missing: $binary" }
  $architectures = (& lipo -archs $binary) -split '\s+'
  if ($LASTEXITCODE -ne 0) { throw "Could not inspect app architectures: $binary" }
  $required = if ($arch -eq 'universal') { @('x86_64', 'arm64') } elseif ($arch -eq 'amd64') { @('x86_64') } else { @('arm64') }
  foreach ($requiredArch in $required) {
    if ($requiredArch -notin $architectures) { throw "App is missing architecture $requiredArch." }
  }
  $archive = Join-Path $OutputDir "QRStudio_macos_$arch.zip"
  Remove-Item $archive -Force -ErrorAction SilentlyContinue
  & ditto -c -k --sequesterRsrc --keepParent $bundle $archive
  if ($LASTEXITCODE -ne 0) { throw "Could not package darwin/$arch." }
  & unzip -tq $archive | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "macOS archive is invalid: $archive" }
  $hash = (Get-FileHash $archive -Algorithm SHA256).Hash.ToLowerInvariant()
  "$hash  $(Split-Path $archive -Leaf)" | Set-Content "$archive.sha256" -Encoding ascii
  Write-Host "Built $archive"
}
