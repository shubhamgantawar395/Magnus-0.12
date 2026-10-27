import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Seeding Exact E2E Flow ---');

    // 1. Password setup
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 12);

    // 2. Organization (Seinumero Nirman Pvt Ltd)
    const org = await prisma.organization.upsert({
        where: { code: 'SEIN' },
        update: {},
        create: {
            name: 'Seinumero Nirman Pvt Ltd',
            code: 'SEIN',
        }
    });
    console.log(`Created Organization: ${org.name}`);

    // 3. Admin (We are the admins)
    const adminEmail = 'admin@aaniry.com';
    await prisma.user.upsert({
        where: { email: adminEmail },
        update: { passwordHash: hashedPassword },
        create: {
            email: adminEmail,
            passwordHash: hashedPassword,
            role: 'admin',
            firstName: 'System',
            lastName: 'Admin',
            isActive: true,
            isEmailVerified: true
        }
    });
    console.log(`System Admin: ${adminEmail} / ${password}`);

    // 4. Executive Users (Director and General Manager)
    const directorEmail = 'director@seinumero.com';
    const directorUser = await prisma.user.upsert({
        where: { email: directorEmail },
        update: { passwordHash: hashedPassword, organizationId: org.id },
        create: {
            email: directorEmail,
            passwordHash: hashedPassword,
            role: 'director',
            firstName: 'Org',
            lastName: 'Director',
            isActive: true,
            isEmailVerified: true,
            organizationId: org.id
        }
    });
    console.log(`Director: ${directorEmail} / ${password}`);

    const gmEmail = 'gm@seinumero.com';
    await prisma.user.upsert({
        where: { email: gmEmail },
        update: { passwordHash: hashedPassword, organizationId: org.id },
        create: {
            email: gmEmail,
            passwordHash: hashedPassword,
            role: 'gm',
            firstName: 'General',
            lastName: 'Manager',
            isActive: true,
            isEmailVerified: true,
            organizationId: org.id
        }
    });

    // 5. PPC User
    const ppcEmail = 'ppc@seinumero.com';
    const ppcUser = await prisma.user.upsert({
        where: { email: ppcEmail },
        update: { passwordHash: hashedPassword, organizationId: org.id },
        create: {
            email: ppcEmail,
            passwordHash: hashedPassword,
            role: 'ppc_manager',
            firstName: 'PPC',
            lastName: 'Manager',
            isActive: true,
            isEmailVerified: true,
            organizationId: org.id
        }
    });
    console.log(`PPC Manager: ${ppcEmail} / ${password}`);

    // 6. Customer (Eaton)
    const eatonId = 'eaton-customer-e2e';
    const eaton = await prisma.customer.upsert({
        where: { id: eatonId },
        update: {},
        create: {
            id: eatonId,
            organizationId: org.id,
            companyName: 'Eaton',
            address: 'Pune, Maharashtra',
            state: 'Maharashtra',
            contactPerson: 'Eaton Buyer',
            email: 'buyer@eaton.com',
            isActive: true,
            code: 'EATON123'
        }
    });
    console.log(`Created Customer: ${eaton.companyName}`);

    // Add 10 parts to Eaton
    // Instead of raw DB model parts which don't exist as a standalone entity without Challan Items or POs in current schema,
    // we just use the name strings for POs to represent them later.
    const partNumbers = Array.from({ length: 10 }, (_, i) => `1000${i + 1}`);
    const partNames = Array.from({ length: 10 }, (_, i) => `abcd${i + 1}`);

    // 7. Vendors (Vendor 1 to 4)
    const setupVendor = async (companyName: string, email: string, vendorCode: string) => {
        // Vendor doesn't have email as unique directly, only id or vendorCode
        let v = await prisma.vendor.findFirst({ where: { email } });
        if (!v) {
            v = await prisma.vendor.create({
                data: {
                    organizationId: org.id,
                    companyName,
                    address: 'Pune MIDC',
                    state: 'Maharashtra',
                    contactPerson: `${companyName} Rep`,
                    email,
                    isActive: true,
                    vendorCode,
                    gstin: `${vendorCode}GST`
                }
            });
        }
        
        const vu = await prisma.user.upsert({
            where: { email },
            update: { passwordHash: hashedPassword, vendorId: v.id },
            create: {
                email,
                passwordHash: hashedPassword,
                role: 'vendor_owner',
                firstName: companyName,
                lastName: 'Rep',
                isActive: true,
                isEmailVerified: true,
                vendorId: v.id
            }
        });
        return { vendor: v, user: vu };
    };

    const v1 = await setupVendor('Vendor 1 (Casting)', 'vendor1@supplier.com', 'V1CAST');
    const v2 = await setupVendor('Vendor 2 (VMC)', 'vendor2@supplier.com', 'V2VMC');
    const v3 = await setupVendor('Vendor 3 (Phosphating)', 'vendor3@supplier.com', 'V3PHOS');
    const v4 = await setupVendor('Vendor 4 (Others)', 'vendor4@supplier.com', 'V4OTH');

    console.log(`Created 4 vendors. Creds logic: [email] / ${password}`);
    console.log(`  Vendor 1: vendor1@supplier.com`);
    console.log(`  Vendor 2: vendor2@supplier.com`);

    // 8. Purchase Orders for the Vendors for Part 10001 (abcd1)
    const createPO = async (vId: string, poNumber: string, op: string, rate: number) => {
        return await prisma.purchaseOrder.create({
            data: {
                poNumber,
                organizationId: org.id,
                vendorId: vId,
                poDate: new Date(),
                deliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next month
                status: 'approved',
                createdById: ppcUser.id,
                jobWorkType: 'with_material',
                subtotal: 5000 * rate,
                totalAmount: 5000 * rate,
                items: {
                    create: [{
                        partNumber: '10001',
                        partDescription: 'abcd1',
                        quantity: 5000,
                        ratePerPiece: rate,
                        amount: 5000 * rate,
                        operations: [op],
                        deliverySchedule: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    }]
                }
            },
            include: { items: true }
        });
    };

    // Clean up old e2e POs to re-run safely
    await prisma.purchaseOrder.deleteMany({
        where: { poNumber: { startsWith: 'PO-E2E-' } }
    });
    
    // Vendor 1 - Casting / Turning / Broaching - Rate 107
    const po1 = await createPO(v1.vendor.id, 'PO-E2E-V1', 'Casting/Turning/Broaching', 107);
    
    // Vendor 2 - VMC - Rate 60
    const po2 = await createPO(v2.vendor.id, 'PO-E2E-V2', 'VMC', 60);

    // Vendor 3 - Phosphating - Rate 25
    const po3 = await createPO(v3.vendor.id, 'PO-E2E-V3', 'Phosphating', 25);

    // Vendor 4 - Rate 10
    const po4 = await createPO(v4.vendor.id, 'PO-E2E-V4', 'Finishing', 10);
    
    console.log("Created 4 POs for the vendors");

    // 9. Create 2 Challans for Vendor 2 (VMC)
    // Clean up old e2e challans
    await prisma.deliveryChallan.deleteMany({
        where: { challanNumber: { in: ['24516', '26819'] } }
    });

    const createChallan = async (challanNo: string, date: string, qty: number) => {
        // We create the PO first, then create the challan pointing to the PO item.
        const poItem = po2.items[0]; // VMC PO Item
        
        return await prisma.deliveryChallan.create({
            data: {
                challanNumber: challanNo,
                organizationId: org.id,
                vendorId: v2.vendor.id,
                customerId: eaton.id,
                challanDate: new Date(date),
                status: 'issued',
                transportMode: 'road',
                copyType: 'Original',
                createdById: ppcUser.id,
                totalQuantity: qty,
                items: {
                    create: [{
                        partNumber: '10001',
                        partDescription: 'abcd1',
                        quantityIssued: qty,
                        poItemId: poItem.id,
                        unitPrice: poItem.ratePerPiece, // 60 rs
                        hsnCode: '8483', // Example HSN
                        jobProcesses: {
                            create: [
                                { processName: 'Casting/Turning/Broaching', status: 'completed', targetQuantity: qty, completedQuantity: qty, startedAt: new Date(date), completedAt: new Date(date) },
                                { processName: 'VMC', status: 'pending', targetQuantity: qty, completedQuantity: 0 },
                                { processName: 'Phosphating', status: 'pending', targetQuantity: qty, completedQuantity: 0 }
                            ]
                        }
                    }]
                }
            },
            include: { items: true }
        });
    }

    // "Give material to vendor2 on 13 feb 1200 qty, 15 feb 1800 qty" -> "Let say PPC create two challan like this 24516 (qty 850) and 26819 (qty 1750)"
    // We will use the explicit prompt challenge: 
    // Challan no : 24516, date : 14 Feb 2026 qty : 850
    const challanA = await createChallan('24516', '2026-02-14T10:00:00Z', 850);
    
    // Challan no : 26819 : 16 Feb 2026 qty : 1750
    const challanB = await createChallan('26819', '2026-02-16T10:00:00Z', 1750);

    console.log(`Created Challan 24516 (Qty: 850) for Vendor 2`);
    console.log(`Created Challan 26819 (Qty: 1750) for Vendor 2`);

    console.log('\n--- E2E Flow Seed Complete ---');
    console.log('Now:');
    console.log('1. Playwright tests should log in as Vendor2 (vendor2@supplier.com)');
    console.log('   Create invoice total 1000 qty');
    console.log('   Expect: 850 allocated to 24516, 150 allocated to 26819');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
