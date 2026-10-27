import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@aaniry.com' },
    update: { passwordHash: password },
    create: {
      email: 'admin@aaniry.com',
      passwordHash: password,
      role: 'admin', // Use basic 'admin' role if platform_admin fails
      firstName: 'Admin',
      lastName: 'User'
    }
  });
  console.log('Admin restored:', admin.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
