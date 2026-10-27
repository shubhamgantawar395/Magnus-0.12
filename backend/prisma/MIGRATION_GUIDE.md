# Real-World VMS Database Migration Guide

## Overview

This guide will help you migrate your database to the complete real-world VMS schema with all new features including:
- Multi-tenant architecture
- End customer management (Eaton, Tata, etc.)
- RFQ/Quotation system
- Purchase Orders with flexible approval
- First Article Inspection (FAI)
- Quality Management with NCR/8D
- Stock Statements (MAESOF)
- Invoice Verification workflow
- Vehicle Dispatch management
- Real-time Alert system

---

## Prerequisites

- PostgreSQL database running
- Node.js and npm installed
- Backend environment configured (`.env` file)

---

## Migration Steps

### Step 1: Apply Database Migration

This will create all new tables, enums, and relations.

```powershell
# Navigate to backend directory
cd backend

# Apply the migration
npx prisma migrate deploy

# OR if you want to create a new migration
npx prisma migrate dev --name real_world_vms_complete

# Generate Prisma Client
npx prisma generate
```

**What this does:**
- Creates 8 new tables (EndCustomer, Part, VendorQuotation, FAI, NCR, etc.)
- Adds new enums (Department, JobWorkType, POStatus, QualityStatus)
- Adds organizationId to existing tables
- Creates all foreign key relations

---

### Step 2: Run Data Migration

This will migrate your existing data to the new schema.

```powershell
# Run the data migration script
npx ts-node prisma/data-migration.ts
```

**What this does:**
- Creates default organization (Aaniry Manufacturing)
- Migrates existing users to default organization
- Updates user roles (admin → platform_admin, customer → production_manager, vendor → vendor_user)
- Migrates customers, vendors, and challans to default organization
- Creates sample users (PPC, Quality Head, Director)

**Expected Output:**
```
🚀 Starting data migration...

📦 Creating default organization...
✅ Organization created: Aaniry Manufacturing Pvt Ltd (AANIRY001)

👥 Migrating existing users...
✅ Updated X users with organizationId

🔄 Migrating user roles...
✅ Migrated X admin users to platform_admin
✅ Migrated X customer users to production_manager
✅ Migrated X vendor users to vendor_user

... (more output)

✅ Data migration completed successfully!
```

---

### Step 3: Seed Sample Data (Optional)

This will populate your database with realistic sample data for testing.

```powershell
# Run the real-world seed script
npx ts-node prisma/seed-realworld.ts
```

**What this creates:**
- Organization: Aaniry Manufacturing
- Users: Director, GM, PM, PPC Manager, Quality Head (with hierarchy)
- End Customers: Eaton Corporation, Tata Motors
- Parts: EATON-GS-001 (Gear Shaft), TATA-BRG-001 (Bearing Housing)
- Vendors: ABC Precision Machining, XYZ Engineering Works
- Vendor Rate Cards: Turning, Milling, Grinding rates
- Quotation: Sample RFQ and accepted quotation
- Purchase Order: Approved PO for 1000 pcs
- Vehicle Dispatch: Planned route for 2 vendors
- Alerts: Sample job overdue and vehicle ready alerts

**Login Credentials (after seeding):**
```
Director:  director@aaniry.com  / director123
GM:        gm@aaniry.com        / gm123
PM:        pm@aaniry.com        / pm123
PPC:       ppc@aaniry.com       / ppc123
Quality:   quality@aaniry.com   / quality123
```

---

## Verification

### Check Database Tables

```sql
-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check Organization table
SELECT * FROM "Organization";

-- Check new enums
SELECT unnest(enum_range(NULL::\"Department\"));
SELECT unnest(enum_range(NULL::\"JobWorkType\"));
SELECT unnest(enum_range(NULL::\"POStatus\"));
SELECT unnest(enum_range(NULL::\"QualityStatus\"));
```

### Verify Data Migration

```sql
-- Check users have organizationId
SELECT email, role, department, "organizationId" 
FROM "User" 
LIMIT 10;

-- Check customers migrated
SELECT "companyName", "organizationId" 
FROM "Customer" 
LIMIT 10;

-- Check vendors migrated
SELECT "companyName", "organizationId" 
FROM "Vendor" 
LIMIT 10;
```

### Verify Sample Data (if seeded)

