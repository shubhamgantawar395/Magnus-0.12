-- Migration: supplier_grn
-- Adds SupplierGRN and SupplierGRNItem tables + GRNStatus enum
-- Run with: npx prisma migrate deploy  (or npx prisma migrate dev --name supplier_grn)

-- 1. Enum
CREATE TYPE "GRNStatus" AS ENUM ('draft', 'received', 'inspected');

-- 2. SupplierGRN table
CREATE TABLE "SupplierGRN" (
    "id"              TEXT NOT NULL,
    "organizationId"  TEXT NOT NULL,
    "grnNumber"       TEXT NOT NULL,
    "grnDate"         TIMESTAMP(3) NOT NULL,
    "supplierId"      TEXT NOT NULL,
    "poId"            TEXT,
    "vehicleNumber"   TEXT,
    "driverName"      TEXT,
    "driverPhone"     TEXT,
    "invoiceNumber"   TEXT,
    "remarks"         TEXT,
    "status"          "GRNStatus" NOT NULL DEFAULT 'draft',
    "receivedById"    TEXT NOT NULL,
    "inspectedById"   TEXT,
    "inspectedAt"     TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierGRN_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on GRN number
CREATE UNIQUE INDEX "SupplierGRN_grnNumber_key" ON "SupplierGRN"("grnNumber");

-- Indexes
CREATE INDEX "SupplierGRN_organizationId_supplierId_idx"  ON "SupplierGRN"("organizationId", "supplierId");
CREATE INDEX "SupplierGRN_organizationId_grnDate_idx"     ON "SupplierGRN"("organizationId", "grnDate");

-- 3. SupplierGRNItem table
CREATE TABLE "SupplierGRNItem" (
    "id"              TEXT NOT NULL,
    "grnId"           TEXT NOT NULL,
    "poItemId"        TEXT,
    "partNumber"      TEXT NOT NULL,
    "partDescription" TEXT,
    "expectedQty"     INTEGER NOT NULL DEFAULT 0,
    "receivedQty"     INTEGER NOT NULL,
    "rejectedQty"     INTEGER NOT NULL DEFAULT 0,
    "remarks"         TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierGRNItem_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "SupplierGRNItem_grnId_idx"       ON "SupplierGRNItem"("grnId");
CREATE INDEX "SupplierGRNItem_partNumber_idx"   ON "SupplierGRNItem"("partNumber");

-- 4. Foreign keys — SupplierGRN
ALTER TABLE "SupplierGRN"
    ADD CONSTRAINT "SupplierGRN_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplierGRN"
    ADD CONSTRAINT "SupplierGRN_supplierId_fkey"
        FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplierGRN"
    ADD CONSTRAINT "SupplierGRN_poId_fkey"
        FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupplierGRN"
    ADD CONSTRAINT "SupplierGRN_receivedById_fkey"
        FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplierGRN"
    ADD CONSTRAINT "SupplierGRN_inspectedById_fkey"
        FOREIGN KEY ("inspectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Foreign keys — SupplierGRNItem
ALTER TABLE "SupplierGRNItem"
    ADD CONSTRAINT "SupplierGRNItem_grnId_fkey"
        FOREIGN KEY ("grnId") REFERENCES "SupplierGRN"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupplierGRNItem"
    ADD CONSTRAINT "SupplierGRNItem_poItemId_fkey"
        FOREIGN KEY ("poItemId") REFERENCES "POItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
