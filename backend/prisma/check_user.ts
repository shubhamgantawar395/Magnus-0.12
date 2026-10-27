
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'shanuks@aaniry.com';
    console.log(`Checking user: ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: { organization: true }
    });

    if (!user) {
        console.log('❌ User not found!');
    } else {
        console.log('✅ User found:');
        console.log(`- ID: ${user.id}`);
        console.log(`- Role: ${user.role}`);
        console.log(`- Org: ${user.organization?.name} (${user.organizationId})`);
        console.log(`- Active: ${user.isActive}`);
        console.log(`- Email Verified: ${user.isEmailVerified}`);
        console.log(`- Password Hash: ${user.passwordHash ? 'Present' : 'Missing'}`);
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
