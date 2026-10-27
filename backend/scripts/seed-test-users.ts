
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
    console.log('Seeding Test Users...');

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // 1. Ensure Organization
    let org = await prisma.organization.findFirst();
    if (!org) {
        org = await prisma.organization.create({
            data: {
                name: 'Aaniry Test Org',
                code: 'ANTI-TEST',
                gstin: '29ABCDE1234F1Z5',
                address: '123 Tech Park',
                city: 'Bangalore',
                state: 'Karnataka',
                pincode: '560001'
            }
        });
        console.log('Created Organization:', org.name);
    }

    // 2. Ensure Director
    const directorEmail = 'director@aaniry.com';
    let director = await prisma.user.findUnique({ where: { email: directorEmail } });
    if (!director) {
        director = await prisma.user.create({
            data: {
                email: directorEmail,
                passwordHash: hashedPassword,
                role: 'director',
                firstName: 'Test',
                lastName: 'Director',
                organizationId: org.id,
                isActive: true
            }
        });
        console.log('Created Director:', directorEmail);
    } else {
        console.log('Director already exists - Updating Password');
        await prisma.user.update({
            where: { email: directorEmail },
            data: { passwordHash: hashedPassword }
        });
    }

    // 3. Ensure Customer
    let customer = await prisma.customer.findFirst({ where: { organizationId: org.id } });
    if (!customer) {
        customer = await prisma.customer.create({
            data: {
                organizationId: org.id,
                companyName: 'Internal Customer',
                code: 'CUST001',
                email: 'cust@test.com'
            }
        });
        console.log('Created Customer:', customer.companyName);
    }

    // 4. Ensure Vendor
    const vendorEmail = 'vendor@supplier.com';
    let vendorUser = await prisma.user.findUnique({ where: { email: vendorEmail } });

    if (!vendorUser) {
        // Create Vendor Record first
        const vendor = await prisma.vendor.create({
            data: {
                organizationId: org.id,
                customerId: customer.id,
                companyName: 'Test Supplier Tech',
                vendorCode: 'VEN-TEST-001',
                contactPerson: 'John Supplier',
                email: vendorEmail, // Contact email
                status: 'approved'
            }
        });

        // Create Vendor User
        vendorUser = await prisma.user.create({
            data: {
                email: vendorEmail,
                passwordHash: hashedPassword,
                role: 'vendor', // or 'vendor_owner' depending on schema enum
                firstName: 'Vendor',
                lastName: 'User',
                vendorId: vendor.id,
                organizationId: org.id, // Some schemas link vendor user to org too? check schema.
                isActive: true
            }
        });
        console.log('Created Vendor User:', vendorEmail);
    } else {
        console.log('Vendor User already exists - Updating Password');
        await prisma.user.update({
            where: { email: vendorEmail },
            data: { passwordHash: hashedPassword }
        });
    }

    console.log('Seeding Complete.');
}

seed()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
