const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function run() {
    const hash = await bcrypt.hash('Test@1234', 10);
    const emails = [
        'superadmin@aaniry.com',
        'admin@orgA.com',
        'ppc@orgA.com',
        'tk@orgA.com',
        'gm@orgA.com',
    ];

    for (const email of emails) {
        const u = await p.user.findUnique({ where: { email } });
        if (u) {
            await p.user.update({ where: { email }, data: { passwordHash: hash, isActive: true } });
            console.log('UPDATED:', email, '| role:', u.role);
        } else {
            console.log('NOT FOUND:', email);
        }
    }

    await p.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
