# Update Prisma Schema and Regenerate Client
Write-Host "Updating Prisma schema and regenerating client..." -ForegroundColor Cyan
Write-Host ""

# Set Node.js in PATH for this session
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH

# Change to backend directory
Set-Location "c:\Users\user\Desktop\aaniry vms\backend"

Write-Host "Running: npx prisma migrate dev --name add_user_role_enum" -ForegroundColor Yellow
npx prisma migrate dev --name add_user_role_enum

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Schema updated and client regenerated!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Migration failed." -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
