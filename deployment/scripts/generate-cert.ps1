param(
    [switch]$DetectOnly
)

$ErrorActionPreference = "Stop"
$CommonScript = Join-Path $PSScriptRoot "common.ps1"
. $CommonScript

$Context = Get-BundleContext -ScriptRoot $PSScriptRoot
$CertDir = $Context.CertDir
$CertFile = Join-Path $CertDir "localhost.pem"
$KeyFile = Join-Path $CertDir "localhost-key.pem"

$LanIp = Get-LanIPv4
if (-not $LanIp) {
    Write-Host "ERROR: Could not determine a usable LAN IPv4 address." -ForegroundColor Red
    Write-Host "The machine needs a static LAN IP assigned." -ForegroundColor Yellow
    exit 1
}

if ($DetectOnly) {
    return $LanIp
}

Write-Host "Detected LAN IP: $LanIp" -ForegroundColor Cyan

if ((Test-Path $CertFile) -and (Test-Path $KeyFile)) {
    Write-Host "Certificates already exist in $CertDir" -ForegroundColor Green
    Set-StoredLanIp -Context $Context -LanIp $LanIp
    exit 0
}

New-Item -ItemType Directory -Force -Path $CertDir | Out-Null

$San = "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:$LanIp"

$openssl = Get-Command openssl -ErrorAction SilentlyContinue
if ($openssl) {
    Write-Host "Generating certificates with host OpenSSL..." -ForegroundColor Cyan
    & openssl req -x509 -newkey rsa:2048 `
        -keyout $KeyFile -out $CertFile `
        -days 3650 -nodes `
        -subj "/CN=localhost" `
        -addext $San
} else {
    Write-Host "OpenSSL not found on host. Using Docker (alpine)..." -ForegroundColor Cyan
    $CertAbs = (Resolve-Path $CertDir).Path

    $SanEscaped = $San -replace '"', '\"'
    docker run --rm `
        -v "${CertAbs}:/certs" `
        alpine:3.21 `
        sh -lc "apk add --no-cache openssl >/dev/null 2>&1 && openssl req -x509 -newkey rsa:2048 -keyout /certs/localhost-key.pem -out /certs/localhost.pem -days 3650 -nodes -subj '/CN=localhost' -addext '$SanEscaped'"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Certificate generation failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Certificates generated:" -ForegroundColor Green
Write-Host "  $CertFile"
Write-Host "  $KeyFile"
Set-StoredLanIp -Context $Context -LanIp $LanIp
Write-Host "`nThese are self-signed. Browsers will show a warning on first visit." -ForegroundColor Yellow
Write-Host "Accept the warning to proceed; the connection is encrypted." -ForegroundColor Yellow
