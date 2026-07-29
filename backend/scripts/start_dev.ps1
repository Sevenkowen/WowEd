# Arranca túnel SSH, backend y frontend en ventanas separadas (más estable en Windows).
# Uso: $env:DEPLOY_SSH_PASS='...'; .\scripts\start_dev.ps1
$ErrorActionPreference = 'Stop'
$Backend = Split-Path $PSScriptRoot -Parent
$Frontend = Join-Path (Split-Path $Backend -Parent) 'frontend'
if (-not $env:DEPLOY_SSH_PASS) {
  Write-Error 'Definí DEPLOY_SSH_PASS antes de ejecutar este script.'
  exit 1
}
Get-NetTCPConnection -LocalPort 8000,8002,5432,5173 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command',
  "`$env:DEPLOY_SSH_PASS='$($env:DEPLOY_SSH_PASS)'; Set-Location '$Backend'; .\.venv\Scripts\python.exe scripts/ssh_tunnel_db.py"
)
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command',
  "Set-Location '$Backend'; .\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000"
)
Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command',
  "Set-Location '$Frontend'; npm run dev -- --host 127.0.0.1"
)
Write-Host 'Túnel (5432), backend (8000) y frontend (5173) iniciados en ventanas nuevas.'
