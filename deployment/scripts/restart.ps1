param(
    [int]$StartupTimeout = 300
)

$ErrorActionPreference = "Stop"
$CommonScript = Join-Path $PSScriptRoot "common.ps1"
. $CommonScript

$Context = Get-BundleContext -ScriptRoot $PSScriptRoot
$ScriptDir = "$PSScriptRoot"

Write-Host "Restarting PowerGold application stack..." -ForegroundColor Cyan

& "$ScriptDir\stop.ps1"
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

& "$ScriptDir\start.ps1" -StartupTimeout $StartupTimeout
exit $LASTEXITCODE
