
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Resetting credentials for shanuks@aaniry.com...');

    const email = 'shanuks@aaniry.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 12);

    // Find the user first to get their ID and existing details if needed, 
    // or just update directly.

    const user = await prisma.user.update({
        where: { email },
        data: {
            passwordHash: hashedPassword,
            isActive: true,
            isEmailVerified: true
        }
    });

    console.log('✅ Credentials reset successfully!');
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔑 Role: ${user.role}`);
    console.log(`🏢 Org ID: ${user.organizationId}`);
    console.log(`⚡ Active: ${user.isActive}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
