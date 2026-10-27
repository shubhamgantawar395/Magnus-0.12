# Aaniry VMS - Complete Migration Script
# This script will apply all migrations and seed the database

Write-Host "🚀 Aaniry VMS - Real-World Migration Script" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Step 1: Check if we're in the backend directory
if (!(Test-Path "prisma/schema.prisma")) {
    Write-Host "❌ Error: Please run this script from the backend directory" -ForegroundColor Red
    Write-Host "   cd backend" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Step 1: Applying database migration..." -ForegroundColor Yellow
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migration failed! Please check the error above." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Migration applied successfully!`n" -ForegroundColor Green

Write-Host "🔄 Step 2: Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Prisma generate failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Prisma Client generated!`n" -ForegroundColor Green

Write-Host "📦 Step 3: Running data migration..." -ForegroundColor Yellow
npx ts-node prisma/data-migration.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Data migration failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Data migration completed!`n" -ForegroundColor Green

Write-Host "🌱 Step 4: Seeding sample data..." -ForegroundColor Yellow
$response = Read-Host "Do you want to seed sample data? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    npx ts-node prisma/seed-realworld.ts
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Seeding failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Sample data seeded!`n" -ForegroundColor Green
    
    Write-Host "`n📝 Login Credentials:" -ForegroundColor Cyan
    Write-Host "   Director:  director@aaniry.com  / director123" -ForegroundColor White
    Write-Host "   GM:        gm@aaniry.com        / gm123" -ForegroundColor White
    Write-Host "   PM:        pm@aaniry.com        / pm123" -ForegroundColor White
    Write-Host "   PPC:       ppc@aaniry.com       / ppc123" -ForegroundColor White
    Write-Host "   Quality:   quality@aaniry.com   / quality123" -ForegroundColor White
} else {
    Write-Host "⏭️  Skipping sample data seeding`n" -ForegroundColor Yellow
}

Write-Host "`n🎉 Migration completed successfully!" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start the backend: npm run start:dev" -ForegroundColor White
Write-Host "  2. Check the database with Prisma Studio: npx prisma studio" -ForegroundColor White
Write-Host "  3. Review the migration guide: prisma/MIGRATION_GUIDE.md" -ForegroundColor White
Write-Host "`n"
