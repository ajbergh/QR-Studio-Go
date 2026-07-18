<# Reproducible QR Studio static web build. #>
param(
  [switch]$Clean,
  [switch]$SkipInstall,
  [string]$OutDir = ''
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$FrontendDir = Join-Path $ProjectRoot 'frontend'
$DistDir = if ($OutDir) { $OutDir } else { Join-Path $FrontendDir 'dist' }

foreach ($command in @('node', 'npm')) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "Required command '$command' is unavailable." }
}
if ($Clean) {
  Remove-Item $DistDir -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item (Join-Path $FrontendDir 'node_modules/.vite') -Recurse -Force -ErrorAction SilentlyContinue
}

Push-Location $FrontendDir
try {
  if (-not $SkipInstall) { npm ci }
  npm test
  if ($OutDir) { npm run build:web -- --outDir $OutDir } else { npm run build:web }
  if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
} finally { Pop-Location }

if (-not (Test-Path $DistDir)) { throw "Expected output directory was not produced: $DistDir" }
$files = Get-ChildItem $DistDir -Recurse -File
$hashLines = foreach ($file in $files) {
  $relative = [IO.Path]::GetRelativePath($DistDir, $file.FullName).Replace('\\', '/')
  $hash = (Get-FileHash $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  "$hash  $relative"
}
$hashLines | Set-Content (Join-Path $DistDir 'SHA256SUMS') -Encoding ascii
Write-Host "Built $($files.Count) files in $DistDir"
