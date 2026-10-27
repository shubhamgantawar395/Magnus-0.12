/**
 * Comprehensive E2E seed for OrgA.
 * Run: npx ts-node seed-e2e.ts
 *
 * Creates:
 *   - 1 org (Org Alpha / ORGA)
 *   - Full user roster (admin, ppc, production, gm, security, store_keeper, qual, 2 vendor owners)
 *   - 4 vendors  (Alpha, Beta, Gamma, Delta)
 *   - 10 customers (Eaton, Proche, JCB, Danfoss, Bosch, Tata, Mahindra, Parker, ZF, Cummins)
 *   - 4–5 parts per customer → Part master (distinct parts with descriptions)
 *   - 3 issued delivery challans per customer (covering 3 vendors, varied parts)
 *   - Operation cycles (job processes) on each challan item
 *   - Monthly line-deadline targets for current month
 */

import { PrismaClient, UserRole, VendorStatus, ChallanStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PASSWORD = 'Test@1234';

// ── Part master ────────────────────────────────────────────────────────────────
const PARTS_MASTER = [
    // Eaton parts
    { pn: '16705', name: 'Rotor Hub Assembly', desc: 'Hydraulic motor rotor hub' },
    { pn: '16706', name: 'Valve Spool', desc: 'Directional control valve spool' },
    { pn: '16707', name: 'End Cap - Front', desc: 'Front end cap for motor housing' },
    { pn: '16708', name: 'Drive Shaft', desc: 'Splined drive shaft' },

    // Proche / Poclain parts
    { pn: '11568', name: 'Motor Casing', desc: 'Cast iron motor casing' },
    { pn: '11569', name: 'Piston Assembly', desc: 'Radial piston sub-assembly' },
    { pn: '11570', name: 'Port Plate', desc: 'Distribution port plate' },
    { pn: '11571', name: 'Brake Disc', desc: 'Multi-disc brake assembly' },

    // JCB parts
    { pn: '22100', name: 'Swing Motor Shaft', desc: 'Swing motor output shaft' },
    { pn: '22101', name: 'Gear Ring', desc: 'Planetary gear ring' },
    { pn: '22102', name: 'Sun Gear', desc: 'Planetary sun gear' },
    { pn: '22103', name: 'Planet Carrier', desc: 'Planetary carrier assembly' },

    // Danfoss parts
    { pn: '30210', name: 'Orbital Motor Body', desc: 'Cast motor body' },
    { pn: '30211', name: 'Rotor Set', desc: 'Gerotor rotor set' },
    { pn: '30212', name: 'Output Shaft Assy', desc: 'Keyed output shaft assembly' },
    { pn: '30213', name: 'End Cover', desc: 'Motor end cover' },
    { pn: '30214', name: 'Valve Plate', desc: 'Timing valve plate' },

    // Bosch parts
    { pn: '41050', name: 'Pump Housing', desc: 'Axial piston pump housing' },
    { pn: '41051', name: 'Swash Plate', desc: 'Variable swash plate' },
    { pn: '41052', name: 'Cylinder Block', desc: 'Nine-piston cylinder block' },
    { pn: '41053', name: 'Retainer Plate', desc: 'Piston retainer plate' },

    // Tata parts
    { pn: '52300', name: 'Hydraulic Cylinder Barrel', desc: 'Steering cylinder barrel' },
    { pn: '52301', name: 'Piston Rod', desc: 'Chrome piston rod' },
    { pn: '52302', name: 'Gland Nut', desc: 'Cylinder gland nut' },
    { pn: '52303', name: 'Sealing Kit', desc: 'Complete cylinder seal kit' },

    // Mahindra parts
    { pn: '63400', name: 'Power Steering Pump Body', desc: 'Power steering pump body' },
    { pn: '63401', name: 'Rotor Vane Set', desc: 'Vane pump rotor set' },
    { pn: '63402', name: 'Cam Ring', desc: 'Vane pump cam ring' },
    { pn: '63403', name: 'Side Plate', desc: 'Vane pump side plate' },

    // Parker parts
    { pn: '74500', name: 'Gear Pump Cover', desc: 'Aluminium gear pump cover' },
    { pn: '74501', name: 'Gear Set (Int/Ext)', desc: 'Internal/external gear set' },
    { pn: '74502', name: 'Shaft Seal Housing', desc: 'Shaft seal housing assembly' },
    { pn: '74503', name: 'Bearing Flange', desc: 'Pump bearing flange' },
    { pn: '74504', name: 'Bushing Set', desc: 'Journal bushing set' },

    // ZF parts
    { pn: '85600', name: 'Transmission Pump Casing', desc: 'Automatic transmission pump' },
    { pn: '85601', name: 'Stator Support', desc: 'Torque converter stator support' },
    { pn: '85602', name: 'Clutch Piston', desc: 'Hydraulic clutch piston' },
    { pn: '85603', name: 'Accumulator Spring', desc: 'Shift accumulator spring' },

    // Cummins parts
    { pn: '96700', name: 'Oil Pump Rotor', desc: 'Engine oil pump rotor' },
    { pn: '96701', name: 'Idler Gear', desc: 'Timing idler gear' },
    { pn: '96702', name: 'Fuel Pump Coupling', desc: 'Fuel injection pump coupling' },
    { pn: '96703', name: 'Turbo Scroll Housing', desc: 'Turbocharger scroll housing' },
];

// ── Customer → parts mapping ───────────────────────────────────────────────────
const CUSTOMERS = [
    { name: 'Eaton', code: 'EAT', gstin: 'GSTIN-EAT-001', city: 'Pune', parts: ['16705', '16706', '16707', '16708'] },
    { name: 'Proche', code: 'PRO', gstin: 'GSTIN-PRO-001', city: 'Pune', parts: ['11568', '11569', '11570', '11571'] },
    { name: 'JCB', code: 'JCB', gstin: 'GSTIN-JCB-001', city: 'Ballabgarh', parts: ['22100', '22101', '22102', '22103'] },
    { name: 'Danfoss', code: 'DAN', gstin: 'GSTIN-DAN-001', city: 'Mysore', parts: ['30210', '30211', '30212', '30213', '30214'] },
    { name: 'Bosch', code: 'BSH', gstin: 'GSTIN-BSH-001', city: 'Nashik', parts: ['41050', '41051', '41052', '41053'] },
    { name: 'Tata', code: 'TAT', gstin: 'GSTIN-TAT-001', city: 'Jamshedpur', parts: ['52300', '52301', '52302', '52303'] },
    { name: 'Mahindra', code: 'MAH', gstin: 'GSTIN-MAH-001', city: 'Kandivali', parts: ['63400', '63401', '63402', '63403'] },
    { name: 'Parker', code: 'PAR', gstin: 'GSTIN-PAR-001', city: 'Noida', parts: ['74500', '74501', '74502', '74503', '74504'] },
    { name: 'ZF', code: 'ZFR', gstin: 'GSTIN-ZFR-001', city: 'Chennai', parts: ['85600', '85601', '85602', '85603'] },
    { name: 'Cummins', code: 'CUM', gstin: 'GSTIN-CUM-001', city: 'Kothrud', parts: ['96700', '96701', '96702', '96703'] },
];

// Monthly targets per customer (current month): part → target qty
const MONTHLY_TARGETS: Record<string, Record<string, number>> = {
    EAT: { '16705': 8000, '16706': 5000, '16707': 4000, '16708': 3500 },
    PRO: { '11568': 6000, '11569': 4500, '11570': 3000, '11571': 2500 },
    JCB: { '22100': 7500, '22101': 5000, '22102': 5000, '22103': 4000 },
    DAN: { '30210': 10000, '30211': 8000, '30212': 6000, '30213': 5000, '30214': 4500 },
    BSH: { '41050': 5000, '41051': 4000, '41052': 4000, '41053': 3500 },
    TAT: { '52300': 3000, '52301': 3000, '52302': 2500, '52303': 2000 },
    MAH: { '63400': 8000, '63401': 6000, '63402': 6000, '63403': 5000 },
    PAR: { '74500': 4000, '74501': 3500, '74502': 3000, '74503': 3000, '74504': 2500 },
    ZFR: { '85600': 5500, '85601': 4000, '85602': 4000, '85603': 3000 },
    CUM: { '96700': 9000, '96701': 7000, '96702': 6000, '96703': 4000 },
};

const OPERATION_CYCLES = ['Turning', 'Milling', 'Grinding', 'Honing', 'Boring', 'Drilling', 'Boring', 'Inspection'];

function randomQty(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
    console.log('🌱 E2E Seeding Started...\n');
    const hash = await bcrypt.hash(PASSWORD, 12);
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // ── 1. Super Admin ──────────────────────────────────────────────────────────
    await prisma.user.upsert({
        where: { email: 'superadmin@aaniry.com' },
        update: { passwordHash: hash },
        create: {
            email: 'superadmin@aaniry.com', passwordHash: hash,
            firstName: 'Super', lastName: 'Admin',
            role: UserRole.platform_admin, isActive: true, isEmailVerified: true,
        },
    });
    console.log('✅ superadmin@aaniry.com');

    // ── 2. Org Alpha ────────────────────────────────────────────────────────────
    const orgA = await prisma.organization.upsert({
        where: { code: 'ORGA' },
        update: { name: 'Org Alpha', isActive: true },
        create: {
            name: 'Org Alpha', code: 'ORGA',
            subscriptionTier: 'enterprise', subscriptionStatus: 'active', isActive: true,
        },
    });
    console.log(`✅ Org Alpha [${orgA.id}]`);

    // ── 3. Org Users ────────────────────────────────────────────────────────────
    const orgUsers = [
        { email: 'admin@orgA.com', role: UserRole.admin, first: 'Org', last: 'Admin' },
        { email: 'tk@orgA.com', role: UserRole.gm, first: 'T', last: 'k' },
        { email: 'ppc@orgA.com', role: UserRole.ppc_manager, first: 'PPC', last: 'Manager' },
        { email: 'prod@orgA.com', role: UserRole.production_manager, first: 'Prod', last: 'Manager' },
        { email: 'qual@orgA.com', role: UserRole.executive, first: 'Quality', last: 'Head' },
        { email: 'store@orgA.com', role: UserRole.store_keeper, first: 'Store', last: 'Keeper' },
        { email: 'gate@orgA.com', role: UserRole.security, first: 'Gate', last: 'Keeper' },
    ];
    for (const u of orgUsers) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: { passwordHash: hash, organizationId: orgA.id, role: u.role, isActive: true },
            create: {
                email: u.email, passwordHash: hash,
                firstName: u.first, lastName: u.last,
                role: u.role, organizationId: orgA.id, isActive: true, isEmailVerified: true,
            },
        });
        console.log(`✅ ${u.email} [${u.role}]`);
    }

    // ── 4. Vendors ──────────────────────────────────────────────────────────────
    const vendorDefs = [
        { code: 'VENDA', name: 'Vendor Alpha', email: 'owner@vendorA.com', first: 'Vendor', last: 'Owner' },
        { code: 'VENDB', name: 'Vendor Beta', email: 'owner@vendorB.com', first: 'Beta', last: 'Owner' },
        { code: 'VENDC', name: 'Vendor Gamma', email: 'owner@vendorC.com', first: 'Gamma', last: 'Owner' },
        { code: 'VENDD', name: 'Vendor Delta', email: 'owner@vendorD.com', first: 'Delta', last: 'Owner' },
    ];
    const vendors: any[] = [];
    for (const vd of vendorDefs) {
        const v = await prisma.vendor.upsert({
            where: { vendorCode: vd.code },
            update: { companyName: vd.name, status: VendorStatus.approved, organizationId: orgA.id, isActive: true },
            create: {
                companyName: vd.name, vendorCode: vd.code,
                status: VendorStatus.approved, organizationId: orgA.id, isActive: true,
            },
        });
        vendors.push(v);
        await prisma.user.upsert({
            where: { email: vd.email },
            update: { passwordHash: hash, vendorId: v.id, role: UserRole.vendor_owner, organizationId: orgA.id, isActive: true },
            create: {
                email: vd.email, passwordHash: hash,
                firstName: vd.first, lastName: vd.last,
                role: UserRole.vendor_owner, vendorId: v.id, organizationId: orgA.id,
                isActive: true, isEmailVerified: true,
            },
        });
        console.log(`✅ ${vd.name} + ${vd.email}`);
    }

    // ── 5. Part Master ──────────────────────────────────────────────────────────
    const partRecords: Record<string, any> = {};
    for (const p of PARTS_MASTER) {
        const existing = await prisma.part.findFirst({
            where: { partNumber: p.pn, organizationId: orgA.id },
        });
        const part = existing
            ? await prisma.part.update({ where: { id: existing.id }, data: { partName: p.name, isActive: true } })
            : await prisma.part.create({
                data: { partNumber: p.pn, partName: p.name, organizationId: orgA.id, isActive: true },
            });
        partRecords[p.pn] = part;
    }
    console.log(`\n✅ ${PARTS_MASTER.length} parts seeded in Part master`);

    // ── 6. Customers ────────────────────────────────────────────────────────────
    const customerRecords: Record<string, any> = {};
    for (const cd of CUSTOMERS) {
        const existing = await prisma.customer.findFirst({
            where: { code: cd.code, organizationId: orgA.id },
        });
        let customer: any;
        if (existing) {
            customer = await prisma.customer.update({
                where: { id: existing.id },
                data: { companyName: cd.name, isActive: true },
            });
        } else {
            // Find the existing admin user for createdBy
            const adminUser = await prisma.user.findUnique({ where: { email: 'admin@orgA.com' } });
            customer = await prisma.customer.create({
                data: {
                    companyName: cd.name, code: cd.code, gstin: cd.gstin,
                    city: cd.city, state: 'Maharashtra',
                    organizationId: orgA.id, isActive: true,
                    createdById: adminUser?.id,
                },
            });
        }
        customerRecords[cd.code] = customer;
        console.log(`✅ Customer: ${cd.name} [${customer.id}]`);

        // Create 5 mock parts with stages for each customer test
        const mockStages = [
            [{ sequence: 1, name: 'Casting' }, { sequence: 2, name: 'Machining' }, { sequence: 3, name: 'Inspection' }],
            [{ sequence: 1, name: 'Forging' }, { sequence: 2, name: 'Turning' }, { sequence: 3, name: 'Grinding' }, { sequence: 4, name: 'QC' }],
            [{ sequence: 1, name: 'Sheet Metal' }, { sequence: 2, name: 'Welding' }, { sequence: 3, name: 'Painting' }],
            [{ sequence: 1, name: 'Raw Material' }, { sequence: 2, name: 'CNC' }, { sequence: 3, name: 'VMC' }, { sequence: 4, name: 'Assembly' }],
            [{ sequence: 1, name: 'Bar Stock' }, { sequence: 2, name: 'Milling' }, { sequence: 3, name: 'Heat Treatment' }, { sequence: 4, name: 'Inspection' }],
        ];

        for (let i = 0; i < 5; i++) {
            const partNum = `MOCK-${cd.code}-P${i + 1}`;

            // Add to Part Master so Line Deadlines can find it
            await prisma.part.upsert({
                where: { organizationId_partNumber: { organizationId: orgA.id, partNumber: partNum } },
                update: { partName: `Mock Component ${i + 1} for ${cd.code}` },
                create: {
                    organizationId: orgA.id,
                    partNumber: partNum,
                    partName: `Mock Component ${i + 1} for ${cd.code}`,
                    isActive: true,
                }
            });

            // Add to Tray Configuration for Customers & Parts stage view
            await prisma.trayConfiguration.upsert({
                where: { organizationId_customerId_partNumber: { organizationId: orgA.id, customerId: customer.id, partNumber: partNum } },
                update: {
                    capacity: 50 * (i + 1),
                    stages: mockStages[i],
                },
                create: {
                    organizationId: orgA.id,
                    customerId: customer.id,
                    partNumber: partNum,
                    capacity: 50 * (i + 1),
                    description: `Mock Component ${i + 1} for ${cd.code}`,
                    unit: 'NOS',
                    stages: mockStages[i],
                }
            });
        }
        console.log(`  └─ Added 5 mock parts with stages for ${cd.name}`);
    }

    // ── 7. Delivery Challans + Items + Job Processes ────────────────────────────
    console.log('\n🔄 Creating challans with operation cycles...');
    let challanSeq = 1;
    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@orgA.com' } });

    for (const cd of CUSTOMERS) {
        const customer = customerRecords[cd.code];
        const parts = cd.parts;

        // 3 challans per customer, spread across 2 vendors
        for (let ci = 0; ci < 3; ci++) {
            const vendor = vendors[ci % 2]; // alternate between vendor Alpha and Beta
            const challanDate = new Date(year, month - 1, Math.max(1, 15 - ci * 5));
            const challanNum = `DC/${year}/${String(month).padStart(2, '0')}/${String(challanSeq++).padStart(3, '0')}`;

            // Pick 2-3 parts per challan
            const challanParts = parts.slice(ci * 1, ci * 1 + 2).filter(Boolean);
            if (challanParts.length === 0) continue;

            // Check if challan already exists
            const existingChallan = await prisma.deliveryChallan.findUnique({
                where: { challanNumber: challanNum }
            });
            if (existingChallan) {
                challanSeq--;
                continue;
            }

            await prisma.deliveryChallan.create({
                data: {
                    challanNumber: challanNum,
                    challanDate,
                    customer: { connect: { id: customer.id } },
                    vendor: { connect: { id: vendor.id } },
                    status: ChallanStatus.issued,
                    totalQuantity: randomQty(500, 2000),
                    createdBy: adminUser ? { connect: { id: adminUser.id } } : undefined,
                    items: {
                        create: challanParts.map((pn) => {
                            const qty = randomQty(500, 2000);
                            const completedPct = ci === 0 ? 0 : ci === 1 ? 0.4 : 0.8;
                            const completed = Math.floor(qty * completedPct);
                            const ops = OPERATION_CYCLES.slice(0, 3);

                            return {
                                partNumber: pn,
                                partDescription: PARTS_MASTER.find(p => p.pn === pn)?.name ?? pn,
                                quantityIssued: qty,
                                jobProcesses: {
                                    create: ops.map((opName, opIdx) => ({
                                        processName: opName,
                                        processSequence: opIdx + 1,
                                        status: opIdx === 0 && completedPct > 0 ? 'completed' : opIdx === 1 && completedPct > 0.3 ? 'in_progress' : 'pending',
                                        completedQuantity: opIdx === 0 && completedPct > 0 ? completed : 0,
                                        vendor: { connect: { id: vendor.id } },
                                    }))
                                }
                            };
                        }),
                    },
                },
            });
        }
        console.log(`  ✅ Challans for ${cd.name}`);
    }

    // ── 8. Line Deadlines (monthly targets) ────────────────────────────────────
    console.log('\n🎯 Setting monthly line deadline targets...');
    for (const cd of CUSTOMERS) {
        const customer = customerRecords[cd.code];
        const targets = MONTHLY_TARGETS[cd.code] ?? {};
        for (const [partNumber, monthlyTarget] of Object.entries(targets)) {
            const partDesc = PARTS_MASTER.find(p => p.pn === partNumber)?.name ?? partNumber;
            await prisma.lineDeadline.upsert({
                where: {
                    organizationId_customerId_partNumber_month_year: {
                        organizationId: orgA.id,
                        customerId: customer.id,
                        partNumber,
                        month,
                        year,
                    },
                },
                update: { monthlyTarget },
                create: {
                    organizationId: orgA.id,
                    customerId: customer.id,
                    partNumber,
                    monthlyTarget,
                    week1Target: Math.floor(monthlyTarget * 0.25),
                    week2Target: Math.floor(monthlyTarget * 0.25),
                    week3Target: Math.floor(monthlyTarget * 0.25),
                    week4Target: Math.floor(monthlyTarget * 0.25),
                    readyForDispatch: 0,
                    month,
                    year,
                },
            });
        }
        console.log(`  ✅ Targets for ${cd.name}`);
    }

    // ── 9. Purchase Orders (2 per customer vendor pair) ─────────────────────────
    console.log('\n📋 Creating Purchase Orders...');
    const ppcUser = await prisma.user.findUnique({ where: { email: 'ppc@orgA.com' } });
    let poSeq = 1;
    for (const cd of CUSTOMERS.slice(0, 5)) { // first 5 customers get POs
        const customer = customerRecords[cd.code];
        const vendor = vendors[0];
        const poNum = `PO/${year}/${String(month).padStart(2, '0')}/${String(poSeq++).padStart(4, '0')}`;
        const existing = await prisma.purchaseOrder.findUnique({ where: { poNumber: poNum } });
        if (!existing) {
            const part = cd.parts[0];
            const qty = randomQty(1000, 5000);
            const rate = randomQty(45, 200);
            await prisma.purchaseOrder.create({
                data: {
                    poNumber: poNum,
                    poDate: new Date(),
                    jobWorkType: 'with_material',
                    vendor: { connect: { id: vendor.id } },
                    organization: { connect: { id: orgA.id } },
                    status: poSeq % 3 === 0 ? 'pending_approval' : 'approved',
                    subtotal: qty * rate,
                    totalAmount: qty * rate,
                    createdBy: ppcUser ? { connect: { id: ppcUser.id } } : undefined,
                    items: {
                        create: [{
                            partNumber: part,
                            partDescription: PARTS_MASTER.find(p => p.pn === part)?.name ?? part,
                            quantity: qty,
                            ratePerPiece: rate,
                            amount: qty * rate,
                        }]
                    }
                }
            });
        }
    }
    console.log(`  ✅ ${poSeq - 1} POs created`);

    console.log('\n🎉 E2E Seeding Complete!\n');
    console.log('═══════════════════════════════════════════════');
    console.log('  Login Credentials (Password: Test@1234)');
    console.log('═══════════════════════════════════════════════');
    console.log('  superadmin@aaniry.com  → Platform Admin');
    console.log('  admin@orgA.com         → Org Admin');
    console.log('  tk@orgA.com            → GM  (AI access)');
    console.log('  ppc@orgA.com           → PPC Manager');
    console.log('  prod@orgA.com          → Production Manager');
    console.log('  qual@orgA.com          → Executive');
    console.log('  store@orgA.com         → Store Keeper');
    console.log('  gate@orgA.com          → Security / Gate');
    console.log('  owner@vendorA.com      → Vendor Alpha Owner');
    console.log('  owner@vendorB.com      → Vendor Beta Owner');
    console.log('  owner@vendorC.com      → Vendor Gamma Owner');
    console.log('  owner@vendorD.com      → Vendor Delta Owner');
    console.log('═══════════════════════════════════════════════');
    console.log(`  10 Customers · ${PARTS_MASTER.length} Parts · 4 Vendors`);
    console.log('═══════════════════════════════════════════════');
}

main()
    .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
