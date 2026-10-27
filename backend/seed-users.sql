-- Quick SQL Seed Script
-- Run this to create test users with hashed 'password123'

-- Hash for 'password123' using bcrypt rounds=10
-- $2a$10$N9qo8uLOickgx2ZMRZo5Ce8GfPzW6n9G7xHXVZf/AVqY1Ovf./sni

-- 1. Create Admin
INSERT INTO "User" ("id", "email", "passwordHash", "role", "firstName", "lastName", "isActive", "isEmailVerified", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'admin@aaniry.com', '$2a$10$N9qo8uLOickgx2ZMRZo5Ce8GfPzW6n9G7xHXVZf/AVqY1Ovf./sni', 'admin', 'System', 'Admin', true, true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- 2. Create Vendor 1
INSERT INTO "Vendor" ("id", "companyName", "vendorCode", "gstin", "status", "contactPerson", "email", "phone", "address", "city", "state", "pincode", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Test Vendor 1 Works', 'VEND001', '27VEND000011Z5', 'approved', 'Vendor Owner 1', 'vendor1@test.com', '9123450001', 'Plot 1, Industrial Area', 'Pune', 'Maharashtra', '411026', NOW(), NOW())
ON CONFLICT (vendorCode) DO NOTHING;

-- Get vendor1 ID
WITH vendor1 AS (SELECT id FROM "Vendor" WHERE "vendorCode" = 'VEND001')
INSERT INTO "User" ("id", "email", "passwordHash", "role", "firstName", "lastName", "isActive", "isEmailVerified", "vendorId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'vendor1@test.com', '$2a$10$N9qo8uLOickgx2ZMRZo5Ce8GfPzW6n9G7xHXVZf/AVqY1Ovf./sni', 'vendor', 'Vendor', '1', true, true, id, NOW(), NOW()
FROM vendor1
ON CONFLICT (email) DO NOTHING;

-- Verify users were created
SELECT email, role, "firstName", "lastName" FROM "User" ORDER BY email;
