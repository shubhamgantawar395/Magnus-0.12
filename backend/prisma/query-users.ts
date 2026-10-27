import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.findMany({
        where: { role: { in: ['executive', 'director', 'gm', 'admin', 'ppc_manager'] }, isActive: true },
        select: { email: true, role: true, organizationId: true }
    });
    console.log('Active users with exec/admin roles:');
    console.log(JSON.stringify(users, null, 2));
}
main().finally(() => prisma.$disconnect());
