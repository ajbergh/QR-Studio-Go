<# Reproducible QR Studio Linux release build. Run on Linux with GTK/WebKit headers. #>
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
$OutputDir = Join-Path $ProjectRoot 'output/linux'

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "Required command '$Name' is unavailable." }
}
foreach ($command in @('go', 'node', 'npm', 'wails', 'gcc', 'pkg-config', 'tar')) { Require-Command $command }
if (-not $IsLinux) { throw 'Linux release builds must run on Linux with GTK and WebKit development headers.' }
& pkg-config --exists gtk+-3.0 gio-unix-2.0 webkit2gtk-4.1
if ($LASTEXITCODE -ne 0) { throw 'GTK 3 and WebKit2GTK 4.1 development packages are required.' }

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

$targets = if ($Architecture -eq 'all') { @('amd64', 'arm64') } else { @($Architecture) }
foreach ($arch in $targets) {
  Push-Location $ProjectRoot
  try {
    wails build -clean -tags webkit2_41 -platform "linux/$arch"
    if ($LASTEXITCODE -ne 0) { throw "Wails build failed for linux/$arch." }
  } finally { Pop-Location }

  $source = Join-Path $WailsBinDir 'QRStudio'
  if (-not (Test-Path $source)) { throw "Expected build artifact was not produced: $source" }
  $archive = Join-Path $OutputDir "QRStudio_linux_$arch.tar.gz"
  & tar -czf $archive -C $WailsBinDir QRStudio
  if ($LASTEXITCODE -ne 0) { throw "Could not package linux/$arch." }
  & tar -tzf $archive | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Linux archive is invalid: $archive" }
  $hash = (Get-FileHash $archive -Algorithm SHA256).Hash.ToLowerInvariant()
  "$hash  $(Split-Path $archive -Leaf)" | Set-Content "$archive.sha256" -Encoding ascii
  Write-Host "Built $archive"
}
