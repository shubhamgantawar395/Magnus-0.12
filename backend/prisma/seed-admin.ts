import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding platform admin user...');

    const adminPassword = await bcrypt.hash('Password123', 12);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@aaniry.com' },
        update: {
            role: 'platform_admin',
            passwordHash: adminPassword,
            firstName: 'Platform',
            lastName: 'Admin',
            isActive: true,
            isEmailVerified: true,
        },
        create: {
            email: 'admin@aaniry.com',
            passwordHash: adminPassword,
            role: 'platform_admin',
            firstName: 'Platform',
            lastName: 'Admin',
            isActive: true,
            isEmailVerified: true,
        },
    });

    console.log('✅ Platform Admin user created:', admin.email);
    console.log('🎉 Admin seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
