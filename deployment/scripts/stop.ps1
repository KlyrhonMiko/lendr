param(
    [switch]$IncludeDb
)

$ErrorActionPreference = "Stop"
$CommonScript = Join-Path $PSScriptRoot "common.ps1"
. $CommonScript

$Context = Get-BundleContext -ScriptRoot $PSScriptRoot

Write-Host "Stopping PowerGold..." -ForegroundColor Cyan

Write-Host "  Stopping application stack..." -ForegroundColor Gray
Invoke-AppCompose -Context $Context -ComposeArgs @("down", "--remove-orphans")
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Application stack stop returned non-zero." -ForegroundColor Yellow
} else {
    Write-Host "  Application stack stopped." -ForegroundColor Green
}

if ($IncludeDb) {
    Write-Host "  Stopping database stack..." -ForegroundColor Gray
    Invoke-DbCompose -Context $Context -ComposeArgs @("down", "--remove-orphans")
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Database stack stop returned non-zero." -ForegroundColor Yellow
    } else {
        Write-Host "  Database stack stopped." -ForegroundColor Green
    }
} else {
    Write-Host "  Database stack left running (use -IncludeDb to stop it)." -ForegroundColor Gray
}

Write-Host "Done." -ForegroundColor Green
