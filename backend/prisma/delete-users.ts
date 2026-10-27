import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteUsers() {
    console.log('🗑️ Deleting specified users...');
    try {
        const result = await prisma.user.deleteMany({
            where: {
                email: {
                    in: ['admin@aaniry.com', 'ppc@seinumero.com', 'director@seinumero.com']
                }
            }
        });
        console.log(`✅ Successfully deleted ${result.count} users.`);
    } catch (error) {
        console.error('❌ Error deleting users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

deleteUsers();
