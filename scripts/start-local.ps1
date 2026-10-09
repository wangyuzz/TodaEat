param([string]$BinaryPath)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
if (-not $BinaryPath) {
    $BinaryPath = Join-Path $projectRoot 'dist/todayeat-windows-amd64/todayeat.exe'
}
if (-not (Test-Path -LiteralPath $BinaryPath -PathType Leaf)) {
    throw 'Build the Windows executable first with ./scripts/build.ps1, or supply -BinaryPath.'
}
$BinaryPath = (Resolve-Path -LiteralPath $BinaryPath).Path
$backendPath = Join-Path $projectRoot 'backend'
$configurationPath = Join-Path $backendPath '.env'
if (-not (Test-Path -LiteralPath $configurationPath -PathType Leaf)) {
    throw 'Copy .env.example to backend/.env and set your own passwords and JWT secret first.'
}
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'frontend/dist/index.html'))) {
    throw 'Frontend build is missing. Run ./scripts/build.ps1 first.'
}
New-Item -ItemType Directory -Force -Path (Join-Path $backendPath 'static') | Out-Null
Copy-Item -Path (Join-Path $projectRoot 'frontend/dist/*') -Destination (Join-Path $backendPath 'static') -Recurse -Force
Push-Location $backendPath
try {
    & $BinaryPath
    if ($LASTEXITCODE -ne 0) { throw "TodayEat exited with code $LASTEXITCODE" }
} finally { Pop-Location }
