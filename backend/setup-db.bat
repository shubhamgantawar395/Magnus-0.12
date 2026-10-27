@echo off
echo Setting up PostgreSQL database for Aaniry VMS...
echo.

REM Set PostgreSQL password
set PGPASSWORD=postgres

REM Create database
echo Creating database aaniry_vms...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE aaniry_vms;" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Database created successfully!
) else (
    echo Database may already exist or creation failed. Continuing...
)

echo.
echo Running Prisma migrations...
call npx prisma migrate dev --name init

echo.
echo Database setup complete!
pause
