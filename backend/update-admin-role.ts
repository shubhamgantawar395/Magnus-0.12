import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Updating admin@aaniry.com to platform_admin...');

    try {
        const user = await prisma.user.update({
            where: { email: 'admin@aaniry.com' },
            data: { role: UserRole.platform_admin }
        });
        console.log(`✅ Updated User: ${user.email} -> ${user.role}`);
    } catch (e) {
        console.error('❌ Failed to update:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
