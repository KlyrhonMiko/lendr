param(
    [string]$Service,
    [int]$Tail = 200,
    [switch]$Follow
)

$ErrorActionPreference = "Stop"
$CommonScript = Join-Path $PSScriptRoot "common.ps1"
. $CommonScript

$Context = Get-BundleContext -ScriptRoot $PSScriptRoot

Write-Host "PowerGold Logs" -ForegroundColor Cyan
Write-Host ""

if ($Service -and ($Service -eq "postgres" -or $Service -eq "adminer")) {
    $args = @("logs")
    if ($Follow) { $args += "-f" }
    $args += "--tail=$Tail"
    if ($Service) { $args += $Service }
    Invoke-DbCompose -Context $Context -ComposeArgs $args
} elseif ($Service) {
    $args = @("logs")
    if ($Follow) { $args += "-f" }
    $args += "--tail=$Tail"
    $args += $Service
    Invoke-AppCompose -Context $Context -ComposeArgs $args
} else {
    Write-Host "--- Database Stack ---" -ForegroundColor White
    $dbArgs = @("logs")
    if ($Follow) { $dbArgs += "-f" }
    $dbArgs += "--tail=50", "postgres", "adminer"
    Invoke-DbCompose -Context $Context -ComposeArgs $dbArgs
    Write-Host ""
    Write-Host "--- Application Stack ---" -ForegroundColor White
    $appArgs = @("logs")
    if ($Follow) { $appArgs += "-f" }
    $appArgs += "--tail=$Tail"
    Invoke-AppCompose -Context $Context -ComposeArgs $appArgs
}
