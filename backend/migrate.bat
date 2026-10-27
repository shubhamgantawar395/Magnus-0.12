@echo off
echo ========================================
echo Aaniry VMS - Database Migration
echo ========================================
echo.

echo Step 1: Applying database migration...
call npx prisma migrate deploy
if errorlevel 1 (
    echo ERROR: Migration failed!
    pause
    exit /b 1
)
echo SUCCESS: Migration applied!
echo.

echo Step 2: Generating Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo ERROR: Prisma generate failed!
    pause
    exit /b 1
)
echo SUCCESS: Prisma Client generated!
echo.

echo Step 3: Running data migration...
call npx ts-node prisma/data-migration.ts
if errorlevel 1 (
    echo ERROR: Data migration failed!
    pause
    exit /b 1
)
echo SUCCESS: Data migration completed!
echo.

echo Step 4: Seeding sample data...
set /p SEED="Do you want to seed sample data? (y/n): "
if /i "%SEED%"=="y" (
    call npx ts-node prisma/seed-realworld.ts
    if errorlevel 1 (
        echo ERROR: Seeding failed!
        pause
        exit /b 1
    )
    echo SUCCESS: Sample data seeded!
    echo.
    echo Login Credentials:
    echo   Director:  director@aaniry.com  / director123
    echo   GM:        gm@aaniry.com        / gm123
    echo   PM:        pm@aaniry.com        / pm123
    echo   PPC:       ppc@aaniry.com       / ppc123
    echo   Quality:   quality@aaniry.com   / quality123
) else (
    echo Skipping sample data seeding
)

echo.
echo ========================================
echo Migration completed successfully!
echo ========================================
echo.
echo Next steps:
echo   1. Start backend: npm run start:dev
echo   2. Check database: npx prisma studio
echo.
pause
