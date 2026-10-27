import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function checkAdmin() {
    const adminPassword = await bcrypt.hash('admin123', 12);

    const admin = await prisma.user.update({
        where: { email: 'admin@aaniry.com' },
        data: { passwordHash: adminPassword }
    });

    console.log('Password reset to admin123 for:', admin.email);
}

checkAdmin().catch(console.error).finally(() => prisma.$disconnect());
