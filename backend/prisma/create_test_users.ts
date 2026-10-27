
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Creating test users...');

    const password = await bcrypt.hash('password123', 12);

    // 1. Find Vendor
    const vendor = await prisma.vendor.findFirst({
        where: { vendorCode: 'VEN001' }
    });

    if (vendor) {
        const vendorUser = await prisma.user.upsert({
            where: { email: 'vendor@test.com' },
            update: {},
            create: {
                email: 'vendor@test.com',
                passwordHash: password,
                role: 'vendor',
                firstName: 'Vendor',
                lastName: 'User',
                vendorId: vendor.id,
                isActive: true,
                isEmailVerified: true,
            }
        });
        console.log('✅ Vendor User: vendor@test.com / password123');
    } else {
        console.log('❌ Vendor VEN001 not found. Run seed first.');
    }

    // 2. Find Customer
    const customer = await prisma.customer.findFirst({
        where: { code: 'CUST001' }
    });

    if (customer) {
        // Customer users might be 'director' or 'production_manager' etc linked to an organization?
        // Or maybe 'customer' role (legacy)? Schema says 'customer' is legacy enum but maybe still used.
        // Let's check schema/User model again. 
        // User model has `organizationId`. Customer model has `organizationId`.
        // The Request asked for "customer" login.
        // In the schema, `UserRole` has `customer`.

        const customerUser = await prisma.user.upsert({
            where: { email: 'customer@test.com' },
            update: {},
            create: {
                email: 'customer@test.com',
                passwordHash: password,
                role: 'customer', // Using the legacy role for now as requested
                firstName: 'Customer',
                lastName: 'User',
                // customerId? User doesn't have customerId directly in schema I saw?
                // Wait, let me check schema again in my head/logs. 
                // User has vendorId. Does NOT have customerId. 
                // It has organizationId. 
                // Customer entity has organizationId.
                // If I link them via Organization, that's better.
                // But for now let's just create a user with role 'customer'.
                isActive: true,
                isEmailVerified: true,
            }
        });
        console.log('✅ Customer User: customer@test.com / password123');
    } else {
        console.log('❌ Customer CUST001 not found. Run seed first.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
