import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding data...');

    // 1. Create or Find User (for createdById)
    let user = await prisma.user.findFirst({
        where: { email: 'admin@aaniry.com' },
    });

    if (!user) {
        user = await prisma.user.create({
            data: {
                email: 'admin@aaniry.com',
                passwordHash: 'dummy_hash', // In a real app, use a hashed password
                role: 'admin',
                firstName: 'System',
                lastName: 'Admin',
                isEmailVerified: true,
            },
        });
        console.log('Created admin user:', user.email);
    } else {
        console.log('Found admin user:', user.email);
    }

    // 2. Create OEM "Seinumero Nirman Private limited"
    const customerName = 'Seinumero Nirman Private limited';
    let customer = await prisma.customer.findFirst({
        where: { companyName: customerName },
    });

    if (!customer) {
        customer = await prisma.customer.create({
            data: {
                companyName: customerName,
                code: 'SEINUMERO',
                gstin: '27AAAAA0000A1Z5', // Dummy GSTIN
                address: 'Pune, Maharashtra',
                city: 'Pune',
                state: 'Maharashtra',
                pincode: '411001',
            },
        });
        console.log('Created Customer:', customer.companyName);
    } else {
        console.log('Found Customer:', customer.companyName);
    }

    // 3. Create Vendor "Aaniryat overseas private limited"
    const vendorName = 'Aaniryat overseas private limited';
    let vendor = await prisma.vendor.findFirst({
        where: { companyName: vendorName },
    });

    if (!vendor) {
        vendor = await prisma.vendor.create({
            data: {
                companyName: vendorName,
                vendorCode: 'AANIRYAT',
                gstin: '27BBBBB0000B1Z5', // Dummy GSTIN
                status: 'approved',
                address: 'Mumbai, Maharashtra',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
            },
        });
        console.log('Created Vendor:', vendor.companyName);
    } else {
        console.log('Found Vendor:', vendor.companyName);
    }

    // 4. Create Challan
    const challanDate = new Date('2027-02-03');
    // Generate challan number
    const year = challanDate.getFullYear();
    const month = String(challanDate.getMonth() + 1).padStart(2, '0');
    const count = await prisma.deliveryChallan.count({
        where: {
            challanDate: {
                gte: new Date(year, challanDate.getMonth(), 1),
                lte: new Date(year, challanDate.getMonth() + 1, 0, 23, 59, 59),
            }
        }
    });
    const sequence = String(count + 1).padStart(3, '0');
    const challanNumber = `DC/${year}/${month}/${sequence}`;
    // Hardcoding the specific challan number if needed or letting logic handle it?
    // User specified Challan no: 25407 (This looks like a manual number or part of a different system)
    // I will use 25407 as the challanNumber for exact match with request, overriding the generated one if possible or append it.
    // Actually, usually challan numbers are strings. I will use "25407".

    const manualChallanNumber = "25407";

    // Check if already exists
    let challan = await prisma.deliveryChallan.findUnique({
        where: { challanNumber: manualChallanNumber },
    });

    if (!challan) {
        challan = await prisma.deliveryChallan.create({
            data: {
                challanNumber: manualChallanNumber,
                challanDate: challanDate,
                totalQuantity: 1900,
                totalAmount: 203490,
                status: 'issued',
                customerId: customer.id,
                vendorId: vendor.id,
                createdById: user.id,
                items: {
                    create: {
                        partNumber: "RH-001", // Generating a dummy part number
                        partDescription: "Rotor hub",
                        quantityIssued: 1900,
                        unitPrice: 107.10,
                        totalAmount: 203490,
                        jobProcesses: {
                            create: [
                                { processName: "Turning" },
                                { processName: "Broaching" }
                            ]
                        }
                    }
                }
            },
        });
        console.log('Created Challan:', challan.challanNumber);
    } else {
        console.log('Challan already exists:', challan.challanNumber);
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
