
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Resetting admin credentials...');

    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Using upsert to ensure it exists
    const user = await prisma.user.upsert({
        where: { email: 'admin@aaniry.com' },
        update: {
            passwordHash: hashedPassword,
            role: 'platform_admin',
            isActive: true,
            isEmailVerified: true
        },
        create: {
            email: 'admin@aaniry.com',
            passwordHash: hashedPassword, // 'admin123'
            role: 'platform_admin',
            firstName: 'System',
            lastName: 'Admin',
            isActive: true,
            isEmailVerified: true
        }
    });

    console.log('✅ Admin credentials reset successfully!');
    console.log('📧 Email: admin@aaniry.com');
    console.log('🔑 Role: ', user.role);
    console.log('⚡ Active: ', user.isActive);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
