const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Checking Portal Users & Organization...');

    // 1. Get or Create Organization
    let org = await prisma.organization.findFirst();
    if (!org) {
        console.log('Creating default Organization...');
        org = await prisma.organization.create({
            data: {
                name: 'Aaniry OEM',
                code: 'ORG001',
                subscriptionTier: 'professional' // Enable features
            }
        });
    }
    console.log(`✅ Organization: ${org.name} (${org.id})`);

    // 2. Fix Admin User
    const adminEmail = 'admin@aaniry.com';
    let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (admin) {
        if (!admin.organizationId) {
            console.log('Linking Admin to Organization...');
            await prisma.user.update({
                where: { email: adminEmail },
                data: { organizationId: org.id }
            });
        }
    } else {
        console.log('Creating Admin User...');
        const password = await bcrypt.hash('admin123', 10);
        admin = await prisma.user.create({
            data: {
                email: adminEmail,
                passwordHash: password,
                role: 'admin',
                firstName: 'System',
                lastName: 'Admin',
                organizationId: org.id,
                isEmailVerified: true
            }
        });
    }
    console.log(`✅ Admin Ready: ${adminEmail} / admin123`);

    // 3. Fix Existing Customer Entity (Data)
    // We update ALL customers to belong to this Org for test consistency
    await prisma.customer.updateMany({
        where: { organizationId: null },
        data: { organizationId: org.id }
    });
    console.log('✅ Linked orphaned Customers to Organization');

    // 4. Fix Existing Vendor Entity (Data) & Create Vendor User
    // Update all vendors to belong to this Org
    await prisma.vendor.updateMany({
        where: { organizationId: null },
        data: { organizationId: org.id }
    });
    console.log('✅ Linked orphaned Vendors to Organization');

    // Find a vendor to attach a user to (preferably created by seed/verify script)
    const vendor = await prisma.vendor.findFirst({
        where: { organizationId: org.id }
    });

    if (vendor) {
        const vendorEmail = 'vendor@aaniry.com';
        const vendorUser = await prisma.user.findUnique({ where: { email: vendorEmail } });
        if (!vendorUser) {
            console.log('Creating Vendor User...');
            const password = await bcrypt.hash('vendor123', 10);
            await prisma.user.create({
                data: {
                    email: vendorEmail,
                    passwordHash: password,
                    role: 'vendor', // or 'vendor_user' depending on enum
                    firstName: 'Vendor',
                    lastName: 'User',
                    organizationId: org.id,
                    vendorId: vendor.id,
                    isEmailVerified: true
                }
            });
        }
        console.log(`✅ Vendor User Ready: ${vendorEmail} / vendor123 (Linked to ${vendor.companyName})`);
    } else {
        console.log('⚠️ No Vendor found to link user to.');
    }

    // 5. Create "Customer" User (Tenant Employee with 'customer' role)
    const customerEmail = 'customer@aaniry.com';
    let customerUser = await prisma.user.findUnique({ where: { email: customerEmail } });
    if (!customerUser) {
        console.log('Creating Customer (Tenant) User...');
        const password = await bcrypt.hash('customer123', 10);
        await prisma.user.create({
            data: {
                email: customerEmail,
                passwordHash: password,
                role: 'customer',
                firstName: 'Customer',
                lastName: 'User',
                organizationId: org.id,
                isEmailVerified: true
            }
        });
    }
    console.log(`✅ Customer User Ready: ${customerEmail} / customer123`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
