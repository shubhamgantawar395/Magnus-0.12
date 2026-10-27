import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create Admin User
    const defaultPassword = await bcrypt.hash('password123', 12);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@aaniry.com' },
        update: {
            role: 'platform_admin',
            passwordHash: defaultPassword,
        },
        create: {
            email: 'admin@aaniry.com',
            passwordHash: defaultPassword,
            role: 'platform_admin',
            firstName: 'System',
            lastName: 'Admin',
            isActive: true,
            isEmailVerified: true,
        },
    });
    console.log('✅ Admin user created:', admin.email);

    // Create PPC User
    const ppc = await prisma.user.upsert({
        where: { email: 'ppc@seinumero.com' },
        update: {
            role: 'ppc_manager',
            passwordHash: defaultPassword,
        },
        create: {
            email: 'ppc@seinumero.com',
            passwordHash: defaultPassword,
            role: 'ppc_manager',
            firstName: 'PPC',
            lastName: 'Manager',
            isActive: true,
            isEmailVerified: true,
        },
    });
    console.log('✅ PPC user created:', ppc.email);

    // Create Director User
    const director = await prisma.user.upsert({
        where: { email: 'director@seinumero.com' },
        update: {
            role: 'director',
            passwordHash: defaultPassword,
        },
        create: {
            email: 'director@seinumero.com',
            passwordHash: defaultPassword,
            role: 'director',
            firstName: 'Company',
            lastName: 'Director',
            isActive: true,
            isEmailVerified: true,
        },
    });
    console.log('✅ Director user created:', director.email);

    // Create Test Customer
    const customer = await prisma.customer.upsert({
        where: { code: 'CUST001' },
        update: {},
        create: {
            companyName: 'Aaniry Overseas Pvt. Ltd.',
            code: 'CUST001',
            contactPerson: 'Rajesh Kumar',
            email: 'rajesh@aaniry.com',
            phone: '+91-9876543210',
            address: '123 Industrial Area, Phase 2',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411001',
            gstin: '27AAAAA0000A1Z5',
            pan: 'AAAAA0000A',
            isActive: true,
            createdById: admin.id,
        },
    });
    console.log('✅ Customer created:', customer.companyName);

    // Create Test Vendor
    const vendor = await prisma.vendor.upsert({
        where: { vendorCode: 'VEN001' },
        update: {},
        create: {
            companyName: 'Precision CNC Works',
            vendorCode: 'VEN001',
            contactPerson: 'Suresh Patil',
            email: 'suresh@precisioncnc.com',
            phone: '+91-9123456789',
            address: '456 MIDC Area',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411019',
            gstin: '27BBBBB1111B1Z6',
            pan: 'BBBBB1111B',
            status: 'approved',
            isActive: true,
            customerId: customer.id,
            approvedById: admin.id,
            approvedAt: new Date(),
        },
    });
    console.log('✅ Vendor created:', vendor.companyName);

    // Create Vendor Capabilities
    const capabilities = await prisma.vendorCapability.createMany({
        data: [
            {
                vendorId: vendor.id,
                processName: 'CNC Turning',
                machineCount: 5,
                capacityPerMonth: 10000,
                notes: '3-axis and 4-axis turning centers',
            },
            {
                vendorId: vendor.id,
                processName: 'VMC Milling',
                machineCount: 3,
                capacityPerMonth: 5000,
                notes: 'Vertical machining centers',
            },
        ],
        skipDuplicates: true,
    });
    console.log('✅ Vendor capabilities created:', capabilities.count);

    console.log('🎉 Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
