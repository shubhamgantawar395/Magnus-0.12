import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({ where: { email: 'ppc@seinumero.com' } });
    if (!user) {
        console.log('❌ USER NOT FOUND in database!');
        return;
    }
    console.log('✅ Found user:', user.email);
    console.log('   role:', user.role);
    console.log('   isActive:', user.isActive);
    console.log('   isEmailVerified:', user.isEmailVerified);
    console.log('   organizationId:', user.organizationId);
    console.log('   passwordHash starts with:', user.passwordHash?.substring(0, 10));

    const match = await bcrypt.compare('password123', user.passwordHash);
    console.log('   bcrypt.compare("password123"):', match ? '✅ MATCH' : '❌ NO MATCH');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