```sql
-- Check end customers
SELECT * FROM "EndCustomer";

-- Check parts
SELECT "partNumber", "partName", "currentStatus" 
FROM "Part";

-- Check quotations
SELECT "quotationNumber", status, "validUntil" 
FROM "VendorQuotation";

-- Check purchase orders
SELECT "poNumber", status, "totalAmount" 
FROM "PurchaseOrder";

-- Check alerts
SELECT type, severity, title, message 
FROM "Alert";
```

---

## Rollback (If Needed)

If something goes wrong, you can rollback:

```powershell
# Rollback the last migration
npx prisma migrate resolve --rolled-back 20260207_real_world_vms_complete

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset
```

---

## Next Steps

After successful migration:

1. **Update Backend APIs**
   - Create controllers for new models (EndCustomer, Part, VendorQuotation, etc.)
   - Implement RFQ/Quotation workflow
   - Add PO approval endpoints
   - Create FAI and NCR management APIs

2. **Update Frontend**
   - Add End Customer management pages
   - Create Part master with operation sequencing
   - Build RFQ/Quotation comparison UI
   - Implement PO approval workflow UI
   - Add FAI approval interface
   - Create NCR/8D tracking dashboard
   - Build Stock Statement UI
   - Add Invoice verification workflow
   - Create Vehicle Dispatch planner
   - Implement real-time Alert notifications

3. **Implement Business Logic**
   - Auto-generate stock statements (weekly/monthly)
   - Auto-create NCRs on quality failures
   - Alert generation for all 8 scenarios
   - Vendor performance metrics calculation
   - Invoice verification workflow automation

4. **Testing**
   - Test multi-tenant isolation
   - Verify RFQ → Quotation → PO flow
   - Test FAI approval before production
   - Validate stock statement variance tracking
   - Test invoice verification workflow
   - Verify alert generation

---

## Troubleshooting

### Migration Fails

**Error: Enum already exists**
```
Solution: The enum might already exist. Check your database and manually drop it:
DROP TYPE IF EXISTS "Department" CASCADE;
Then re-run the migration.
```

**Error: Column already exists**
```
Solution: The column might have been added in a previous migration.
Check your database schema and comment out duplicate ALTER TABLE statements.
```

### Data Migration Fails

**Error: Organization already exists**
```
Solution: The script uses upsert, so this shouldn't happen. 
If it does, manually delete the organization and re-run.
```

**Error: Cannot update role enum**
```
Solution: The old role values might not exist in the new enum.
Manually update the User table first:
UPDATE "User" SET role = 'production_manager' WHERE role = 'customer';
```

---

## Schema Summary

### New Models (8)
1. **EndCustomer** - OEM's customers (Eaton, Tata, etc.)
2. **Part** - Customer-wise part numbering with operations
3. **VendorQuotation** - RFQ system with 90-day validity
4. **FirstArticleInspection** - FAI approval before production
5. **NonConformanceReport** - NCR/8D tracking
6. **InvoiceVerification** - Security→PPC→Accounts workflow
7. **VehicleDispatch** - OEM vehicle route planning
8. **Alert** - Real-time alerting system

### Enhanced Models (5)
1. **Organization** - Multi-tenant foundation
2. **User** - Added hierarchy, department, new roles
3. **Vendor** - Multi-OEM support
4. **PurchaseOrder** - Quotation linkage, flexible approval
5. **VendorInvoice** - PO linkage, vehicle dispatch

### New Enums (4)
1. **Department** - executive, production, planning, quality, vendor
2. **JobWorkType** - with_material, maesof
3. **POStatus** - draft, pending_approval, approved, rejected, in_progress, completed, cancelled
4. **QualityStatus** - pending, in_progress, passed, failed, conditional_pass

---

## Support

For issues or questions:
1. Check the [Real-World Walkthrough](../../../.gemini/antigravity/brain/48e66559-ee08-482c-8ebe-1b51107d2e61/real_world_walkthrough.md)
2. Review the [Implementation Plan](../../../.gemini/antigravity/brain/48e66559-ee08-482c-8ebe-1b51107d2e61/implementation_plan.md)
3. Inspect the schema: `backend/prisma/schema.prisma`

---

**🎉 You're now ready to build a complete, production-ready VMS SaaS platform!**
