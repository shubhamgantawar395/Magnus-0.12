
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Updating admin role...');

    const user = await prisma.user.update({
        where: { email: 'admin@aaniry.com' },
        data: {
            role: 'platform_admin'
        }
    });

    console.log('✅ Admin role updated to:', user.role);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
