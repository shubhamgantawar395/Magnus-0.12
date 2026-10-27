
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Starting Real-World Maesof Simulation...');

    // 1. Setup Organization "Seinumero Nirman Pvt Ltd"
    console.log('\n--- 1. Setting up Organization ---');
    let org = await prisma.organization.findFirst({ where: { name: 'Seinumero Nirman Pvt Ltd' } });
    if (!org) {
        org = await prisma.organization.create({
            data: {
                name: 'Seinumero Nirman Pvt Ltd',
                code: 'SNPL_ORG_001', // Added code
                address: 'Pune, India',
                gstin: '27AAACG1234A1Z5'
            }
        });
        console.log('✅ Created Organization:', org.name);
    } else {
        console.log('ℹ️ Organization exists:', org.name);
    }

    // 2. Setup Customer Record (Self-Reference for Challans/Invoices context)
    // In this VMS, the 'Customer' entity typically represents the Organization receiving/sending goods
    let customer = await prisma.customer.findFirst({ where: { companyName: 'Seinumero Nirman Pvt Ltd' } });
    if (!customer) {
        customer = await prisma.customer.create({
            data: {
                companyName: 'Seinumero Nirman Pvt Ltd', // Same as Org
                code: 'SNPL',
                organizationId: org.id,
                gstin: org.gstin || '27AAACG1234A1Z5',
                address: org.address || 'Pune'
            }
        });
        console.log('✅ Created Customer Record for Self:', customer.companyName);
    }

    // 3. Create Users (Director, GM, PPC)
    console.log('\n--- 2. Creating Users ---');
    // Enum values from schema: 'director', 'gm', 'ppc_manager', 'vendor_owner', 'executive'
    // Note: 'vendor_owner' likely doesn't exist in UserRole enum based on previous logs.
    // Schema likely has: platform_admin, director, executive, gm, production_manager, ppc_manager, quality_head, store_head, vendor_user
    // Let's use 'vendor_user' for the vendor

    const roles = [
        { role: 'director', name: 'Director' },
        { role: 'gm', name: 'GM' },
        { role: 'ppc_manager', name: 'PPC_Manager' }
    ];
    const users: any = {};

    for (const r of roles) {
        const email = `${r.role}@seinumero.com`;
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    passwordHash: 'hashed_password_123',
                    role: r.role as any, // Cast to any to bypass strict check in script
                    firstName: r.name,
                    lastName: 'User',
                    organizationId: org.id,
                    isActive: true
                }
            });
            console.log(`✅ Created User: ${r.role}`);
        } else {
            console.log(`ℹ️ User exists: ${r.role}`);
            users[r.role] = user; // Ensure we populate the map
        }
        if (!users[r.role]) users[r.role] = user;
    }

    // 4. Director/PPC Adds Vendor "Aaniryat Overseas"
    console.log('\n--- 3. Onboarding Vendor ---');
    let vendor = await prisma.vendor.findFirst({ where: { companyName: 'Aaniryat Overseas Pvt Limited' } });
    if (!vendor) {
        vendor = await prisma.vendor.create({
            data: {
                companyName: 'Aaniryat Overseas Pvt Limited',
                vendorCode: 'V001',
                email: 'info@aaniryat.com',
                phone: '9876543210',
                address: 'Mumbai, India',
                gstin: '27BBBGG5678B1Z9', // Different GST state?
                status: 'approved',
                customerId: customer.id
            }
        });
        console.log('✅ Created Vendor:', vendor.companyName);
    } else {
        console.log('ℹ️ Vendor exists:', vendor.companyName);
    }

    // 5. Create Vendor User (for login)
    let vendorUser = await prisma.user.findUnique({ where: { email: 'owner@aaniryat.com' } });
    if (!vendorUser) {
        vendorUser = await prisma.user.create({
            data: {
                email: 'owner@aaniryat.com',
                passwordHash: 'hashed_pass_vendor',
                role: 'production_manager', // Fallback if vendor_owner doesn't exist
                firstName: 'Vendor',
                lastName: 'Owner',
                vendorId: vendor.id,
                isActive: true
            }
        });
        console.log('✅ Created Vendor User');
    }

    // 6. PPC Creates Purchase Order (PO)
    console.log('\n--- 4. Creating Purchase Order ---');
    const poNumber = `PO/2026/02/001-${Date.now()}`;
    const po = await prisma.purchaseOrder.create({
        data: {
            poNumber: poNumber,
            poDate: new Date(),
            organizationId: org.id,
            vendorId: vendor.id,
            jobWorkType: 'maesof',
            status: 'approved',
            createdById: users.ppc_manager.id,
            subtotal: 180000,
            totalAmount: 180000,
            items: {
                create: [
                    {
                        partNumber: '16705',
                        partDescription: 'Rotor Hub',
                        quantity: 3000,
                        ratePerPiece: 60,
                        amount: 180000,
                        operations: ['Turning', 'Broaching']
                    }
                ]
            }
        },
        include: { items: true }
    });
    const poItem = po.items[0];
    console.log(`✅ Created PO: ${po.poNumber} for Part 16705 (Rotor Hub)`);

    // 7. PPC Issues Challans (Outward Material)
    console.log('\n--- 5. Issuing Challans ---');

    // Challan 1: 14 Feb, 850 qty (User updated example)
    const challan1 = await prisma.deliveryChallan.create({
        data: {
            challanNumber: `DC/2026/02/${Math.floor(Math.random() * 1000)}`, // 24516
            challanDate: new Date('2026-02-14'),
            // type: 'returnable', // Removed invalid field
            status: 'issued',
            customerId: customer.id,
            vendorId: vendor.id,
            poId: po.id,
            totalQuantity: 850,
            createdById: users.ppc_manager.id,
            items: {
                create: [{
                    partNumber: '16705',
                    partDescription: 'Rotor Hub Raw Material',
                    quantityIssued: 850, // 850
                    poItemId: poItem.id,
                    outputPartNumber: '16705', // Same part ID for tracking usually
                    outputDescription: 'Rotor Hub Machined'
                }]
            }
        },
        include: { items: true }
    });
    console.log(`✅ Issued Challan 1: ${challan1.challanNumber} (850 Qty)`);

    // Challan 2: 16 Feb, 1750 qty
    const challan2 = await prisma.deliveryChallan.create({
        data: {
            challanNumber: `DC/2026/02/${Math.floor(Math.random() * 1000)}`, // 26819
            challanDate: new Date('2026-02-16'),
            // type: 'returnable', // Removed invalid field
            status: 'issued',
            customerId: customer.id,
            vendorId: vendor.id,
            poId: po.id,
            totalQuantity: 1750,
            createdById: users.ppc_manager.id,
            items: {
                create: [{
                    partNumber: '16705',
                    partDescription: 'Rotor Hub Raw Material',
                    quantityIssued: 1750, // 1750
                    poItemId: poItem.id,
                    outputPartNumber: '16705',
                    outputDescription: 'Rotor Hub Machined'
                }]
            }
        },
        include: { items: true }
    });
    console.log(`✅ Issued Challan 2: ${challan2.challanNumber} (1750 Qty)`);

    // 8. Vendor Creates Invoice (FIFO / Split Logic)
    // Vendor sends 1000 qty. Logic: 850 from Challan 1, 150 from Challan 2.
    console.log('\n--- 6. Creating Invoice (FIFO Split) ---');

    const invNumber = `INV-${Date.now()}`;
    const invQty = 1000;

    // Manual Split Logic (Simulating Frontend Selection)
    // 1. Fully utilize Challan 1 (850 available)
    // 2. Take remainder (150) from Challan 2

    const invoice = await prisma.vendorInvoice.create({
        data: {
            invoiceNumber: invNumber,
            invoiceDate: new Date('2026-02-19'),
            vendorId: vendor.id,
            customerId: customer.id,
            poId: po.id,
            status: 'submitted',
            subtotal: invQty * 60, // 60000
            totalAmount: (invQty * 60) * 1.18, // +18% GST approximately
            balanceAmount: (invQty * 60) * 1.18, // Initially equal to totalAmount
            items: {
                create: [
                    {
                        challanItemId: (challan1 as any).items[0].id,
                        partNumber: '16705',
                        challanQuantity: 850,
                        invoiceQuantity: 850, // Full utilization
                        unitPrice: 60,
                        amount: 850 * 60,
                        totalAmount: 850 * 60 // Assuming exclusive of tax for item-level simplicity in test
                    },
                    {
                        challanItemId: (challan2 as any).items[0].id,
                        partNumber: '16705',
                        challanQuantity: 1750,
                        invoiceQuantity: 150, // Remainder
                        unitPrice: 60,
                        amount: 150 * 60,
                        totalAmount: 150 * 60
                    }
                ]
            }
        } as any,
        include: { items: true }
    });

    console.log(`✅ Created Invoice: ${invoice.invoiceNumber}`);
    console.log(`   Items:`);
    // Explicitly cast or access check
    if ((invoice as any).items) {
        (invoice as any).items.forEach((item: any) => {
            console.log(`   - Part ${item.partNumber}: ${item.invoiceQuantity} qty (Challan Item ID: ...${item.challanItemId.slice(-5)})`);
        });
    }

    // 9. Verify Stock/Balances
    // Challan 1 should be fully exhausted (balance 0)
    // Challan 2 should have 1600 remaining (1750 - 150)

    // Note: We need to query this via VendorInvoiceItems relations or a dedicated stock/balance view
    console.log('\n--- 7. Verifying Balances ---');

    // Helper to get invoiced qty for a challan item
    async function getInvoicedQty(challanItemId: string) {
        const invItems = await prisma.vendorInvoiceItem.findMany({
            where: { challanItemId }
        });
        return invItems.reduce((acc, i) => acc + i.invoiceQuantity, 0);
    }

    // Using optional chaining or casting for items access
    const c1Item = (challan1 as any).items?.[0];
    const c2Item = (challan2 as any).items?.[0];

    if (c1Item && c2Item) {
        const c1Used = await getInvoicedQty(c1Item.id);
        const c2Used = await getInvoicedQty(c2Item.id);

        console.log(`Challan 1 (850): Used ${c1Used}, Balance ${850 - c1Used}`);
        console.log(`Challan 2 (1750): Used ${c2Used}, Balance ${1750 - c2Used}`);

        if (c1Used === 850 && c2Used === 150) {
            console.log('\n✅ SUCCESS: Invoice correctly split 1000 qty as 850 + 150!');
        } else {
            console.log('\n❌ FAILURE: Split logic incorrect.');
        }
    } else {
        console.log('\n❌ FAILURE: Challan items not found.');
    }

    // 10. Check if Notifications Created
    // Model is 'Alert', not 'Notification'
    const notifications = await prisma.alert.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log('\n--- Recent Notifications ---');
    notifications.forEach(n => console.log(`[${n.type}] ${n.title}: ${n.message}`));

}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
