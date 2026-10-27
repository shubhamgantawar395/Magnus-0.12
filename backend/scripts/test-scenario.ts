// @ts-nocheck

import { PrismaClient, UserRole, JobWorkType, POStatus, ChallanStatus, InvoiceStatus, InvoiceType, ProcessStatus, DispatchStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Test Scenario Simulation...');

    // 1. Find Organization
    const orgName = 'Seinumero';
    let org = await prisma.organization.findFirst({ where: { name: { contains: orgName, mode: 'insensitive' } } });

    if (!org) {
        console.error(`❌ Organization '${orgName}' not found! Please ensure it exists.`);
        console.log(`⚠️ Creating '${orgName}'...`);
        org = await prisma.organization.create({
            data: {
                name: orgName,
                code: 'SEI001',
                subscriptionTier: 'enterprise'
            }
        });
    }
    console.log(`✅ Organization: ${org.name} (${org.id})`);

    // 2. Create/Update Users
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const users = [
        { email: 'ppc@seinumero.com', role: UserRole.ppc_manager, first: 'PPC', last: 'Manager' },
        { email: 'production@seinumero.com', role: UserRole.production_manager, first: 'Production', last: 'Manager' },
        { email: 'executive@seinumero.com', role: UserRole.executive, first: 'Seinumero', last: 'Executive' }, // Already exists, but upsert ensures
    ];

    for (const u of users) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: { role: u.role, organizationId: org.id },
            create: {
                email: u.email,
                passwordHash: hashedPassword,
                firstName: u.first,
                lastName: u.last,
                role: u.role,
                organizationId: org.id,
                isActive: true,
                isEmailVerified: true,
            },
        });
        console.log(`✅ User ensured: ${u.email} (${u.role})`);
    }

    // Get User IDs for relations
    const ppcUser = await prisma.user.findUnique({ where: { email: 'ppc@seinumero.com' } });
    const productionUser = await prisma.user.findUnique({ where: { email: 'production@seinumero.com' } });
    const executiveUser = await prisma.user.findUnique({ where: { email: 'executive@seinumero.com' } });

    // 3. Create Vendor
    const vendorName = 'Aaniryat Overseas Pvt Limited';
    const vendorCode = 'AANIRYAT001';

    const vendor = await prisma.vendor.upsert({
        where: { vendorCode },
        update: {
            organizationId: org.id,
            status: 'approved',
            isActive: true
        },
        create: {
            companyName: vendorName,
            vendorCode,
            organizationId: org.id,
            email: 'info@aaniryat.com',
            status: 'approved',
            isActive: true,
            address: 'Plot 123, Industrial Area',
            city: 'Pune',
            state: 'Maharashtra',
            gstin: '27AANIRYAT1234Z1'
        }
    });
    console.log(`✅ Vendor: ${vendor.companyName} (${vendor.id})`);

    // 4. Create Vendor Users
    const vendorUsers = [
        { email: 'owner@aaniryat.com', role: UserRole.vendor, first: 'Owner', last: 'Aaniryat' },
        { email: 'supervisor@aaniryat.com', role: UserRole.vendor_user, first: 'Supervisor', last: 'Aaniryat' },
    ];

    for (const u of vendorUsers) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: { role: u.role, vendorId: vendor.id, organizationId: org.id },
            create: {
                email: u.email,
                passwordHash: hashedPassword,
                firstName: u.first,
                lastName: u.last,
                role: u.role,
                vendorId: vendor.id, // Important: Link to vendor
                organizationId: org.id,
                isActive: true,
                isEmailVerified: true,
            },
        });
        console.log(`✅ Vendor User ensured: ${u.email}`);
    }

    // 5. Create Parts (Finished and Raw Material)
    const partsData = [
        { number: '16705', name: 'Rotor hub', rate: 85, ops: ['Turning', 'Broaching'] },
        { number: '16708', name: 'Collar', rate: 50, ops: ['Turning', 'Hardening'] },
        { number: '10010', name: 'Nissan flange', rate: 60, ops: ['Turning', 'VMC'] },
    ];

    const createdParts = [];

    for (const p of partsData) {
        // Basic Finished Part
        const part = await prisma.part.upsert({
            where: { organizationId_partNumber: { organizationId: org.id, partNumber: p.number } },
            update: {},
            create: {
                organizationId: org.id,
                partNumber: p.number,
                partName: p.name,
                description: `${p.name} - Finished`,
                unitOfMeasure: 'NOS',
            }
        });
        createdParts.push(part);
        console.log(`✅ Part: ${part.partNumber}`);

        // Raw Material Part (assuming checking inventory for these happens elsewhere, but we need them for challans)
        const rmNumber = `${p.number}-RM`;
        await prisma.part.upsert({
            where: { organizationId_partNumber: { organizationId: org.id, partNumber: rmNumber } },
            update: {},
            create: {
                organizationId: org.id,
                partNumber: rmNumber,
                partName: `${p.name} (Raw)`,
                description: `Raw Material for ${p.name}`,
                unitOfMeasure: 'NOS',
            }
        });
    }

    // 6. WORKFLOW SIMULATION

    // A. Create Purchase Order (PPC)
    console.log('\n🔄 Simulating PPC: Creating Purchase Order...');
    const poNumber = `PO/TEST/${Date.now().toString().slice(-4)}`;
    const po = await prisma.purchaseOrder.create({
        data: {
            organization: { connect: { id: org.id } },
            vendor: { connect: { id: vendor.id } },
            poNumber: poNumber,
            poDate: new Date(),
            jobWorkType: JobWorkType.with_material,
            status: POStatus.approved, // Auto-approve for test
            createdBy: { connect: { id: ppcUser.id } },
            approvedBy: { connect: { id: executiveUser.id } }, // Executive approves
            subtotal: 19500, // Approx (100 * 85 + ...)
            totalAmount: 19500, // Ignoring tax for simplicity
            items: {
                create: partsData.map(p => ({
                    partNumber: p.number,
                    partDescription: p.name,
                    quantity: 100, // Order 100 of each
                    ratePerPiece: p.rate,
                    amount: 100 * p.rate,
                    operations: p.ops
                }))
            }
        },
        include: { items: true }
    });
    console.log(`✅ PO Created & Approved: ${po.poNumber}`);

    // B. Create Delivery Challan (PPC sends material)
    console.log('\n🔄 Simulating PPC: Sending Material (Delivery Challan)...');
    const challanNumber = `DC/TEST/${Date.now().toString().slice(-4)}`;
    const challan = await prisma.deliveryChallan.create({
        data: {
            organization: { connect: { id: org.id } },
            vendor: { connect: { id: vendor.id } },
            challanNumber: challanNumber,
            challanDate: new Date(),
            status: ChallanStatus.issued,
            totalQuantity: 300,
            jobWorkType: JobWorkType.with_material,
            purchaseOrder: { connect: { id: po.id } },
            createdBy: { connect: { id: ppcUser.id } },
            items: {
                create: po.items.map(poItem => ({
                    partNumber: `${poItem.partNumber}-RM`,
                    partDescription: `Raw Material for ${poItem.partDescription}`,
                    quantityIssued: poItem.quantity,
                    poItemId: poItem.id
                }))
            },
            customer: {
                connectOrCreate: {
                    where: { code: 'INTERNAL_USE' },
                    create: {
                        organizationId: org.id,
                        companyName: 'Seinumero Internal',
                        code: 'INTERNAL_USE'
                    }
                }
            }
        },
        include: { items: true }
    });
    console.log(`✅ Challan Issued: ${challan.challanNumber} (Sent 300 Raw Materials)`);

    // C. JOB PROCESSES (Vendor receives and starts work)
    // Create Job Processes for Challan Items
    console.log('\n🔄 Simulating Vendor: Receiving & Processing Material...');

    const processesToCreate = [];
    for (const item of challan.items) {
        // Assume all received are processed
        // For 'Finished Goods' logic, we need completed processes.
        // Let's mark 80 completed, 10 rejected, 10 in progress for realistic variance

        processesToCreate.push(prisma.jobProcess.create({
            data: {
                challanItem: { connect: { id: item.id } },
                processName: 'Machining', // Generic process
                processType: 'Turning',
                processSequence: 1,
                status: ProcessStatus.completed,
                targetQuantity: item.quantityIssued,
                completedQuantity: 80,
                rejectedQuantity: 10,
                reworkQuantity: 0,
                completedAt: new Date(), // Completed today for 'Jobs Today' stat
                startedAt: new Date()
            }
        }));
    }
    await Promise.all(processesToCreate);
    console.log(`✅ Job Processes Created (80 Completed, 10 Rejected per item)`);

    // D. Dispatch Plan (Vendor plans to send back Finished Goods)
    console.log('\n🔄 Simulating Vendor: Planning Dispatch...');
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 2); // Planned for 2 days later

    const dispatchPlan = await prisma.dispatchPlan.create({
        data: {
            customer: { connect: { id: challan.customerId } }, // Sending back to 'Internal' customer used on Challan
            vendor: { connect: { id: vendor.id } },
            plannedDate: deliveryDate,
            status: DispatchStatus.planned,
            totalTrays: 10,
            createdBy: { connect: { id: vendorUsers[0].email === 'owner@aaniryat.com' ? (await prisma.user.findUnique({ where: { email: 'owner@aaniryat.com' } })).id : users[2].id } }, // Created by Owner
            // Note: DispatchPlan usually links items, but simplistically here
            items: {
                create: challan.items.map(item => ({
                    challanItem: { connect: { id: item.id } },
                    quantityDispatched: 80 // Planning to dispatch all completed
                }))
            }
        }
    });
    console.log(`✅ Dispatch Plan Created for ${deliveryDate.toDateString()} (Status: Planned)`);

    // E. Vendor Invoice (Vendor completes work and bills)
    console.log('\n🔄 Simulating Vendor: Creating Job Work Invoice...');
    const invoiceNumber = `INV/${Math.floor(Math.random() * 1000)}`;

    const vendorInvoice = await prisma.vendorInvoice.create({
        data: {
            vendor: { connect: { id: vendor.id } },
            customer: { connect: { id: challan.customerId } },
            invoiceNumber,
            invoiceDate: new Date(),
            status: InvoiceStatus.submitted,
            subtotal: po.totalAmount, // Billing the labour charges (rates from PO)
            totalAmount: po.totalAmount,
            balanceAmount: po.totalAmount,
            purchaseOrder: { connect: { id: po.id } }, // Link to PO
            items: {
                create: challan.items.map((cItem, index) => {
                    const targetPart = cItem.partNumber.replace('-RM', '');
                    const poItem = po.items.find(pi => pi.partNumber === targetPart);
                    const rate = poItem ? poItem.ratePerPiece : 0;

                    return {
                        partNumber: targetPart,
                        partDescription: poItem?.partDescription,
                        challanItemId: cItem.id,
                        challanQuantity: cItem.quantityIssued,
                        invoiceQuantity: 80, // Invoicing for completed qty
                        unitPrice: rate,
                        amount: 80 * rate,
                        totalAmount: 80 * rate
                    };
                })
            }

        }
    });

    console.log(`✅ Vendor Invoice Created: ${vendorInvoice.invoiceNumber} (Amount: ${vendorInvoice.totalAmount})`);
    console.log('✅ Workflow Simulation Complete. Data is ready for Dashboard verification.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
