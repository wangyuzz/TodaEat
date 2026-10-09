$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$gitPath = (Get-Command git -ErrorAction Stop).Source
$outputDir = Join-Path $projectRoot 'dist'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
$archive = Join-Path $outputDir 'todayeat-recovered-source.zip'
& $gitPath -C $projectRoot archive --format=zip --prefix=todayeat/ "--output=$archive" HEAD
if ($LASTEXITCODE -ne 0) { throw 'Source packaging failed. Commit the reviewed source files first.' }
Write-Host "Source archive ready: $archive (committed files only)"
