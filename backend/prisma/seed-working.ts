import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting simple seed...\n');

    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Create Admin
    console.log('Creating admin user...');
    const admin = await prisma.user.upsert({
        where: { email: 'admin@aaniry.com' },
        update: {},
        create: {
            email: 'admin@aaniry.com',
            passwordHash: hashedPassword,
            role: 'admin',
            firstName: 'System',
            lastName: 'Admin',
            isActive: true,
            isEmailVerified: true
        }
    });
    console.log(`✓ Created: ${admin.email} (ID: ${admin.id})`);

    // 2. Create Vendors (10)
    console.log('\nCreating vendors...');
    for (let i = 1; i <= 5; i++) {
        const vendorCode = `VEND${String(i).padStart(3, '0')}`;

        const vendor = await prisma.vendor.upsert({
            where: { vendorCode },
            update: {},
            create: {
                companyName: `Vendor Company ${i} Pvt Ltd`,
                vendorCode,
                gstin: `27VEND${String(i).padStart(5, '0')}1Z5`,
                contactPerson: `Vendor Owner ${i}`,
                email: `vendor${i}@test.com`,
                phone: `912345${String(i).padStart(4, '0')}`,
                address: `Plot ${i}, Industrial Area`,
                city: 'Pune',
                state: 'Maharashtra',
                pincode: '411026',
                status: 'approved'
            }
        });

        // Create vendor user
        await prisma.user.upsert({
            where: { email: `vendor${i}@test.com` },
            update: {},
            create: {
                email: `vendor${i}@test.com`,
                passwordHash: hashedPassword,
                role: 'vendor',
                firstName: `Vendor`,
                lastName: `${i}`,
                isActive: true,
                isEmailVerified: true,
                vendorId: vendor.id
            }
        });

        console.log(`✓ Created: vendor${i}@test.com`);
    }

    // 3. Create Customers (5)
    console.log('\nCreating customers...');
    for (let i = 1; i <= 5; i++) {
        const code = `CUST${String(i).padStart(3, '0')}`;

        await prisma.customer.upsert({
            where: { code },
            update: {},
            create: {
                companyName: `Customer Company ${i} Ltd`,
                code,
                gstin: `27CUST${String(i).padStart(5, '0')}1Z5`,
                contactPerson: `Customer Manager ${i}`,
                email: `customer${i}@test.com`,
                phone: `987654${String(i).padStart(4, '0')}`,
                address: `Building ${i}, Tech Park`,
                city: 'Pune',
                state: 'Maharashtra',
                pincode: '411001'
            }
        });

        await prisma.user.upsert({
            where: { email: `customer${i}@test.com` },
            update: {},
            create: {
                email: `customer${i}@test.com`,
                passwordHash: hashedPassword,
                role: 'customer',
                firstName: `Customer`,
                lastName: `${i}`,
                isActive: true,
                isEmailVerified: true
            }
        });

        console.log(`✓ Created: customer${i}@test.com`);
    }

    // 4. Create Executive Users (2)
    console.log('\nCreating executive users...');
    for (let i = 1; i <= 2; i++) {
        await prisma.user.upsert({
            where: { email: `executive${i}@aaniry.com` },
            update: {},
            create: {
                email: `executive${i}@aaniry.com`,
                passwordHash: hashedPassword,
                role: 'executive',
                firstName: `Executive`,
                lastName: `${i}`,
                isActive: true,
                isEmailVerified: true
            }
        });
        console.log(`✓ Created: executive${i}@aaniry.com`);
    }

    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('   All users have password: password123');
    console.log('\n   Admin: admin@aaniry.com');
    console.log('   Vendors: vendor1@test.com to vendor5@test.com');
    console.log('   Customers: customer1@test.com to customer5@test.com');
    console.log('   Executives: executive1@aaniry.com, executive2@aaniry.com\n');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
