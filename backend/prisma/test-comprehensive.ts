import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Running comprehensive testing/verification...');

    // 1. Verify Counts
    const customerCount = await prisma.customer.count({
        where: { code: { startsWith: 'CUST' } }
    });
    console.log(`Test Customers Created: ${customerCount} / 10`);

    const vendorCount = await prisma.vendor.count({
        where: { vendorCode: { startsWith: 'VEND' } }
    });
    console.log(`Test Vendors Created: ${vendorCount} / 10`);

    const challanCount = await prisma.deliveryChallan.count({
        where: { challanNumber: { contains: 'DC/VEND' } }
    });
    console.log(`Test Challans Created: ${challanCount} (Expected approx 50)`);

    // 2. Data Integrity Check
    const sampleChallan = await prisma.deliveryChallan.findFirst({
        where: { challanNumber: { contains: 'DC/VEND' } },
        include: {
            customer: true,
            vendor: true,
            items: {
                include: { jobProcesses: true }
            }
        }
    });

    if (sampleChallan) {
        console.log('\nSample Challan Integrity Check: PASS');
        console.log(`- Linked to Customer: ${sampleChallan.customer.companyName}`);
        console.log(`- Linked to Vendor: ${sampleChallan.vendor.companyName}`);
        console.log(`- Items Count: ${sampleChallan.items.length}`);
        if (sampleChallan.items.length > 0) {
            console.log(`- Processes for Item 1: ${sampleChallan.items[0].jobProcesses.length}`);
        }
    } else {
        console.log('\nSample Challan Integrity Check: FAIL - No test challans found');
    }

    // 3. Login Availability Check
    const testUser = await prisma.user.findFirst({
        where: { email: 'vendor1@test.com' }
    });

    if (testUser && testUser.passwordHash) {
        console.log(`\nLogin Logic Check: User 'vendor1@test.com' exists with hash.`);
    } else {
        console.log(`\nLogin Logic Check: FAIL - Test user not found`);
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
