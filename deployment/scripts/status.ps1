$ErrorActionPreference = "Stop"
$CommonScript = Join-Path $PSScriptRoot "common.ps1"
. $CommonScript

$Context = Get-BundleContext -ScriptRoot $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PowerGold Status" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "--- Database Stack ---" -ForegroundColor White
Invoke-DbCompose -Context $Context -ComposeArgs @("ps")

Write-Host ""
Write-Host "--- Application Stack ---" -ForegroundColor White
Invoke-AppCompose -Context $Context -ComposeArgs @("ps")

Write-Host ""
Write-Host "--- Named Volumes ---" -ForegroundColor White
docker volume ls --filter "name=powergold" --format "table {{.Name}}`t{{.Driver}}" 2>&1
