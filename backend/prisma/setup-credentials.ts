import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Setting up credentials...');

    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 12);

    // 1. Admin
    const adminEmail = 'admin@aaniry.com';
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            passwordHash: hashedPassword,
            role: 'platform_admin',
            isActive: true,
            isEmailVerified: true
        },
        create: {
            email: adminEmail,
            passwordHash: hashedPassword,
            role: 'platform_admin',
            firstName: 'System',
            lastName: 'Admin',
            isActive: true,
            isEmailVerified: true
        },
    });
    console.log(`Admin User: ${admin.email} / ${password}`);

    console.log('\n--- CREDENTIALS SETUP COMPLETE ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
