import { PrismaClient, UserRole, ChallanStatus, VendorStatus, JobWorkType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const orgId = '468fce1a-82d8-4dbd-a14b-8d177291a137'; // Org Alpha
    const orgA = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!orgA) throw new Error('Org Alpha not found');

    const ppcUser = await prisma.user.findFirst({ where: { email: 'ppc@orgA.com' } });
    if (!ppcUser) throw new Error('PPC user not found');

    // 1. Get 3 Vendors
    const vendors = await prisma.vendor.findMany({
        where: { organizationId: orgId },
        take: 3
    });

    // 2. Get 3 mock parts from Eaton, 3 from Proche
    const eaton = await prisma.customer.findFirst({ where: { code: 'EAT' } });
    const proche = await prisma.customer.findFirst({ where: { code: 'PRO' } });

    const parts = await prisma.part.findMany({
        where: { partNumber: { startsWith: 'MOCK-' } },
        take: 10
    });

    console.log(`PPC ${ppcUser.firstName} is logging in...`);
    console.log(`Creating POs for Vendors...`);

    // 3. Create POs
    const now = new Date();
    let poSeq = Math.floor(Math.random() * 100000); // start high to avoid collisions
    for (const vendor of vendors) {
        const poParts = parts.sort(() => 0.5 - Math.random()).slice(0, 2); // 2 random parts

        await prisma.purchaseOrder.create({
            data: {
                organizationId: orgId,
                vendorId: vendor.id,
                poNumber: `PO-E2E-${poSeq++}`,
                poDate: now,
                jobWorkType: 'with_material',
                status: 'approved',
                createdById: ppcUser.id,
                subtotal: poParts.length * 500 * 50,
                totalAmount: poParts.length * 500 * 50,
                items: {
                    create: poParts.map((p, i) => {
                        const qty = 500;
                        const rate = Math.floor(Math.random() * 50) + 15;
                        return {
                            partNumber: p.partNumber,
                            partDescription: p.partName || p.partNumber,
                            quantity: qty,
                            ratePerPiece: rate,
                            amount: qty * rate,
                        };
                    })
                }
            }
        });
        console.log(`✅ Created PO for Vendor ${vendor.companyName} with ${poParts.length} items`);
    }

    console.log(`\nCreating Delivery Challans...`);
    // 4. Create Challans
    let challanSeq = Math.floor(Math.random() * 100000);
    for (const vendor of vendors) {
        const challanParts = parts.sort(() => 0.5 - Math.random()).slice(0, 2);
        const customer = Math.random() > 0.5 ? eaton : proche;

        const qty = 200;
        const totalQty = challanParts.length * qty;

        const c = await prisma.deliveryChallan.create({
            data: {
                organizationId: orgId,
                vendorId: vendor.id,
                customerId: customer!.id,
                challanNumber: `DC-E2E-${challanSeq++}`,
                challanDate: now,
                status: ChallanStatus.issued,
                createdById: ppcUser.id,
                totalQuantity: totalQty,
                items: {
                    create: challanParts.map(p => ({
                        partNumber: p.partNumber,
                        partDescription: p.partName || p.partNumber,
                        quantityIssued: qty,
                        jobProcesses: {
                            create: [
                                {
                                    processName: 'Machining', // generic mock stage
                                    processSequence: 1,
                                    status: 'pending',
                                    completedQuantity: 0,
                                }
                            ]
                        }
                    }))
                }
            }
        });
        console.log(`✅ Dispatched ${totalQty} units of ${challanParts.map(p => p.partNumber).join(', ')} to ${vendor.companyName} on ${c.challanNumber}`);
    }

    console.log(`\n🎉 PPC tasks completed! The materials have left the gates.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
