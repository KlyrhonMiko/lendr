param(
    [switch]$Verbose,
    [string]$TargetHost = "localhost"
)

$ErrorActionPreference = "Stop"
$CommonScript = Join-Path $PSScriptRoot "common.ps1"
. $CommonScript

function Get-HttpsStatusCode {
    param(
        [string]$Url
    )

    $statusCode = & curl.exe --insecure --silent --show-error --output NUL --write-out "%{http_code}" --connect-timeout 10 --max-time 10 $Url
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        throw "curl exited with code $exitCode"
    }

    return "$statusCode".Trim()
}

Write-Host "PowerGold Health Verification" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Backend health check (via Caddy)..." -ForegroundColor Gray
try {
    $backendStatus = Get-HttpsStatusCode -Url "https://$TargetHost/api/health/live"
    if ($backendStatus -notmatch '^2\d\d$') {
        throw "HTTP $backendStatus"
    }
    Write-Host "  Backend: OK (HTTP $backendStatus)" -ForegroundColor Green
} catch {
    Write-Host "  Backend: FAILED - $_" -ForegroundColor Red
    exit 1
}

Write-Host "[2/2] Frontend via Caddy (HTTPS)..." -ForegroundColor Gray
try {
    $frontendStatus = Get-HttpsStatusCode -Url "https://$TargetHost"
    if ($frontendStatus -notmatch '^2\d\d$|^3\d\d$') {
        throw "HTTP $frontendStatus"
    }
    Write-Host "  Frontend: OK (HTTP $frontendStatus)" -ForegroundColor Green
} catch {
    Write-Host "  Frontend: FAILED - $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "All checks passed." -ForegroundColor Green
