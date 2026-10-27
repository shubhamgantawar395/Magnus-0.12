import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed with real-world data...\n');

    // 1. Create Organization
    console.log('📦 Creating organization...');
    const org = await prisma.organization.upsert({
        where: { code: 'AANIRY001' },
        update: {},
        create: {
            name: 'Aaniry Manufacturing Pvt Ltd',
            code: 'AANIRY001',
            gstin: '27AANIR1234F1Z5',
            pan: 'AANIR1234F',
            address: '123 Industrial Area, Phase 2',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560045',
            contactPerson: 'Rajesh Kumar',
            contactEmail: 'contact@aaniry.com',
            contactPhone: '+91-9876543210',
            subscriptionTier: 'enterprise',
            subscriptionStatus: 'active',
            subscriptionStartDate: new Date(),
            maxUsers: 100,
            maxVendors: 500,
            maxChallansPerMonth: 10000
        }
    });
    console.log(`✅ Organization: ${org.name}\n`);

    // 2. Create Users with Hierarchy
    console.log('👥 Creating users...');

    const director = await prisma.user.upsert({
        where: { email: 'director@aaniry.com' },
        update: {},
        create: {
            email: 'director@aaniry.com',
            passwordHash: await bcrypt.hash('director123', 12),
            role: 'director',
            department: 'executive',
            firstName: 'Ramesh',
            lastName: 'Sharma',
            designation: 'Director',
            organizationId: org.id,
            isActive: true,
            isEmailVerified: true
        }
    });

    const gm = await prisma.user.upsert({
        where: { email: 'gm@aaniry.com' },
        update: {},
        create: {
            email: 'gm@aaniry.com',
            passwordHash: await bcrypt.hash('gm123', 12),
            role: 'gm',
            department: 'executive',
            firstName: 'Suresh',
            lastName: 'Patel',
            designation: 'General Manager',
            organizationId: org.id,
            reportsToId: director.id,
            isActive: true,
            isEmailVerified: true
        }
    });

    const pm = await prisma.user.upsert({
        where: { email: 'pm@aaniry.com' },
        update: {},
        create: {
            email: 'pm@aaniry.com',
            passwordHash: await bcrypt.hash('pm123', 12),
            role: 'production_manager',
            department: 'production',
            firstName: 'Amit',
            lastName: 'Verma',
            designation: 'Production Manager',
            organizationId: org.id,
            reportsToId: gm.id,
            isActive: true,
            isEmailVerified: true
        }
    });

    const ppc = await prisma.user.upsert({
        where: { email: 'ppc@aaniry.com' },
        update: {},
        create: {
            email: 'ppc@aaniry.com',
            passwordHash: await bcrypt.hash('ppc123', 12),
            role: 'ppc_manager',
            department: 'planning',
            firstName: 'Priya',
            lastName: 'Singh',
            designation: 'PPC Manager',
            organizationId: org.id,
            reportsToId: gm.id,
            isActive: true,
            isEmailVerified: true
        }
    });

    const quality = await prisma.user.upsert({
        where: { email: 'quality@aaniry.com' },
        update: {},
        create: {
            email: 'quality@aaniry.com',
            passwordHash: await bcrypt.hash('quality123', 12),
            role: 'quality_head',
            department: 'quality',
            firstName: 'Vikram',
            lastName: 'Reddy',
            designation: 'Quality Head',
            organizationId: org.id,
            reportsToId: gm.id,
            isActive: true,
            isEmailVerified: true
        }
    });

    console.log(`✅ Created 5 users with hierarchy\n`);

    // 3. Create End Customers (Aaniry's customers)
    console.log('🏢 Creating end customers...');

    const eaton = await prisma.endCustomer.create({
        data: {
            organizationId: org.id,
            name: 'Eaton Corporation',
            code: 'EATON001',
            contactPerson: 'John Smith',
            email: 'john.smith@eaton.com',
            phone: '+1-555-0100',
            address: '1000 Eaton Boulevard',
            city: 'Cleveland',
            state: 'Ohio',
            gstin: '27EATON1234F1Z5'
        }
    });

    const tata = await prisma.endCustomer.create({
        data: {
            organizationId: org.id,
            name: 'Tata Motors Limited',
            code: 'TATA001',
            contactPerson: 'Ravi Kumar',
            email: 'ravi.kumar@tatamotors.com',
            phone: '+91-22-66657777',
            address: 'Bombay House, 24 Homi Mody Street',
            city: 'Mumbai',
            state: 'Maharashtra',
            gstin: '27TATA001234F1Z5'
        }
    });

    console.log(`✅ Created 2 end customers\n`);

    // 4. Create Parts
    console.log('🔧 Creating parts...');

    const part1 = await prisma.part.create({
        data: {
            organizationId: org.id,
            endCustomerId: eaton.id,
            partNumber: 'EATON-GS-001',
            partName: 'Gear Shaft',
            description: 'Precision gear shaft for hydraulic pump',
            drawingNumber: 'DWG-EATON-001',
            revision: 'Rev C',
            materialGrade: 'EN24',
            hsnCode: '84831090',
            unitOfMeasure: 'NOS',
            weight: 2.5,
            operations: [
                { seq: 1, operation: 'Turning', vendorId: null },
                { seq: 2, operation: 'Milling', vendorId: null },
                { seq: 3, operation: 'Grinding', vendorId: null }
            ],
            currentStatus: 'In Production'
        }
    });

    const part2 = await prisma.part.create({
        data: {
            organizationId: org.id,
            endCustomerId: tata.id,
            partNumber: 'TATA-BRG-001',
            partName: 'Bearing Housing',
            description: 'Bearing housing for transmission assembly',
            drawingNumber: 'DWG-TATA-001',
            revision: 'Rev B',
            materialGrade: 'Cast Iron GG25',
            hsnCode: '84831090',
            unitOfMeasure: 'NOS',
            weight: 5.2,
            operations: [
                { seq: 1, operation: 'Casting', vendorId: null },
                { seq: 2, operation: 'Machining', vendorId: null }
            ],
            currentStatus: 'In Production'
        }
    });

    console.log(`✅ Created 2 parts\n`);

    // 5. Create Vendors
    console.log('🏭 Creating vendors...');

    const vendor1 = await prisma.vendor.create({
        data: {
            organizationId: org.id,
            companyName: 'ABC Precision Machining Pvt Ltd',
            vendorCode: 'V001',
            contactPerson: 'Mahesh Gupta',
            email: 'mahesh@abcmachining.com',
            phone: '+91-9876543211',
            address: 'Plot 45, Industrial Estate',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411019',
            gstin: '27ABCPM1234F1Z5',
            pan: 'ABCPM1234F',
            status: 'approved',
            approvedById: ppc.id,
            approvedAt: new Date(),
            isActive: true
        }
    });

    const vendor2 = await prisma.vendor.create({
        data: {
            organizationId: org.id,
            companyName: 'XYZ Engineering Works',
            vendorCode: 'V002',
            contactPerson: 'Rajesh Nair',
            email: 'rajesh@xyzengineering.com',
            phone: '+91-9876543212',
            address: '12/A, MIDC Area',
            city: 'Nashik',
            state: 'Maharashtra',
            pincode: '422010',
            gstin: '27XYZEW1234F1Z5',
            pan: 'XYZEW1234F',
            status: 'approved',
            approvedById: ppc.id,
            approvedAt: new Date(),
            isActive: true
        }
    });

    console.log(`✅ Created 2 vendors\n`);

    // 6. Create Vendor Rate Cards
    console.log('💰 Creating vendor rate cards...');

    await prisma.vendorRateCard.createMany({
        data: [
            {
                vendorId: vendor1.id,
                operationType: 'Turning',
                rateType: 'per_piece',
                baseRate: 10.50,
                minimumCharge: 500,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                isActive: true
            },
            {
                vendorId: vendor1.id,
                operationType: 'Milling',
                rateType: 'per_piece',
                baseRate: 15.75,
                minimumCharge: 750,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                isActive: true
            },
            {
                vendorId: vendor2.id,
                operationType: 'Grinding',
                rateType: 'per_piece',
                baseRate: 8.25,
                minimumCharge: 400,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                isActive: true
            }
        ]
    });

    console.log(`✅ Created 3 rate cards\n`);

    // 7. Create Vendor Quotation
    console.log('📄 Creating vendor quotation...');

    const quotation = await prisma.vendorQuotation.create({
        data: {
            quotationNumber: 'QT/2026/02/001',
            quotationDate: new Date(),
            organizationId: org.id,
            vendorId: vendor1.id,
            rfqNumber: 'RFQ/2026/02/001',
            rfqDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            items: [
                {
                    partNumber: 'EATON-GS-001',
                    partName: 'Gear Shaft',
                    quantity: 1000,
                    operation: 'Turning',
                    ratePerPiece: 10.50,
                    amount: 10500
                }
            ],
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
            paymentTerms: '30 days from delivery',
            deliveryTerms: 'Ex-works',
            status: 'accepted',
            acceptedById: ppc.id,
            acceptedAt: new Date()
        }
    });

    console.log(`✅ Created quotation: ${quotation.quotationNumber}\n`);

    // 8. Create Purchase Order
    console.log('📋 Creating purchase order...');

    const po = await prisma.purchaseOrder.create({
        data: {
            poNumber: 'PO/2026/02/001',
            poDate: new Date(),
            organizationId: org.id,
            vendorId: vendor1.id,
            quotationId: quotation.id,
            jobWorkType: 'maesof',
            deliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            deliveryAddress: org.address,
            paymentTerms: '30 days from delivery',
            advancePayment: 0,
            subtotal: 10500,
            cgst: 945, // 9%
            sgst: 945, // 9%
            igst: 0,
            totalAmount: 12390,
            status: 'approved',
            createdById: ppc.id,
            approvedById: gm.id,
            approvedAt: new Date(),
            termsAndConditions: 'Standard terms and conditions apply',
            items: {
                create: [{
                    partNumber: 'EATON-GS-001',
                    partDescription: 'Gear Shaft - Precision machined',
                    hsnCode: '84831090',
                    drawingNumber: 'DWG-EATON-001',
                    quantity: 1000,
                    unitOfMeasure: 'NOS',
                    operations: ['Turning'],
                    ratePerPiece: 10.50,
                    amount: 10500,
                    deliverySchedule: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }]
            }
        }
    });

    console.log(`✅ Created PO: ${po.poNumber}\n`);

    // 9. Create Vehicle Dispatch
    console.log('🚚 Creating vehicle dispatch...');

    const dispatch = await prisma.vehicleDispatch.create({
        data: {
            organizationId: org.id,
            vehicleNumber: 'MH-12-AB-1234',
            driverName: 'Ramesh Kumar',
            driverPhone: '+91-9876543213',
            dispatchDate: new Date(),
            plannedBy: ppc.id,
            route: [
                {
                    stop: 1,
                    vendorId: vendor1.id,
                    vendorName: 'ABC Precision Machining',
                    action: 'pickup',
                    pickupTime: '10:00',
                    parts: ['EATON-GS-001'],
                    estimatedQty: 500
                },
                {
                    stop: 2,
                    vendorId: vendor2.id,
                    vendorName: 'XYZ Engineering Works',
                    action: 'pickup',
                    pickupTime: '14:00',
                    parts: ['TATA-BRG-001'],
                    estimatedQty: 200
                }
            ],
            status: 'planned'
        }
    });

    console.log(`✅ Created vehicle dispatch: ${dispatch.vehicleNumber}\n`);

    // 10. Create Alerts
    console.log('🔔 Creating sample alerts...');

    await prisma.alert.createMany({
        data: [
            {
                organizationId: org.id,
                type: 'job_overdue',
                severity: 'high',
                title: 'PO Overdue',
                message: `PO ${po.poNumber} is overdue by 2 days`,
                entityType: 'PurchaseOrder',
                entityId: po.id,
                recipientIds: [ppc.id, pm.id, gm.id],
                actionRequired: true,
                actionUrl: `/purchase-orders/${po.id}`
            },
            {
                organizationId: org.id,
                type: 'vehicle_ready',
                severity: 'medium',
                title: 'Vehicle Ready for Dispatch',
                message: `Vehicle ${dispatch.vehicleNumber} ready for dispatch - 2 vendor pickups`,
                entityType: 'VehicleDispatch',
                entityId: dispatch.id,
                recipientIds: [ppc.id],
                actionRequired: false,
                actionUrl: `/dispatches/${dispatch.id}`
            }
        ]
    });

    console.log(`✅ Created 2 alerts\n`);

    console.log('✅ Seed completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Organization: ${org.name}`);
    console.log(`   - Users: 5 (Director, GM, PM, PPC, Quality)`);
    console.log(`   - End Customers: 2 (Eaton, Tata)`);
    console.log(`   - Parts: 2`);
    console.log(`   - Vendors: 2`);
    console.log(`   - Rate Cards: 3`);
    console.log(`   - Quotation: 1`);
    console.log(`   - Purchase Order: 1`);
    console.log(`   - Vehicle Dispatch: 1`);
    console.log(`   - Alerts: 2`);
    console.log('\n🎉 Database is ready for testing!\n');
    console.log('📝 Login Credentials:');
    console.log('   Director: director@aaniry.com / director123');
    console.log('   GM: gm@aaniry.com / gm123');
    console.log('   PM: pm@aaniry.com / pm123');
    console.log('   PPC: ppc@aaniry.com / ppc123');
    console.log('   Quality: quality@aaniry.com / quality123');
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
