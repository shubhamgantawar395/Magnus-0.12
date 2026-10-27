
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Debugging Login...');

    const email = 'vendor@test.com';
    const password = 'password123';

    // 1. Find User
    const user = await prisma.user.findUnique({
        where: { email },
        include: { vendor: true }
    });

    if (!user) {
        console.log('❌ User not found:', email);

        // List all users to see what exists
        const allUsers = await prisma.user.findMany();
        console.log('Available users:', allUsers.map(u => u.email));
        return;
    }

    console.log('✅ User found:', {
        id: user.id,
        email: user.email,
        role: user.role,
        vendorId: user.vendorId,
        passwordHashLength: user.passwordHash?.length
    });

    if (!user.vendorId) {
        console.log('⚠️ WARNING: User has no vendorId linked!');
    } else {
        console.log('✅ User is linked to Vendor ID:', user.vendorId);
        if (user.vendor) {
            console.log('   Vendor Name:', user.vendor.companyName);
            console.log('   Vendor Code:', user.vendor.vendorCode);
        } else {
            console.log('❌ Linked vendor not found in DB!');
        }
    }

    // 2. Verify Password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (isPasswordValid) {
        console.log('✅ Password matches!');
    } else {
        console.log('❌ Password does NOT match.');

        // Try to re-hash and update if needed
        const newHash = await bcrypt.hash(password, 12);
        console.log('   Suggested fix: Update password hash.');

        // Uncomment to auto-fix
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash }
        });
        console.log('   🔄 Password reset to "password123" done.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
