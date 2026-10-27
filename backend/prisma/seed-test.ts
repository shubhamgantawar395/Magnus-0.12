/**
 * Test seed — creates exactly the users needed for manual E2E testing.
 *
 *   superadmin@aaniry.com  /  Test@1234   (platform_admin — no org)
 *   admin@orgA.com         /  Test@1234   (admin, Org A)
 *   ppc@orgA.com           /  Test@1234   (ppc_manager, Org A)
 *   prod@orgA.com          /  Test@1234   (production_manager, Org A)
 *   owner@vendorA.com      /  Test@1234   (vendor_owner, Vendor A)
 *
 * Run: npx ts-node --compiler-options '{"module":"commonjs"}' prisma/seed-test.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('\n=== Aaniry VMS — Test Seed ===\n');

    const PASSWORD = 'Test@1234';
    const hash = await bcrypt.hash(PASSWORD, 12);

    // ── 1. Platform Admin (no org) ──────────────────────────────────────────────
    const superAdmin = await prisma.user.upsert({
        where: { email: 'superadmin@aaniry.com' },
        update: { passwordHash: hash, isActive: true },
        create: {
            email: 'superadmin@aaniry.com',
            passwordHash: hash,
            role: 'platform_admin' as any,
            firstName: 'Super',
            lastName: 'Admin',
            isActive: true,
            isEmailVerified: true,
        },
    });
    console.log(`✓ Platform Admin : superadmin@aaniry.com  /  ${PASSWORD}`);

    // ── 2. Organisation A ───────────────────────────────────────────────────────
    const org = await prisma.organization.upsert({
        where: { code: 'ORGA' },
        update: { name: 'Org A — Test Company' },
        create: {
            name: 'Org A — Test Company',
            code: 'ORGA',
        },
    });
    console.log(`✓ Organization   : ${org.name} (id: ${org.id})`);

    // ── 3. Org Admin ────────────────────────────────────────────────────────────
    await prisma.user.upsert({
        where: { email: 'admin@orgA.com' },
        update: { passwordHash: hash, organizationId: org.id, isActive: true },
        create: {
            email: 'admin@orgA.com',
            passwordHash: hash,
            role: 'admin' as any,
            firstName: 'Org',
            lastName: 'Admin',
            isActive: true,
            isEmailVerified: true,
            organizationId: org.id,
        },
    });
    console.log(`✓ Admin          : admin@orgA.com         /  ${PASSWORD}`);

    // ── 4. PPC Manager ──────────────────────────────────────────────────────────
    const ppcUser = await prisma.user.upsert({
        where: { email: 'ppc@orgA.com' },
        update: { passwordHash: hash, organizationId: org.id, isActive: true },
        create: {
            email: 'ppc@orgA.com',
            passwordHash: hash,
            role: 'ppc_manager' as any,
            firstName: 'PPC',
            lastName: 'Manager',
            isActive: true,
            isEmailVerified: true,
            organizationId: org.id,
        },
    });
    console.log(`✓ PPC Manager    : ppc@orgA.com           /  ${PASSWORD}`);

    // ── 5. Production Manager ───────────────────────────────────────────────────
    await prisma.user.upsert({
        where: { email: 'prod@orgA.com' },
        update: { passwordHash: hash, organizationId: org.id, isActive: true },
        create: {
            email: 'prod@orgA.com',
            passwordHash: hash,
            role: 'production_manager' as any,
            firstName: 'Production',
            lastName: 'Manager',
            isActive: true,
            isEmailVerified: true,
            organizationId: org.id,
        },
    });
    console.log(`✓ Production Mgr : prod@orgA.com          /  ${PASSWORD}`);

    // ── 6. Vendor A ─────────────────────────────────────────────────────────────
    let vendorA = await prisma.vendor.findFirst({ where: { vendorCode: 'VENDA' } });
    if (!vendorA) {
        vendorA = await prisma.vendor.create({
            data: {
                companyName: 'Vendor A — Precision Parts',
                vendorCode: 'VENDA',
                organizationId: org.id,
                address: 'Plot 12, MIDC Phase II, Pune',
                city: 'Pune',
                state: 'Maharashtra',
                contactPerson: 'Vendor A Rep',
                email: 'owner@vendorA.com',
                phone: '9876543210',
                isActive: true,
                status: 'approved' as any,
                gstin: 'VENDAGSTIN001',
            },
        });
    }
    console.log(`✓ Vendor         : ${vendorA.companyName} (code: ${vendorA.vendorCode})`);

    // ── 7. Vendor Owner ─────────────────────────────────────────────────────────
    await prisma.user.upsert({
        where: { email: 'owner@vendorA.com' },
        update: { passwordHash: hash, vendorId: vendorA.id, isActive: true },
        create: {
            email: 'owner@vendorA.com',
            passwordHash: hash,
            role: 'vendor_owner' as any,
            firstName: 'Vendor',
            lastName: 'Owner',
            isActive: true,
            isEmailVerified: true,
            vendorId: vendorA.id,
        },
    });
    console.log(`✓ Vendor Owner   : owner@vendorA.com      /  ${PASSWORD}`);

    // ── 8. A test Customer (OEM) for orgA ───────────────────────────────────────
    let testCustomer = await prisma.customer.findFirst({
        where: { organizationId: org.id, code: 'EATON-TEST' },
    });
    if (!testCustomer) {
        testCustomer = await prisma.customer.create({
            data: {
                organizationId: org.id,
                companyName: 'Eaton (Test)',
                code: 'EATON-TEST',
                address: 'Pune Industrial Area',
                state: 'Maharashtra',
                contactPerson: 'Test Buyer',
                email: 'buyer-test@eaton.com',
                isActive: true,
            },
        });
    }
    console.log(`✓ Customer (OEM) : ${testCustomer.companyName} (code: ${testCustomer.code})`);

    console.log('\n=== Seed Complete ===');
    console.log(`\nAll users → password: ${PASSWORD}`);
    console.log(`
  Role               | Email
  -------------------|--------------------------
  platform_admin     | superadmin@aaniry.com
  admin              | admin@orgA.com
  ppc_manager        | ppc@orgA.com
  production_manager | prod@orgA.com
  vendor_owner       | owner@vendorA.com
`);
}

main()
    .catch((e) => {
        console.error('\n❌ Seed failed:', e.message || e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
