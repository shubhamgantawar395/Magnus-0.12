const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    // Try to find the actual unique key for Part
    try {
        await prisma.part.upsert({
            where: { id: 'does-not-exist-xxx' },
            update: {},
            create: { partNumber: 'TEST-DONT-SAVE', organizationId: 'xxx' }
        });
    } catch (e) {
        // Check what keys are available
        console.log('Part upsert error:', e.message?.substring(0, 200));
    }

    // Check POItem fields
    const poi = await prisma.pOItem.findFirst({ select: { id: true } });
    console.log('POItem sample keys available');

    // Check ChallanItem - does it have processSequence?
    const ci = await prisma.challanItem.findFirst();
    console.log('ChallanItem sample:', JSON.stringify(ci, null, 2));

    // Check POItem
    const poItem = await prisma.pOItem.findFirst();
    console.log('POItem sample:', JSON.stringify(poItem, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
