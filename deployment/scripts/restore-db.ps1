param(
    [Parameter(Mandatory=$true)]
    [string]$InputFile,

    [switch]$Force
)

$ErrorActionPreference = "Stop"
$CommonScript = Join-Path $PSScriptRoot "common.ps1"
. $CommonScript

$Context = Get-BundleContext -ScriptRoot $PSScriptRoot

Set-ComposeEnvironment -Context $Context

if (-not (Test-Path $InputFile)) {
    Write-Host "ERROR: Backup file not found: $InputFile" -ForegroundColor Red
    exit 1
}

if (-not $Force) {
    Write-Host "WARNING: This will OVERWRITE the current database." -ForegroundColor Yellow
    Write-Host "Backup file: $InputFile" -ForegroundColor White
    $confirm = Read-Host "Type 'YES' to proceed"
    if ($confirm -ne "YES") {
        Write-Host "Aborted." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "Restoring database from $InputFile..." -ForegroundColor Cyan

$runningServices = & docker compose --env-file $Context.EnvLocal -f $Context.DbComposeFile ps --status running --services postgres 2>&1
if ($LASTEXITCODE -ne 0 -or -not ($runningServices | Select-String "^postgres$")) {
    Write-Host "ERROR: Postgres container is not running. Start it first with start.ps1." -ForegroundColor Red
    exit 1
}

$pgUser = Read-EnvValue -Path $Context.EnvLocal -Key "POSTGRES_USER" -Default "postgres"
$pgDb = Read-EnvValue -Path $Context.EnvLocal -Key "POSTGRES_DB" -Default "powergold"

$absPath = (Resolve-Path $InputFile).Path

Get-Content $absPath | & docker compose --env-file $Context.EnvLocal -f $Context.DbComposeFile exec -T postgres psql -U $pgUser -d $pgDb

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Database restore failed." -ForegroundColor Red
    exit 1
}

Write-Host "Database restored successfully." -ForegroundColor Green
Write-Host "Restart the application stack for changes to take effect: .\scripts\restart.ps1" -ForegroundColor Cyan
