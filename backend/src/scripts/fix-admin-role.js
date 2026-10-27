
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Fixing admin role...');
    try {
        const user = await prisma.user.update({
            where: { email: 'admin@aaniry.com' },
            data: { role: 'admin' }
        });
        console.log('User role updated to:', user.role);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
