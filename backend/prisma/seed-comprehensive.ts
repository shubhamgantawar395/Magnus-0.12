import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting comprehensive seeding...');

    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 12);

    // 0. Create Admin
    console.log('Creating Admin...');
    await prisma.user.upsert({
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

    // 1. Create 10 Customers
    console.log('Creating 10 Customers...');
    const customers = [];
    for (let i = 1; i <= 10; i++) {
        const code = `CUST${String(i).padStart(3, '0')}`;
        const email = `customer${i}@test.com`;

        // Create User login
        await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                passwordHash: hashedPassword,
                role: 'customer',
                firstName: `Customer`,
                lastName: `${i}`,
                isActive: true,
                isEmailVerified: true
            }
        });

        const customer = await prisma.customer.upsert({
            where: { code },
            update: {},
            create: {
                companyName: `Test Customer ${i} Pvt Ltd`,
                code,
                gstin: `27AAAAA${String(i).padStart(4, '0')}A1Z${i % 9}`,
                contactPerson: `Manager ${i}`,
                email,
                phone: `98765432${String(i).padStart(2, '0')}`,
                address: `Plot ${i}, Industrial Area`,
                city: 'Pune',
                state: 'Maharashtra',
                pincode: '411001'
            },
        });
        customers.push(customer);
    }

    // 2. Create 10 Vendors
    console.log('Creating 10 Vendors...');
    const vendors = [];
    for (let i = 1; i <= 10; i++) {
        const vendorCode = `VEND${String(i).padStart(3, '0')}`;
        const email = `vendor${i}@test.com`;

        // Create User login
        await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                passwordHash: hashedPassword,
                role: 'vendor',
                firstName: `Vendor`,
                lastName: `${i}`,
                isActive: true,
                isEmailVerified: true
            }
        });

        const vendor = await prisma.vendor.upsert({
            where: { vendorCode },
            update: {},
            create: {
                companyName: `Test Vendor ${i} Works`,
                vendorCode,
                gstin: `27BBBBB${String(i).padStart(4, '0')}B1Z${i % 9}`,
                contactPerson: `Owner ${i}`,
                email,
                phone: `91234567${String(i).padStart(2, '0')}`,
                address: `Shed ${i}, MIDC`,
                city: 'Pune',
                state: 'Maharashtra',
                pincode: '411026',
                status: 'approved'
            },
        });
        vendors.push(vendor);
    }

    // 3. Create Challans (5 per vendor)
    console.log('Creating Challans...');
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!admin) throw new Error('Admin not found');

    for (const vendor of vendors) {
        for (let j = 1; j <= 5; j++) {
            const customer = customers[Math.floor(Math.random() * customers.length)];
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Last 30 days

            const challanNumber = `DC/${vendor.vendorCode}/${date.getFullYear()}/${String(j).padStart(3, '0')}`;

            try {
                await prisma.deliveryChallan.create({
                    data: {
                        challanNumber,
                        challanDate: date,
                        totalQuantity: 100,
                        totalAmount: 15000,
                        status: 'issued',
                        customerId: customer.id,
                        vendorId: vendor.id,
                        createdById: admin.id,
                        items: {
                            create: {
                                partNumber: `PRT-${vendor.vendorCode}-${j}`,
                                partDescription: `Machined Part type ${j}`,
                                quantityIssued: 100,
                                unitPrice: 150.00,
                                totalAmount: 15000,
                                jobProcesses: {
                                    create: [
                                        { processName: 'Turning', status: 'pending' },
                                        { processName: 'Milling', status: 'pending' }
                                    ]
                                }
                            }
                        }
                    }
                });
            } catch (e) {
                // Ignore unique constraint violations if re-running
                if (!e.message.includes('Unique constraint')) {
                    console.error(`Failed to create challan ${challanNumber}:`, e.message);
                }
            }
        }
    }

    console.log('Comprehensive seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
