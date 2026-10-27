-- Performance indexes migration
-- Adds indexes on all high-frequency query columns identified in perf audit.
-- Run: npx prisma migrate deploy  (or  npx prisma db push  in dev)

-- Vendor
CREATE INDEX IF NOT EXISTS "Vendor_organizationId_idx" ON "Vendor"("organizationId");
CREATE INDEX IF NOT EXISTS "Vendor_status_idx" ON "Vendor"("status");

-- DeliveryChallan
CREATE INDEX IF NOT EXISTS "DeliveryChallan_vendorId_idx" ON "DeliveryChallan"("vendorId");
CREATE INDEX IF NOT EXISTS "DeliveryChallan_organizationId_idx" ON "DeliveryChallan"("organizationId");
CREATE INDEX IF NOT EXISTS "DeliveryChallan_challanDate_idx" ON "DeliveryChallan"("challanDate");
CREATE INDEX IF NOT EXISTS "DeliveryChallan_status_idx" ON "DeliveryChallan"("status");

-- ChallanItem
CREATE INDEX IF NOT EXISTS "ChallanItem_challanId_idx" ON "ChallanItem"("challanId");
CREATE INDEX IF NOT EXISTS "ChallanItem_partNumber_idx" ON "ChallanItem"("partNumber");

-- JobProcess
CREATE INDEX IF NOT EXISTS "JobProcess_challanItemId_idx" ON "JobProcess"("challanItemId");
CREATE INDEX IF NOT EXISTS "JobProcess_status_idx" ON "JobProcess"("status");
CREATE INDEX IF NOT EXISTS "JobProcess_processSequence_idx" ON "JobProcess"("processSequence");

-- ProcessUpdate
CREATE INDEX IF NOT EXISTS "ProcessUpdate_jobProcessId_idx" ON "ProcessUpdate"("jobProcessId");

-- VendorInvoiceItem
CREATE INDEX IF NOT EXISTS "VendorInvoiceItem_challanItemId_idx" ON "VendorInvoiceItem"("challanItemId");
CREATE INDEX IF NOT EXISTS "VendorInvoiceItem_invoiceId_idx" ON "VendorInvoiceItem"("invoiceId");

-- CustomerOrderItem
CREATE INDEX IF NOT EXISTS "CustomerOrderItem_partNumber_idx" ON "CustomerOrderItem"("partNumber");
CREATE INDEX IF NOT EXISTS "CustomerOrderItem_orderId_idx" ON "CustomerOrderItem"("orderId");
