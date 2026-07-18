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
foreach ($command in @('go', 'node', 'npm', 'wails')) { Require-Command $command }
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
  try { go mod download; go mod verify } finally { Pop-Location }
  Push-Location $FrontendDir
  try { npm ci } finally { Pop-Location }
}
Push-Location $FrontendDir
try { npm test; npm run build:web } finally { Pop-Location }

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
  $staged = Join-Path $OutputDir "QRStudio_macos_$arch.app"
  Remove-Item $staged -Recurse -Force -ErrorAction SilentlyContinue
  Copy-Item $bundle $staged -Recurse -Force
  $archive = Join-Path $OutputDir "QRStudio_macos_$arch.zip"
  Remove-Item $archive -Force -ErrorAction SilentlyContinue
  Compress-Archive -Path $staged -DestinationPath $archive -CompressionLevel Optimal
  $hash = (Get-FileHash $archive -Algorithm SHA256).Hash.ToLowerInvariant()
  "$hash  $(Split-Path $archive -Leaf)" | Set-Content "$archive.sha256" -Encoding ascii
  Write-Host "Built $archive"
}
