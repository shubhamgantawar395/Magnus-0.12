# Install Missing Dependencies with Legacy Peer Deps
Write-Host "Installing missing NestJS packages..." -ForegroundColor Cyan
Write-Host ""

# Set Node.js in PATH for this session
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH

# Change to backend directory
Set-Location "c:\Users\user\Desktop\aaniry vms\backend"

Write-Host "Installing @nestjs/swagger and @nestjs/mapped-types with --legacy-peer-deps..." -ForegroundColor Yellow
npm install @nestjs/swagger @nestjs/mapped-types --save --legacy-peer-deps

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Packages installed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Installation failed." -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
