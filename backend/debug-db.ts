import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=== DB Debug Info ===");

    // Find all organizations
    const orgs = await prisma.organization.findMany({ select: { id: true, name: true, code: true } });
    console.log("Organizations:");
    console.table(orgs);

    // Find all users
    const users = await prisma.user.findMany({
        where: { email: { in: ['aatish@aaniry.com', 'admin@aaniry.com'] } },
        select: { id: true, email: true, role: true, organizationId: true }
    });
    console.log("Users:");
    console.table(users);

    // Find parts/challanItems visibility for the director user
    const aatish = users.find(u => u.email === 'aatish@aaniry.com');
    if (aatish) {
        const challanItems = await prisma.challanItem.findMany({
            where: { challan: { customer: { organizationId: aatish.organizationId } } },
            include: { challan: { include: { customer: true } } }
        });

        console.log(`Challan Items visible to ${aatish.email}: ${challanItems.length}`);
        if (challanItems.length > 0) {
            console.log("Sample Item:");
            console.log({
                partNumber: challanItems[0].partNumber,
                customerOrg: challanItems[0].challan.customer.organizationId,
                customerName: challanItems[0].challan.customer.companyName
            });
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
