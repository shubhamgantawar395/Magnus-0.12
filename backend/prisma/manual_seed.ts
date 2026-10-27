
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Manual Seeding / Fix...');

    // 1. Ensure Admin Exists
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@aaniry.com' },
        update: {},
        create: {
            email: 'admin@aaniry.com',
            passwordHash: adminPassword,
            role: 'admin',
            firstName: 'System',
            lastName: 'Admin',
            isActive: true,
            isEmailVerified: true,
        },
    });
    console.log('✅ Admin:', admin.email);

    // 2. Ensure Customer Exists
    const customer = await prisma.customer.upsert({
        where: { code: 'CUST001' },
        update: {},
        create: {
            companyName: 'Aaniry Overseas Pvt. Ltd.',
            code: 'CUST001',
            contactPerson: 'Rajesh Kumar',
            email: 'rajesh@aaniry.com',
            phone: '+91-9876543210',
            address: '123 Industrial Area',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411001',
            gstin: '27AAAAA0000A1Z5',
            pan: 'AAAAA0000A',
            isActive: true,
            createdById: admin.id,
        },
    });
    console.log('✅ Customer:', customer.companyName);

    // 3. Ensure Vendor Exists
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
    console.log('✅ Vendor:', vendor.companyName);

    // 4. Ensure Vendor User Exists & Linked
    const vendorPassword = await bcrypt.hash('password123', 12);
    const vendorUser = await prisma.user.upsert({
        where: { email: 'vendor@test.com' },
        update: {
            vendorId: vendor.id, // Ensure link is refreshed
            passwordHash: vendorPassword // Ensure password is correct
        },
        create: {
            email: 'vendor@test.com',
            passwordHash: vendorPassword,
            role: 'vendor',
            firstName: 'Vendor',
            lastName: 'User',
            vendorId: vendor.id,
            isActive: true,
            isEmailVerified: true,
        },
    });
    console.log('✅ Vendor User:', vendorUser.email);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
