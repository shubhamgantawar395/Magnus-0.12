# Clean Build and Start Backend Server
Write-Host "Cleaning build and starting Aaniry VMS Backend Server..." -ForegroundColor Cyan
Write-Host ""

# Set Node.js in PATH for this session
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH

# Change to backend directory
Set-Location "c:\Users\user\Desktop\aaniry vms\backend"

Write-Host "Removing old build..." -ForegroundColor Yellow
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Starting development server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Server will start on: http://localhost:3001" -ForegroundColor Green
Write-Host "API Documentation: http://localhost:3001/api" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the development server
npm run start:dev
