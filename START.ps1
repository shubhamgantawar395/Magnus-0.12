# ╔══════════════════════════════════════════════════════╗
# ║         Aaniry VMS — Start All Services              ║
# ║   Backend: http://localhost:3001                     ║
# ║   Frontend: http://localhost:3000                    ║
# ╚══════════════════════════════════════════════════════╝

$ErrorActionPreference = "Stop"
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
$root = "C:\Users\user\Desktop\aaniry vms"

Write-Host ""
Write-Host "  Aaniry VMS — Starting services..." -ForegroundColor Cyan
Write-Host ""

# ── Backend ──────────────────────────────────────────────────────────────────
Write-Host "  [1/2] Starting Backend (NestJS) on port 3001..." -ForegroundColor Yellow
$backend = Start-Process powershell -ArgumentList `
    "-NoExit", "-Command", `
    "Set-Location '$root\backend'; `$env:PATH='C:\Program Files\nodejs;'+`$env:PATH; Write-Host 'BACKEND — http://localhost:3001' -ForegroundColor Green; npm run start:dev" `
    -PassThru

Start-Sleep -Seconds 2

# ── Frontend ─────────────────────────────────────────────────────────────────
Write-Host "  [2/2] Starting Frontend (Next.js) on port 3000..." -ForegroundColor Yellow
$frontend = Start-Process powershell -ArgumentList `
    "-NoExit", "-Command", `
    "Set-Location '$root\frontend'; `$env:PATH='C:\Program Files\nodejs;'+`$env:PATH; Write-Host 'FRONTEND — http://localhost:3000' -ForegroundColor Green; npm run dev" `
    -PassThru

Write-Host ""
Write-Host "  Both services are starting in separate windows." -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend : http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend  : http://localhost:3001" -ForegroundColor Cyan
Write-Host "  API Docs : http://localhost:3001/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Close the two terminal windows to stop the servers." -ForegroundColor DarkGray
Write-Host ""
