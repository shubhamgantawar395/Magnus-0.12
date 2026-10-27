import { PrismaClient, InvoiceStatus, ChallanStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const orgId = '468fce1a-82d8-4dbd-a14b-8d177291a137'; // Org Alpha

    const securityUser = await prisma.user.findFirst({ where: { email: 'gate@orgA.com' } });
    const ppcUser = await prisma.user.findFirst({ where: { email: 'ppc@orgA.com' } });

    // Get the recently created challans
    const challans = await prisma.deliveryChallan.findMany({
        where: {
            challanNumber: { startsWith: 'DC-E2E-' },
            status: ChallanStatus.issued
        },
        include: {
            items: true,
            vendor: true,
            customer: true,
        }
    });

    if (challans.length === 0) {
        console.log("No issued challans found to process.");
        return;
    }

    console.log(`Phase 2: Real World Scenario (Vendor -> Security -> PPC)`);

    let invSeq = Math.floor(Math.random() * 10000);

    for (const challan of challans) {
        console.log(`\n📦 Vendor [${challan.vendor.companyName}] is processing Challan ${challan.challanNumber}...`);

        // 1. Vendor creates Tax Invoice
        const invoiceNum = `INV-E2E-${invSeq++}`;
        const subtotal = challan.items.reduce((sum, item) => sum + (item.quantityIssued * 45), 0);
        const inv = await prisma.vendorInvoice.create({
            data: {
                invoiceNumber: invoiceNum,
                invoiceDate: new Date(),
                vendorId: challan.vendorId,
                customerId: challan.customerId,
                subtotal: subtotal,
                totalAmount: subtotal * 1.18, // adding hypothetical 18% GST broadly
                balanceAmount: subtotal * 1.18,
                status: InvoiceStatus.submitted,
                items: {
                    create: challan.items.map(ci => ({
                        challanItemId: ci.id,
                        partNumber: ci.partNumber,
                        partDescription: ci.partDescription,
                        challanQuantity: ci.quantityIssued,
                        invoiceQuantity: ci.quantityIssued, // full return
                        unitPrice: 45,
                        amount: ci.quantityIssued * 45,
                        totalAmount: ci.quantityIssued * 45 * 1.18,
                        operationName: 'Machining',
                        gateReceivedQty: ci.quantityIssued,
                    }))
                }
            }
        });
        console.log(`✅ [Vendor] Generated Tax Invoice ${invoiceNum} for total ₨${inv.totalAmount}`);

        // 2. Security approves
        await prisma.vendorInvoice.update({
            where: { id: inv.id },
            data: {
                status: InvoiceStatus.gate_approved,
                gateApprovedById: securityUser!.id,
                gateApprovedAt: new Date(),
                gateRemarks: 'All OK, seals intact',
            }
        });
        console.log(`✅ [Security Gate] Received goods and marked Gate Approved`);

        // 3. PPC approves
        await prisma.vendorInvoice.update({
            where: { id: inv.id },
            data: {
                status: InvoiceStatus.approved,
            }
        });

        // PPC closes the Challan
        await prisma.deliveryChallan.update({
            where: { id: challan.id },
            data: {
                status: ChallanStatus.closed
            }
        });
        console.log(`✅ [PPC] Validated invoice. Challan ${challan.challanNumber} closed!`);
    }

    console.log(`\n🎉 Phase 2 completed! The loop is closed.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
