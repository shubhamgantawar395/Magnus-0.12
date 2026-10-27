const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function setup() {
    try {
        console.log('🚀 Setting up test data (FRESH SCRIPT)...');

        // 1. Create Organization
        const org = await prisma.organization.upsert({
            where: { code: 'AANIRY_TEST' },
            update: {},
            create: {
                name: 'Aaniry Test Org',
                code: 'AANIRY_TEST',
                subscriptionTier: 'enterprise',
                subscriptionStatus: 'active'
            }
        });
        console.log(`✅ Organization created: ${org.name} (${org.id})`);

        // 2. Create Admin User
        const passwordHash = await bcrypt.hash('password123', 10);
        const admin = await prisma.user.upsert({
            where: { email: 'admin@aaniry.com' },
            update: { organizationId: org.id },
            create: {
                email: 'admin@aaniry.com',
                passwordHash,
                firstName: 'Test',
                lastName: 'Admin',
                role: 'admin',
                organizationId: org.id,
                isActive: true,
                isEmailVerified: true
            }
        });
        console.log(`✅ Admin user created: ${admin.email} (${admin.id})`);

        // 3. Create Customer
        const customer = await prisma.customer.upsert({
            where: { code: 'CUST_TEST' },
            update: { organizationId: org.id },
            create: {
                companyName: 'Test Customer Ltd',
                code: 'CUST_TEST',
                organizationId: org.id,
                isActive: true,
                createdById: admin.id
            }
        });
        console.log(`✅ Customer created: ${customer.companyName}`);

        // 4. Create Vendor
        const vendor = await prisma.vendor.upsert({
            where: { vendorCode: 'VEN9025' },
            update: { organizationId: org.id, customerId: customer.id },
            create: {
                companyName: 'Test Vendor 9025',
                vendorCode: 'VEN9025',
                email: 'vendor9025@test.com',
                organizationId: org.id,
                customerId: customer.id,
                status: 'approved',
                isActive: true,
                approvedById: admin.id,
                approvedAt: new Date()
            }
        });
        console.log(`✅ Vendor created: ${vendor.companyName} (${vendor.id})`);

        // 4.5. Create Role Users
        const vendorUser = await prisma.user.upsert({
            where: { email: 'vendor9025@test.com' },
            update: { vendorId: vendor.id, organizationId: org.id, isActive: true },
            create: {
                email: 'vendor9025@test.com',
                passwordHash,
                firstName: 'Test',
                lastName: 'Vendor 9025',
                role: 'vendor',
                vendorId: vendor.id,
                organizationId: org.id,
                isActive: true,
                isEmailVerified: true
            }
        });
        console.log(`✅ Vendor user created: ${vendorUser.email}`);

        const execUser = await prisma.user.upsert({
            where: { email: 'exec@aaniry.com' },
            update: { organizationId: org.id, isActive: true },
            create: {
                email: 'exec@aaniry.com',
                passwordHash,
                firstName: 'Test',
                lastName: 'Executive',
                role: 'executive',
                organizationId: org.id,
                isActive: true,
                isEmailVerified: true
            }
        });
        console.log(`✅ Executive user created: ${execUser.email}`);

        const ppcUser = await prisma.user.upsert({
            where: { email: 'ppc@aaniry.com' },
            update: { organizationId: org.id, isActive: true },
            create: {
                email: 'ppc@aaniry.com',
                passwordHash,
                firstName: 'Test',
                lastName: 'PPC Manager',
                role: 'ppc_manager',
                organizationId: org.id,
                isActive: true,
                isEmailVerified: true
            }
        });
        console.log(`✅ PPC Manager user created: ${ppcUser.email}`);

        // 5. Create Delivery Challans (Feb 2026)
        // DC-001: 850 qty
        const dc1 = await prisma.deliveryChallan.upsert({
            where: { challanNumber: 'DC-TEST-001' },
            update: {},
            create: {
                challanNumber: 'DC-TEST-001',
                challanDate: new Date('2026-02-14'),
                organizationId: org.id,
                vendorId: vendor.id,
                customerId: customer.id,
                status: 'received',
                createdById: admin.id,
                totalQuantity: 850,
                items: {
                    create: {
                        partNumber: '16705',
                        partDescription: 'Rotor Hub',
                        quantityIssued: 850,
                        unitOfMeasure: 'NOS'
                    }
                }
            }
        });
        console.log(`✅ Challan 1 created: ${dc1.challanNumber}`);

        // DC-002: 1750 qty
        const dc2 = await prisma.deliveryChallan.upsert({
            where: { challanNumber: 'DC-TEST-002' },
            update: {},
            create: {
                challanNumber: 'DC-TEST-002',
                challanDate: new Date('2026-02-16'),
                organizationId: org.id,
                vendorId: vendor.id,
                customerId: customer.id,
                status: 'received',
                createdById: admin.id,
                totalQuantity: 1750,
                items: {
                    create: {
                        partNumber: '16705',
                        partDescription: 'Rotor Hub',
                        quantityIssued: 1750,
                        unitOfMeasure: 'NOS'
                    }
                }
            }
        });
        console.log(`✅ Challan 2 created: ${dc2.challanNumber}`);

        // 6. Create Approved Invoice (Feb 2026)
        // INV-001: 1000 qty

        // Corrected: STRICTLY conform to Invoice schema
        // Valid fields: invoiceNumber, invoiceDate, vendorId, customerId, status, createdById, totalAmount, grandTotal, items
        // Removed: organizationId, approvedById, subtotal, balanceAmount
        const invoiceData = {
            invoiceNumber: "INV-TEST-001",
            invoiceDate: new Date("2026-02-19"),
            vendorId: vendor.id,
            customerId: customer.id,
            status: "approved",
            createdById: admin.id,
            totalAmount: 10000,
            grandTotal: 10000,
            items: {
                create: {
                    partNumber: "16705",
                    description: "Rotor Hub",
                    quantity: 1000,
                    rate: 10,
                    amount: 10000
                }
            }
        };
        console.log('Invoice Data Keys:', Object.keys(invoiceData));
        console.log('Invoice Data:', JSON.stringify(invoiceData, null, 2));

        const inv1 = await prisma.invoice.upsert({
            where: { invoiceNumber: 'INV-TEST-001' },
            update: {},
            create: invoiceData
        });

        // Update invoice to ensure correct timestamps for approval proxy
        await prisma.invoice.update({
            where: { id: inv1.id },
            data: { updatedAt: new Date('2026-02-19T10:00:00Z') }
        });

        console.log(`✅ Invoice created: ${inv1.invoiceNumber}`);

        console.log('\n🎉 Setup complete! Ready for testing.');
        process.exit(0);

    } catch (e) {
        console.error('❌ Setup failed:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

setup();
