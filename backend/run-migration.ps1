# Prisma Migration Script
Write-Host "Running Prisma migration to create database tables..." -ForegroundColor Cyan
Write-Host ""

# Set Node.js in PATH for this session
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH

# Change to backend directory
Set-Location "c:\Users\user\Desktop\aaniry vms\backend"

# Run Prisma migration
Write-Host "Executing: npx prisma migrate dev --name init" -ForegroundColor Yellow
Write-Host ""

try {
    & npx prisma migrate dev --name init
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Database tables created:" -ForegroundColor Green
        Write-Host "  - User, Customer, Vendor, VendorCapability"
        Write-Host "  - DeliveryChallan, ChallanItem, JobProcess"
        Write-Host "  - ProcessUpdate, QualityRejection, DispatchPlan"
        Write-Host "  - DispatchItem, Invoice, InvoiceItem, Payment"
        Write-Host "  - Document, Notification, AuditLog, SystemSetting"
    } else {
        Write-Host ""
        Write-Host "❌ Migration failed. Please check the error above." -ForegroundColor Red
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
