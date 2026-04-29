param(
    [string]$OutputFile
)

$ErrorActionPreference = "Stop"
$CommonScript = Join-Path $PSScriptRoot "common.ps1"
. $CommonScript

$Context = Get-BundleContext -ScriptRoot $PSScriptRoot
$BackupsDir = $Context.BackupsDir

Set-ComposeEnvironment -Context $Context

New-Item -ItemType Directory -Force -Path $BackupsDir | Out-Null

if (-not $OutputFile) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $OutputFile = Join-Path $BackupsDir "powergold_backup_${timestamp}.sql"
}

Write-Host "Backing up database..." -ForegroundColor Cyan

$runningServices = & docker compose --env-file $Context.EnvLocal -f $Context.DbComposeFile ps --status running --services postgres 2>&1
if ($LASTEXITCODE -ne 0 -or -not ($runningServices | Select-String "^postgres$")) {
    Write-Host "ERROR: Postgres container is not running. Start it first with start.ps1." -ForegroundColor Red
    exit 1
}

$pgUser = Read-EnvValue -Path $Context.EnvLocal -Key "POSTGRES_USER" -Default "postgres"
$pgDb = Read-EnvValue -Path $Context.EnvLocal -Key "POSTGRES_DB" -Default "powergold"

& docker compose --env-file $Context.EnvLocal -f $Context.DbComposeFile exec -T postgres pg_dump -U $pgUser -d $pgDb --clean --if-exists --no-owner > $OutputFile
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: pg_dump failed." -ForegroundColor Red
    exit 1
}

$fileSize = (Get-Item $OutputFile).Length
Write-Host "Backup created:" -ForegroundColor Green
Write-Host "  $OutputFile ($fileSize bytes)" -ForegroundColor White
