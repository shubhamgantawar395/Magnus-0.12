-- =============================================================
-- Aaniry VMS — Test User Seed
-- Password for ALL users: Test@1234
--
-- Run from your terminal (Windows CMD / PowerShell):
--   psql postgresql://postgres:postgres@localhost:5432/aaniry_vms -f prisma/seed-test.sql
--
-- Or paste into pgAdmin / TablePlus / DBeaver query window.
-- =============================================================

-- 1. Organisation A
INSERT INTO "Organization" (id, name, code, "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'Org A — Test Company',
    'ORGA',
    NOW(), NOW()
)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- 2. Platform Admin (no org)
INSERT INTO "User" (id, email, "passwordHash", role, "firstName", "lastName",
                    "isActive", "isEmailVerified", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'superadmin@aaniry.com',
    '$2a$12$F4ZWbU3.Gp8PvWtA6UiYv.SN1Tdrew4OJiJKRPS7Xb7hoQs5Qyc2S',
    'platform_admin',
    'Super', 'Admin',
    true, true, NOW(), NOW()
)
ON CONFLICT (email) DO UPDATE SET
    "passwordHash" = EXCLUDED."passwordHash",
    "isActive"     = true;

-- 3. Org Admin
INSERT INTO "User" (id, email, "passwordHash", role, "firstName", "lastName",
                    "isActive", "isEmailVerified", "organizationId", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    'admin@orgA.com',
    '$2a$12$F4ZWbU3.Gp8PvWtA6UiYv.SN1Tdrew4OJiJKRPS7Xb7hoQs5Qyc2S',
    'admin',
    'Org', 'Admin',
    true, true,
    (SELECT id FROM "Organization" WHERE code = 'ORGA'),
    NOW(), NOW()
ON CONFLICT (email) DO UPDATE SET
    "passwordHash"   = EXCLUDED."passwordHash",
    "organizationId" = EXCLUDED."organizationId",
    "isActive"       = true;

-- 4. PPC Manager
INSERT INTO "User" (id, email, "passwordHash", role, "firstName", "lastName",
                    "isActive", "isEmailVerified", "organizationId", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    'ppc@orgA.com',
    '$2a$12$F4ZWbU3.Gp8PvWtA6UiYv.SN1Tdrew4OJiJKRPS7Xb7hoQs5Qyc2S',
    'ppc_manager',
    'PPC', 'Manager',
    true, true,
    (SELECT id FROM "Organization" WHERE code = 'ORGA'),
    NOW(), NOW()
ON CONFLICT (email) DO UPDATE SET
    "passwordHash"   = EXCLUDED."passwordHash",
    "organizationId" = EXCLUDED."organizationId",
    "isActive"       = true;

-- 5. Production Manager
INSERT INTO "User" (id, email, "passwordHash", role, "firstName", "lastName",
                    "isActive", "isEmailVerified", "organizationId", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    'prod@orgA.com',
    '$2a$12$F4ZWbU3.Gp8PvWtA6UiYv.SN1Tdrew4OJiJKRPS7Xb7hoQs5Qyc2S',
    'production_manager',
    'Production', 'Manager',
    true, true,
    (SELECT id FROM "Organization" WHERE code = 'ORGA'),
    NOW(), NOW()
ON CONFLICT (email) DO UPDATE SET
    "passwordHash"   = EXCLUDED."passwordHash",
    "organizationId" = EXCLUDED."organizationId",
    "isActive"       = true;

-- 6. Vendor A
INSERT INTO "Vendor" (id, "companyName", "vendorCode", "organizationId",
                      address, city, state, "contactPerson", email, phone,
                      "isActive", status, gstin, "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    'Vendor A — Precision Parts',
    'VENDA',
    (SELECT id FROM "Organization" WHERE code = 'ORGA'),
    'Plot 12, MIDC Phase II', 'Pune', 'Maharashtra',
    'Vendor A Rep', 'owner@vendorA.com', '9876543210',
    true, 'approved', 'VENDAGSTIN001',
    NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Vendor" WHERE "vendorCode" = 'VENDA');

-- 7. Vendor Owner user (linked to Vendor A)
INSERT INTO "User" (id, email, "passwordHash", role, "firstName", "lastName",
                    "isActive", "isEmailVerified", "vendorId", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    'owner@vendorA.com',
    '$2a$12$F4ZWbU3.Gp8PvWtA6UiYv.SN1Tdrew4OJiJKRPS7Xb7hoQs5Qyc2S',
    'vendor_owner',
    'Vendor', 'Owner',
    true, true,
    (SELECT id FROM "Vendor" WHERE "vendorCode" = 'VENDA'),
    NOW(), NOW()
ON CONFLICT (email) DO UPDATE SET
    "passwordHash" = EXCLUDED."passwordHash",
    "vendorId"     = EXCLUDED."vendorId",
    "isActive"     = true;

-- 8. Test Customer (OEM) for Org A — needed for challans
INSERT INTO "Customer" (id, "organizationId", "companyName", code,
                        address, state, "contactPerson", email, "isActive",
                        "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    (SELECT id FROM "Organization" WHERE code = 'ORGA'),
    'Eaton (Test)',
    'EATON-TEST',
    'Pune Industrial Area', 'Maharashtra',
    'Test Buyer', 'buyer-test@eaton.com',
    true, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM "Customer"
    WHERE "organizationId" = (SELECT id FROM "Organization" WHERE code = 'ORGA')
      AND code = 'EATON-TEST'
);

-- =============================================================
-- Verify
-- =============================================================
SELECT email, role, "isActive",
       CASE WHEN "organizationId" IS NOT NULL THEN 'has org' ELSE 'no org' END AS org,
       CASE WHEN "vendorId" IS NOT NULL THEN 'has vendor' ELSE 'no vendor' END AS vendor
FROM "User"
WHERE email IN (
    'superadmin@aaniry.com',
    'admin@orgA.com',
    'ppc@orgA.com',
    'prod@orgA.com',
    'owner@vendorA.com'
)
ORDER BY role;
