const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true
            }
        });
        console.log('Users found:', users.length);
        console.table(users);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

listUsers();
