import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
    console.log('🔍 Verifying database migration...\n');

    // Check Organization
    const orgCount = await prisma.organization.count();
    console.log(`✅ Organizations: ${orgCount}`);

    // Check Users
    const userCount = await prisma.user.count();
    const usersByRole = await prisma.user.groupBy({
        by: ['role'],
        _count: true
    });
    console.log(`✅ Users: ${userCount}`);
    usersByRole.forEach(r => console.log(`   - ${r.role}: ${r._count}`));

    // Check End Customers
    const endCustomerCount = await prisma.endCustomer.count();
    console.log(`✅ End Customers: ${endCustomerCount}`);

    // Check Parts
    const partCount = await prisma.part.count();
    console.log(`✅ Parts: ${partCount}`);

    // Check Vendors
    const vendorCount = await prisma.vendor.count();
    console.log(`✅ Vendors: ${vendorCount}`);

    // Check Quotations
    const quotationCount = await prisma.vendorQuotation.count();
    console.log(`✅ Quotations: ${quotationCount}`);

    // Check Purchase Orders
    const poCount = await prisma.purchaseOrder.count();
    console.log(`✅ Purchase Orders: ${poCount}`);

    // Check Vehicle Dispatches
    const dispatchCount = await prisma.vehicleDispatch.count();
    console.log(`✅ Vehicle Dispatches: ${dispatchCount}`);

    // Check Alerts
    const alertCount = await prisma.alert.count();
    console.log(`✅ Alerts: ${alertCount}`);

    // Check Challans
    const challanCount = await prisma.deliveryChallan.count();
    console.log(`✅ Delivery Challans: ${challanCount}`);

    console.log('\n🎉 All tables verified successfully!');
}

verify()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
