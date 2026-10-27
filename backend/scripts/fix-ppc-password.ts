import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'ppc@seinumero.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 12);

    // Find org
    let org = await prisma.organization.findFirst({ where: { name: { contains: 'Seinumero', mode: 'insensitive' } } });
    if (!org) {
        org = await prisma.organization.upsert({
            where: { code: 'SEIN' },
            update: {},
            create: { name: 'Seinumero Nirman Pvt Ltd', code: 'SEIN' }
        });
        console.log(`Created org: ${org.name}`);
    }

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            passwordHash: hashedPassword,
            isActive: true,
            isEmailVerified: true,
            organizationId: org.id,
            role: 'ppc_manager',
        },
        create: {
            email,
            passwordHash: hashedPassword,
            role: 'ppc_manager',
            firstName: 'PPC',
            lastName: 'Manager',
            isActive: true,
            isEmailVerified: true,
            organizationId: org.id,
        }
    });

    console.log(`✅ User fixed: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Org: ${org.name}`);
    console.log(`   Password: ${password}`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
