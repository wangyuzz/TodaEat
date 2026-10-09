param(
    [ValidateSet('windows', 'linux')][string]$TargetOS = 'windows',
    [ValidateSet('amd64', 'arm64')][string]$TargetArch = 'amd64',
    [switch]$SkipInstall
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$goPath = Join-Path $projectRoot '.tools/go/bin/go.exe'
if (-not (Test-Path -LiteralPath $goPath)) { $goPath = (Get-Command go -ErrorAction Stop).Source }
$npmPath = (Get-Command npm.cmd -ErrorAction Stop).Source
$packageName = "todayeat-$TargetOS-$TargetArch"
$outputDir = Join-Path $projectRoot "dist/$packageName"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
Push-Location (Join-Path $projectRoot 'frontend')
try {
    if (-not $SkipInstall) {
        & $npmPath ci
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
    }
    & $npmPath run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }
} finally { Pop-Location }
$previousOS, $previousArch, $previousCGO = $env:GOOS, $env:GOARCH, $env:CGO_ENABLED
Push-Location (Join-Path $projectRoot 'backend')
try {
    $env:GOOS = $TargetOS
    $env:GOARCH = $TargetArch
    $env:CGO_ENABLED = '0'
    $binaryName = if ($TargetOS -eq 'windows') { 'todayeat.exe' } else { 'todayeat' }
    & $goPath build -trimpath -ldflags '-s -w' -o (Join-Path $outputDir $binaryName) ./cmd/server
    if ($LASTEXITCODE -ne 0) { throw 'Backend build failed' }
} finally {
    $env:GOOS = $previousOS
    $env:GOARCH = $previousArch
    $env:CGO_ENABLED = $previousCGO
    Pop-Location
}
New-Item -ItemType Directory -Force -Path (Join-Path $outputDir 'static') | Out-Null
Copy-Item -Path (Join-Path $projectRoot 'frontend/dist/*') -Destination (Join-Path $outputDir 'static') -Recurse -Force
Copy-Item -LiteralPath (Join-Path $projectRoot '.env.example') -Destination (Join-Path $outputDir '.env.example') -Force
Copy-Item -LiteralPath (Join-Path $projectRoot 'DEPLOY.md') -Destination (Join-Path $outputDir 'DEPLOY.md') -Force
Copy-Item -LiteralPath (Join-Path $projectRoot 'LICENSE') -Destination (Join-Path $outputDir 'LICENSE') -Force
Copy-Item -LiteralPath (Join-Path $projectRoot 'THIRD_PARTY_NOTICES.md') -Destination (Join-Path $outputDir 'THIRD_PARTY_NOTICES.md') -Force
if ($TargetOS -eq 'linux') {
    $archive = Join-Path $projectRoot "dist/$packageName.tar.gz"
    & tar.exe -czf $archive -C (Join-Path $projectRoot 'dist') $packageName
    if ($LASTEXITCODE -ne 0) { throw 'Archive creation failed' }
} else {
    $archive = Join-Path $projectRoot "dist/$packageName.zip"
    Compress-Archive -Path (Join-Path $outputDir '*') -DestinationPath $archive -Force
}
Write-Host "Build ready: $archive"
