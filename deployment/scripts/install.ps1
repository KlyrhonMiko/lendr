param(
    [switch]$SkipImageLoad
)

$ErrorActionPreference = "Stop"
$CommonScript = Join-Path $PSScriptRoot "common.ps1"
. $CommonScript

$Context = Get-BundleContext -ScriptRoot $PSScriptRoot
$BundleRoot = $Context.BundleRoot
$ScriptDir = "$PSScriptRoot"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PowerGold Install" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/7] Verifying Docker..." -ForegroundColor Cyan
try {
    $null = docker version 2>&1
} catch {
    Write-Host "ERROR: Docker is not installed or not running." -ForegroundColor Red
    Write-Host "Install Docker Desktop from https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

$composeCheck = docker compose version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker Compose plugin is not available." -ForegroundColor Red
    exit 1
}
Write-Host "  Docker is ready." -ForegroundColor Green

Write-Host ""
Write-Host "[2/7] Creating directories..." -ForegroundColor Cyan
$dirs = @(
    (Join-Path $BundleRoot "env"),
    (Join-Path $BundleRoot "certificates"),
    (Join-Path $BundleRoot "backups"),
    (Join-Path $BundleRoot "logs")
)
foreach ($d in $dirs) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}
Write-Host "  Directories ready." -ForegroundColor Green

Write-Host ""
Write-Host "[3/7] Generating secrets..." -ForegroundColor Cyan
& "$ScriptDir\generate-secrets.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Secret generation failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[4/7] Generating certificates..." -ForegroundColor Cyan
& "$ScriptDir\generate-cert.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Certificate generation failed. You can run generate-cert.ps1 later." -ForegroundColor Yellow
}

Write-Host ""
if (-not $SkipImageLoad) {
    Write-Host "[5/7] Loading Docker images..." -ForegroundColor Cyan
    $tarFiles = Get-ChildItem -Path $Context.ImagesDir -Filter "*.tar" -ErrorAction SilentlyContinue
    if (-not $tarFiles) {
        Write-Host "ERROR: No image archives found in $($Context.ImagesDir)" -ForegroundColor Red
        Write-Host "Place the bundle .tar files in images/ and re-run install.ps1." -ForegroundColor Yellow
        exit 1
    } else {
        $archiveVersion = Get-ArchiveBundleVersion -ImagesDir $Context.ImagesDir
        if ($Context.Version -and $archiveVersion -and $Context.Version -ne $archiveVersion) {
            Write-Host "WARNING: VERSION file ($($Context.Version)) does not match image archives ($archiveVersion)." -ForegroundColor Yellow
            Write-Host "  The bundle may have been partially replaced. Using image archive version." -ForegroundColor Yellow
        }
        foreach ($tar in $tarFiles) {
            Write-Host "  Loading: $($tar.Name)..." -ForegroundColor Gray
            docker load -i $tar.FullName
            if ($LASTEXITCODE -ne 0) {
                Write-Host "ERROR: Failed to load $($tar.Name)" -ForegroundColor Red
                exit 1
            }
        }
        if ($archiveVersion) {
            Set-BundleVersion -Context $Context -Version $archiveVersion
            Write-Host "  Bundle version set to $archiveVersion" -ForegroundColor Green
        }
        Write-Host "  Images loaded." -ForegroundColor Green
    }
} else {
    Write-Host "[5/7] Skipping image load (--SkipImageLoad)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[6/7] Validating compose configuration..." -ForegroundColor Cyan

Set-ComposeEnvironment -Context $Context

$dbValidate = & docker compose --env-file $Context.EnvLocal -f $Context.DbComposeFile config 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Database compose validation failed:" -ForegroundColor Red
    Write-Host $dbValidate
    exit 1
}

$appValidate = & docker compose --env-file $Context.EnvDeploy -f $Context.AppComposeFile config 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Application compose validation failed:" -ForegroundColor Red
    Write-Host $appValidate
    exit 1
}

$missingImages = Test-BundleImagesPresent -Context $Context
if ($missingImages.Count -gt 0) {
    Write-Host "ERROR: Required Docker images are missing for bundle version $($Context.Version):" -ForegroundColor Red
    $missingImages | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    Write-Host "Run install.ps1 without --SkipImageLoad, or place the correct .tar files in images/." -ForegroundColor Yellow
    exit 1
}
Write-Host "  Compose configuration is valid." -ForegroundColor Green

Write-Host ""
Write-Host "[7/7] Checking for existing volumes..." -ForegroundColor Cyan
$existingDb = docker volume ls --format "{{.Name}}" | Select-String "powergold_pgdata"
if ($existingDb) {
    Write-Host "  Existing database volume found: powergold_pgdata" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Install complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next step: run powergold.bat and choose Start." -ForegroundColor Cyan
Write-Host ""
Write-Host "  .\powergold.bat" -ForegroundColor White
