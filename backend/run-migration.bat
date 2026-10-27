@echo off
cd /d "c:\Users\user\Desktop\aaniry vms\backend"

echo Running Prisma migration to create database tables...
echo.

REM Add Node.js to PATH for this session
set "PATH=%PATH%;C:\Program Files (x86)\nodejs\"

REM Run Prisma migration
call npm run prisma:migrate

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Migration completed successfully!
    echo.
    echo Database tables created:
    echo - User, Customer, Vendor, VendorCapability
    echo - DeliveryChallan, ChallanItem, JobProcess
    echo - ProcessUpdate, QualityRejection, DispatchPlan
    echo - DispatchItem, Invoice, InvoiceItem, Payment
    echo - Document, Notification, AuditLog, SystemSetting
) else (
    echo.
    echo ❌ Migration failed. Please check the error above.
)

echo.
pause
