import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting data migration...\n');

    // Step 1: Create default organization (Aaniry)
    console.log('📦 Creating default organization...');
    const defaultOrg = await prisma.organization.upsert({
        where: { code: 'AANIRY001' },
        update: {},
        create: {
            name: 'Aaniry Manufacturing Pvt Ltd',
            code: 'AANIRY001',
            gstin: '27AANIR1234F1Z5',
            pan: 'AANIR1234F',
            address: '123 Industrial Area',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560001',
            contactPerson: 'Admin',
            contactEmail: 'admin@aaniry.com',
            contactPhone: '+91-9876543210',
            subscriptionTier: 'enterprise',
            subscriptionStatus: 'active',
            subscriptionStartDate: new Date(),
            maxUsers: 100,
            maxVendors: 500,
            maxChallansPerMonth: 10000,
            primaryColor: '#2196f3'
        }
    });
    console.log(`✅ Organization created: ${defaultOrg.name} (${defaultOrg.code})\n`);

    // Step 2: Migrate existing users to default organization
    console.log('👥 Migrating existing users...');
    const usersUpdated = await prisma.user.updateMany({
        where: { organizationId: null },
        data: { organizationId: defaultOrg.id }
    });
    console.log(`✅ Updated ${usersUpdated.count} users with organizationId\n`);

    // Step 3: Migrate role mappings
    console.log('🔄 Migrating user roles...');

    // admin → platform_admin
    const adminCount = await prisma.user.updateMany({
        where: { role: 'admin' as any },
        data: {
            role: 'platform_admin' as any,
            department: 'executive' as any
        }
    });
    console.log(`✅ Migrated ${adminCount.count} admin users to platform_admin`);

    // customer → production_manager
    const customerCount = await prisma.user.updateMany({
        where: { role: 'customer' as any },
        data: {
            role: 'production_manager' as any,
            department: 'production' as any
        }
    });
    console.log(`✅ Migrated ${customerCount.count} customer users to production_manager`);

    // vendor → vendor_user
    const vendorCount = await prisma.user.updateMany({
        where: { role: 'vendor' as any },
        data: {
            role: 'vendor_user' as any,
            department: 'vendor' as any
        }
    });
    console.log(`✅ Migrated ${vendorCount.count} vendor users to vendor_user\n`);

    // Step 4: Migrate customers to default organization
    console.log('🏢 Migrating customers...');
    const customersUpdated = await prisma.customer.updateMany({
        where: { organizationId: null },
        data: { organizationId: defaultOrg.id }
    });
    console.log(`✅ Updated ${customersUpdated.count} customers with organizationId\n`);

    // Step 5: Migrate vendors to default organization
    console.log('🏭 Migrating vendors...');
    const vendorsUpdated = await prisma.vendor.updateMany({
        where: { organizationId: null },
        data: { organizationId: defaultOrg.id }
    });
    console.log(`✅ Updated ${vendorsUpdated.count} vendors with organizationId\n`);

    // Step 6: Migrate delivery challans to default organization
    console.log('📋 Migrating delivery challans...');
    const challansUpdated = await prisma.deliveryChallan.updateMany({
        where: { organizationId: null },
        data: { organizationId: defaultOrg.id }
    });
    console.log(`✅ Updated ${challansUpdated.count} challans with organizationId\n`);

    // Step 7: Create sample PPC user if not exists
    console.log('👤 Creating sample PPC user...');
    const ppcUser = await prisma.user.upsert({
        where: { email: 'ppc@aaniry.com' },
        update: {},
        create: {
            email: 'ppc@aaniry.com',
            passwordHash: await bcrypt.hash('ppc123', 12),
            role: 'ppc_manager' as any,
            department: 'planning' as any,
            firstName: 'PPC',
            lastName: 'Manager',
            designation: 'PPC Manager',
            organizationId: defaultOrg.id,
            isActive: true,
            isEmailVerified: true
        }
    });
    console.log(`✅ PPC user created: ${ppcUser.email}\n`);

    // Step 8: Create sample Quality Head user if not exists
    console.log('👤 Creating sample Quality Head user...');
    const qualityUser = await prisma.user.upsert({
        where: { email: 'quality@aaniry.com' },
        update: {},
        create: {
            email: 'quality@aaniry.com',
            passwordHash: await bcrypt.hash('quality123', 12),
            role: 'quality_head' as any,
            department: 'quality' as any,
            firstName: 'Quality',
            lastName: 'Head',
            designation: 'Quality Head',
            organizationId: defaultOrg.id,
            isActive: true,
            isEmailVerified: true
        }
    });
    console.log(`✅ Quality Head user created: ${qualityUser.email}\n`);

    // Step 9: Create sample Director user if not exists
    console.log('👤 Creating sample Director user...');
    const directorUser = await prisma.user.upsert({
        where: { email: 'director@aaniry.com' },
        update: {},
        create: {
            email: 'director@aaniry.com',
            passwordHash: await bcrypt.hash('director123', 12),
            role: 'director' as any,
            department: 'executive' as any,
            firstName: 'Director',
            lastName: 'Aaniry',
            designation: 'Director',
            organizationId: defaultOrg.id,
            isActive: true,
            isEmailVerified: true
        }
    });
    console.log(`✅ Director user created: ${directorUser.email}\n`);

    console.log('✅ Data migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Organization: ${defaultOrg.name}`);
    console.log(`   - Users migrated: ${usersUpdated.count}`);
    console.log(`   - Customers migrated: ${customersUpdated.count}`);
    console.log(`   - Vendors migrated: ${vendorsUpdated.count}`);
    console.log(`   - Challans migrated: ${challansUpdated.count}`);
    console.log(`   - New users created: 3 (PPC, Quality, Director)`);
}

main()
    .catch((e) => {
        console.error('❌ Error during migration:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
