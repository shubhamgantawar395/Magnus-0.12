
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding via Prisma...');

    // 1. Create/Get Customer
    const customer = await prisma.customer.upsert({
        where: { code: 'CUST001' },
        update: {},
        create: {
            companyName: 'Aaniry Overseas Pvt. Ltd.',
            code: 'CUST001',
            gstin: '27AAAAA0000A1Z5',
            email: 'rajesh@aaniry.com',
            contactPerson: 'Rajesh Kumar',
            isActive: true
        }
    });
    console.log('Customer:', customer.id);

    // 2. Create/Get Vendor
    const vendor = await prisma.vendor.upsert({
        where: { vendorCode: 'VEN001' },
        update: {},
        create: {
            companyName: 'Precision CNC Works',
            vendorCode: 'VEN001',
            gstin: '27BBBBB1111B1Z6',
            email: 'suresh@precisioncnc.com',
            contactPerson: 'Suresh Patil',
            customerId: customer.id,
            status: 'approved',
            isActive: true
        }
    });
    console.log('Vendor:', vendor.id);

    // 3. Create Challan
    // Check if challan exists for this vendor
    const existingChallan = await prisma.deliveryChallan.findFirst({
        where: { vendorId: vendor.id }
    });

    const admin = await prisma.user.findUnique({ where: { email: 'admin@aaniry.com' } });

    if (existingChallan) {
        console.log('Challan already exists:', existingChallan.id);
    } else {
        console.log('Creating Challan...');
        const challan = await prisma.deliveryChallan.create({
            data: {
                challanNumber: `CH-${Date.now()}`,
                challanDate: new Date(),
                customer: { connect: { id: customer.id } },
                vendor: { connect: { id: vendor.id } },
                status: 'draft',
                organization: { connect: { id: 'd593cac4-899e-468e-bec4-1921c256b3f3' } },
                createdBy: { connect: { id: admin.id } },
                items: {
                    create: [
                        {
                            partNumber: 'TEST-PART-001',
                            partDescription: 'Test Part for PDF',
                            quantityIssued: 100,
                            unitOfMeasure: 'NOS'
                        }
                    ]
                },
                totalQuantity: 100
            }
        });
        console.log('Challan created:', challan.id);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
