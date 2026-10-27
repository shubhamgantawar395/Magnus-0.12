# Start Frontend Server
Write-Host "Starting Aaniry VMS Frontend Server..." -ForegroundColor Cyan
Write-Host ""

# Set Node.js in PATH for this session
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH

# Change to frontend directory
Set-Location "c:\Users\user\Desktop\aaniry vms\frontend"

Write-Host "Server will start on: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the development server
npm run dev
