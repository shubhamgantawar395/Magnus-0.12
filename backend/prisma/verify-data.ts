import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Verifying data...');

    const challan = await prisma.deliveryChallan.findUnique({
        where: { challanNumber: "25407" },
        include: {
            customer: true,
            vendor: true,
            items: {
                include: {
                    jobProcesses: true
                }
            }
        }
    });

    if (challan) {
        console.log('--- CHALLAN FOUND ---');
        console.log('Challan No:', challan.challanNumber);
        console.log('Date:', challan.challanDate.toISOString().split('T')[0]);
        console.log('Customer:', challan.customer.companyName);
        console.log('Vendor:', challan.vendor.companyName);
        console.log('Total Qty:', challan.totalQuantity);
        console.log('Total Amount:', challan.totalAmount);

        console.log('\n--- ITEMS ---');
        challan.items.forEach(item => {
            console.log(`Part: ${item.partDescription} (${item.partNumber})`);
            console.log(`Qty: ${item.quantityIssued}`);
            console.log(`Rate: ${item.unitPrice}`);
            console.log(`Amount: ${item.totalAmount}`);

            console.log('  Operations:');
            item.jobProcesses.forEach(proc => {
                console.log(`  - ${proc.processName} [${proc.status}]`);
            });
        });
    } else {
        console.log('Challan 25407 NOT FOUND');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
