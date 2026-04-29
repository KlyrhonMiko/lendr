param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$CommonScript = Join-Path $PSScriptRoot "common.ps1"
. $CommonScript

$Context = Get-BundleContext -ScriptRoot $PSScriptRoot
$EnvDir = Join-Path $Context.BundleRoot "env"
$EnvLocal = Join-Path $EnvDir ".env.local"
$EnvDeploy = Join-Path $EnvDir ".env.deploy"
$EnvLocalTmpl = Join-Path $EnvDir ".env.local.template"
$EnvDeployTmpl = Join-Path $EnvDir ".env.deploy.template"

if ((Test-Path $EnvLocal) -and (Test-Path $EnvDeploy) -and (-not $Force)) {
    Write-Host "Environment files already exist. Use -Force to regenerate." -ForegroundColor Yellow
    Write-Host "  .env.local  : $EnvLocal"
    Write-Host "  .env.deploy : $EnvDeploy"
    exit 0
}

if (-not (Test-Path $EnvLocalTmpl)) {
    Write-Host "ERROR: Template not found: $EnvLocalTmpl" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $EnvDeployTmpl)) {
    Write-Host "ERROR: Template not found: $EnvDeployTmpl" -ForegroundColor Red
    exit 1
}

$PwChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"

function Fill-RandomBytes([byte[]]$Bytes) {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($Bytes)
    } finally {
        if ($null -ne $rng) {
            $rng.Dispose()
        }
    }
}

function New-RandomString($Length) {
    $bytes = [byte[]]::new($Length)
    Fill-RandomBytes $bytes
    $chars = [char[]]::new($Length)
    for ($i = 0; $i -lt $Length; $i++) {
        $chars[$i] = $PwChars[$bytes[$i] % $PwChars.Length]
    }
    return -join $chars
}

function New-RandomHex($Length) {
    $bytes = [byte[]]::new($Length)
    Fill-RandomBytes $bytes
    return -join ($bytes | ForEach-Object { $_.ToString("x2") })
}

Write-Host "Generating secrets..." -ForegroundColor Cyan

$SecretKey = New-RandomHex 32
$PgPassword = New-RandomString 24
$AdminPassword = New-RandomString 16

Write-Host "  SECRET_KEY          : $($SecretKey.Substring(0,12))..." -ForegroundColor Green
Write-Host "  POSTGRES_PASSWORD   : $($PgPassword.Substring(0,8))..." -ForegroundColor Green
Write-Host "  INITIAL_ADMIN_PWD   : $($AdminPassword.Substring(0,8))..." -ForegroundColor Green

$LocalContent = Get-Content $EnvLocalTmpl -Raw
$LocalContent = $LocalContent.Replace("__PG_PASSWORD__", $PgPassword)

$DeployContent = Get-Content $EnvDeployTmpl -Raw
$DeployContent = $DeployContent.Replace("__PG_PASSWORD__", $PgPassword)
$DeployContent = $DeployContent.Replace("__SECRET_KEY__", $SecretKey)
$DeployContent = $DeployContent.Replace("__ADMIN_PASSWORD__", $AdminPassword)

$LanIp = Get-LanIPv4
if ($LanIp) {
    $CorsOrigins = "https://localhost,https://127.0.0.1,https://$LanIp"
    Write-Host "  CORS_ALLOW_ORIGINS  : $CorsOrigins" -ForegroundColor Green
} else {
    $CorsOrigins = "https://localhost,https://127.0.0.1"
    Write-Host "  CORS_ALLOW_ORIGINS  : $CorsOrigins (no LAN IP detected)" -ForegroundColor Yellow
}
$DeployContent = $DeployContent.Replace("__CORS_ORIGINS__", $CorsOrigins)

$Utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($EnvLocal, $LocalContent, $Utf8NoBom)
[System.IO.File]::WriteAllText($EnvDeploy, $DeployContent, $Utf8NoBom)

Write-Host "`nSecrets written:" -ForegroundColor Green
Write-Host "  $EnvLocal"
Write-Host "  $EnvDeploy"
Write-Host "`nIMPORTANT: Save the initial admin password before closing this window:" -ForegroundColor Yellow
Write-Host "  Username: admin" -ForegroundColor White
Write-Host "  Password: $AdminPassword" -ForegroundColor White
