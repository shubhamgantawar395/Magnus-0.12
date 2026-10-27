-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'customer', 'vendor', 'platform_admin', 'director', 'executive', 'gm', 'production_manager', 'ppc_manager', 'quality_head', 'vendor_owner', 'vendor_ppc', 'vendor_supervisor', 'vendor_user', 'plant_head', 'accounts_manager', 'quality_supervisor', 'store_keeper');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('executive', 'production', 'planning', 'quality', 'vendor');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "ChallanStatus" AS ENUM ('draft', 'issued', 'received', 'rejected', 'closed');

-- CreateEnum
CREATE TYPE "ProcessStatus" AS ENUM ('pending', 'in_progress', 'completed', 'rejected');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('planned', 'in_transit', 'delivered');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'submitted', 'approved', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('tax_invoice', 'job_work_invoice');

-- CreateEnum
CREATE TYPE "JobWorkType" AS ENUM ('with_material', 'maesof');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "QualityStatus" AS ENUM ('pending', 'in_progress', 'passed', 'failed', 'conditional_pass');

-- CreateEnum
CREATE TYPE "ExecutionType" AS ENUM ('inhouse', 'outsourced');

-- CreateEnum
CREATE TYPE "DevStage" AS ENUM ('drawing_shared', 'sample_submitted', 'first_article_inspection', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "CustomerOrderStatus" AS ENUM ('active', 'completed', 'cancelled', 'on_hold');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('pending_inspection', 'inspected', 'accepted', 'partially_accepted', 'rejected');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('material_issued', 'material_returned', 'rejected_returned', 'adjustment');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "gstin" TEXT,
    "pan" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "contactPerson" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'trial',
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'active',
    "subscriptionStartDate" TIMESTAMP(3),
    "subscriptionEndDate" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "maxVendors" INTEGER NOT NULL DEFAULT 10,
    "maxChallansPerMonth" INTEGER NOT NULL DEFAULT 100,
    "primaryColor" TEXT DEFAULT '#2196f3',
    "allowedModules" TEXT[] DEFAULT ARRAY['core']::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3),
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'production_manager',
    "roleLevel" INTEGER NOT NULL DEFAULT 5,
    "department" "Department",
    "designation" TEXT,
    "organizationId" TEXT,
    "reportsToId" TEXT,
    "vendorId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyName" TEXT NOT NULL,
    "createdById" TEXT,
    "organizationId" TEXT,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountNumber" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "bankName" TEXT,
    "companyName" TEXT NOT NULL,
    "customerId" TEXT,
    "ifscCode" TEXT,
    "logoUrl" TEXT,
    "organizationId" TEXT,
    "vendorCode" TEXT NOT NULL,
    "status" "VendorStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationVendor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorCapability" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "processName" TEXT NOT NULL,
    "machineCount" INTEGER,
    "capacityPerMonth" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryChallan" (
    "id" TEXT NOT NULL,
    "challanNumber" TEXT NOT NULL,
    "challanDate" TIMESTAMP(3) NOT NULL,
    "copyType" TEXT NOT NULL DEFAULT 'Original',
    "organizationId" TEXT,
    "poId" TEXT,
    "jobWorkType" "JobWorkType",
    "poNumber" TEXT,
    "placeOfSupply" TEXT,
    "vehicleNumber" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "transporterName" TEXT,
    "transportMode" TEXT,
    "ewayBillNumber" TEXT,
    "ewayBillDate" TIMESTAMP(3),
    "ewayBillExpiry" TIMESTAMP(3),
    "remarks" TEXT,
    "totalQuantity" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION,
    "status" "ChallanStatus" NOT NULL DEFAULT 'draft',
    "customerId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryChallan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallanItem" (
    "id" TEXT NOT NULL,
    "challanId" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "partDescription" TEXT,
    "hsnCode" TEXT,
    "outputPartNumber" TEXT,
    "outputDescription" TEXT,
    "poItemId" TEXT,
    "quantityIssued" INTEGER NOT NULL,
    "unitOfMeasure" TEXT,
    "materialGrade" TEXT,
    "drawingReference" TEXT,
    "unitPrice" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deadlineNote" TEXT,
    "executiveDeadline" TIMESTAMP(3),

    CONSTRAINT "ChallanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobProcess" (
    "id" TEXT NOT NULL,
    "challanItemId" TEXT NOT NULL,
    "processName" TEXT NOT NULL,
    "processType" TEXT,
    "processSequence" INTEGER,
    "executionType" "ExecutionType" NOT NULL DEFAULT 'outsourced',
    "machineId" TEXT,
    "status" "ProcessStatus" NOT NULL DEFAULT 'pending',
    "targetQuantity" INTEGER,
    "completedQuantity" INTEGER NOT NULL DEFAULT 0,
    "rejectedQuantity" INTEGER NOT NULL DEFAULT 0,
    "reworkQuantity" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessUpdate" (
    "id" TEXT NOT NULL,
    "jobProcessId" TEXT NOT NULL,
    "quantityCompleted" INTEGER NOT NULL,
    "quantityRejected" INTEGER NOT NULL DEFAULT 0,
    "quantityRework" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchPlan" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "plannedDate" TIMESTAMP(3) NOT NULL,
    "vehicleNumber" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "status" "DispatchStatus" NOT NULL DEFAULT 'planned',
    "totalTrays" INTEGER,
    "notes" TEXT,
    "createdById" TEXT,
    "vehicleDispatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchItem" (
    "id" TEXT NOT NULL,
    "dispatchPlanId" TEXT NOT NULL,
    "challanItemId" TEXT NOT NULL,
    "quantityDispatched" INTEGER NOT NULL,
    "traysUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceType" "InvoiceType" NOT NULL DEFAULT 'tax_invoice',
    "vendorId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "paymentTerms" TEXT,
    "remarks" TEXT,
    "invoicePdfUrl" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "challanId" TEXT,
    "partNumber" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "vendorId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "poId" TEXT,
    "vehicleDispatchId" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "cgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "vendorGstin" TEXT,
    "customerGstin" TEXT,
    "placeOfSupply" TEXT,
    "isInterState" BOOLEAN NOT NULL DEFAULT false,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceAmount" DOUBLE PRECISION NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorInvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "challanItemId" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "partDescription" TEXT,
    "hsnCode" TEXT,
    "challanQuantity" INTEGER NOT NULL,
    "invoiceQuantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "cgstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "operationName" TEXT,

    CONSTRAINT "VendorInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrayConfiguration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "partNumber" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'NOS',
    "stages" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrayConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "poDate" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "quotationId" TEXT,
    "jobWorkType" "JobWorkType" NOT NULL,
    "deliveryDate" TIMESTAMP(3),
    "deliveryAddress" TEXT,
    "paymentTerms" TEXT,
    "advancePayment" DOUBLE PRECISION DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "cgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "POStatus" NOT NULL DEFAULT 'draft',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "termsAndConditions" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POItem" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "partDescription" TEXT,
    "hsnCode" TEXT,
    "drawingNumber" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'NOS',
    "operations" TEXT[],
    "ratePerPiece" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "materialGrade" TEXT,
    "materialCost" DOUBLE PRECISION DEFAULT 0,
    "deliverySchedule" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "POItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorRateCard" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "rateType" TEXT NOT NULL,
    "baseRate" DOUBLE PRECISION NOT NULL,
    "minimumCharge" DOUBLE PRECISION,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorRateCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockStatement" (
    "id" TEXT NOT NULL,
    "statementNumber" TEXT NOT NULL,
    "statementDate" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "managedById" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockStatementItem" (
    "id" TEXT NOT NULL,
    "stockStatementId" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "partDescription" TEXT,
    "openingBalance" INTEGER NOT NULL DEFAULT 0,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "consumedQty" INTEGER NOT NULL DEFAULT 0,
    "rejectedQty" INTEGER NOT NULL DEFAULT 0,
    "returnedQty" INTEGER NOT NULL DEFAULT 0,
    "closingBalance" INTEGER NOT NULL,
    "physicalStock" INTEGER,
    "variance" INTEGER,
    "varianceReason" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockStatementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallanStockItem" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "challanId" TEXT NOT NULL,
    "challanNumber" TEXT NOT NULL,
    "challanDate" TIMESTAMP(3) NOT NULL,
    "partNumber" TEXT NOT NULL,
    "partName" TEXT,
    "challanQty" INTEGER NOT NULL,
    "dispatchQty" INTEGER NOT NULL,
    "balanceQty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallanStockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityCheck" (
    "id" TEXT NOT NULL,
    "checkNumber" TEXT NOT NULL,
    "checkDate" TIMESTAMP(3) NOT NULL,
    "challanId" TEXT,
    "jobProcessId" TEXT,
    "inspectorId" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "acceptedQty" INTEGER NOT NULL,
    "rejectedQty" INTEGER NOT NULL,
    "reworkQty" INTEGER NOT NULL,
    "status" "QualityStatus" NOT NULL,
    "defects" JSONB,
    "remarks" TEXT,
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EndCustomer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "gstin" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EndCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Part" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "endCustomerId" TEXT,
    "partNumber" TEXT NOT NULL,
    "partName" TEXT,
    "description" TEXT,
    "drawingNumber" TEXT,
    "revision" TEXT,
    "materialGrade" TEXT,
    "hsnCode" TEXT,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'NOS',
    "weight" DOUBLE PRECISION,
    "operations" JSONB,
    "currentStatus" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartOperation" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "operationCode" TEXT,
    "operationName" TEXT NOT NULL,
    "executionType" "ExecutionType" NOT NULL DEFAULT 'inhouse',
    "machineType" TEXT,
    "vendorCapability" TEXT,
    "standardCycleTime" DOUBLE PRECISION,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorQuotation" (
    "id" TEXT NOT NULL,
    "quotationNumber" TEXT NOT NULL,
    "quotationDate" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "rfqNumber" TEXT,
    "rfqDate" TIMESTAMP(3),
    "items" JSONB NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "paymentTerms" TEXT,
    "deliveryTerms" TEXT,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorQuotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirstArticleInspection" (
    "id" TEXT NOT NULL,
    "faiNumber" TEXT NOT NULL,
    "faiDate" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "poId" TEXT,
    "inspectorId" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "inspectionSheet" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "attachments" TEXT[],
    "partDevelopmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FirstArticleInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NonConformanceReport" (
    "id" TEXT NOT NULL,
    "ncrNumber" TEXT NOT NULL,
    "ncrDate" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "qualityCheckId" TEXT,
    "vendorId" TEXT NOT NULL,
    "issueDescription" TEXT NOT NULL,
    "defectType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "quantityAffected" INTEGER NOT NULL,
    "d1_team" TEXT,
    "d2_problem" TEXT,
    "d3_containment" TEXT,
    "d4_rootCause" TEXT,
    "d5_corrective" TEXT,
    "d6_implementation" TEXT,
    "d7_prevention" TEXT,
    "d8_congratulate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NonConformanceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceVerification" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "securityVerifiedById" TEXT,
    "securityVerifiedAt" TIMESTAMP(3),
    "securityRemarks" TEXT,
    "ppcVerifiedById" TEXT,
    "ppcVerifiedAt" TIMESTAMP(3),
    "ppcRemarks" TEXT,
    "accountsApprovedById" TEXT,
    "accountsApprovedAt" TIMESTAMP(3),
    "accountsRemarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDispatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverPhone" TEXT,
    "dispatchDate" TIMESTAMP(3) NOT NULL,
    "plannedBy" TEXT NOT NULL,
    "route" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "completedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "recipientIds" TEXT[],
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readBy" TEXT[],
    "actionRequired" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "machineCode" TEXT NOT NULL,
    "machineName" TEXT NOT NULL,
    "machineType" TEXT NOT NULL,
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartDevelopment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "stage" "DevStage" NOT NULL DEFAULT 'drawing_shared',
    "drawingVersion" TEXT,
    "drawingUrl" TEXT,
    "targetDate" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectionReason" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartDevelopment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerPoRef" TEXT,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "deliveryDate" TIMESTAMP(3),
    "remarks" TEXT,
    "status" "CustomerOrderStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "customerPartNo" TEXT,
    "partDescription" TEXT,
    "quantity" INTEGER NOT NULL,
    "deliveredQty" INTEGER NOT NULL DEFAULT 0,
    "pendingQty" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION,
    "deliveryDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialReceipt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "receiptDate" TIMESTAMP(3) NOT NULL,
    "vendorId" TEXT NOT NULL,
    "dispatchPlanId" TEXT,
    "vehicleNumber" TEXT,
    "driverName" TEXT,
    "receivedById" TEXT NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'pending_inspection',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialReceiptItem" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "challanItemId" TEXT NOT NULL,
    "expectedQty" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL,
    "shortQty" INTEGER NOT NULL DEFAULT 0,
    "excessQty" INTEGER NOT NULL DEFAULT 0,
    "rejectedAtGate" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorMaterialLedger" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "challanId" TEXT,
    "receiptId" TEXT,
    "quantity" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorMaterialLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "organizationId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_gstin_key" ON "Organization"("gstin");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_gstin_key" ON "Customer"("gstin");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_gstin_key" ON "Vendor"("gstin");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_vendorCode_key" ON "Vendor"("vendorCode");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationVendor_organizationId_vendorId_key" ON "OrganizationVendor"("organizationId", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryChallan_challanNumber_key" ON "DeliveryChallan"("challanNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VendorInvoice_invoiceNumber_key" ON "VendorInvoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TrayConfiguration_organizationId_customerId_partNumber_key" ON "TrayConfiguration"("organizationId", "customerId", "partNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StockStatement_statementNumber_key" ON "StockStatement"("statementNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StockStatement_organizationId_vendorId_statementNumber_key" ON "StockStatement"("organizationId", "vendorId", "statementNumber");

-- CreateIndex
CREATE INDEX "ChallanStockItem_statementId_challanId_idx" ON "ChallanStockItem"("statementId", "challanId");

-- CreateIndex
CREATE INDEX "ChallanStockItem_partNumber_idx" ON "ChallanStockItem"("partNumber");

-- CreateIndex
CREATE UNIQUE INDEX "QualityCheck_checkNumber_key" ON "QualityCheck"("checkNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EndCustomer_code_key" ON "EndCustomer"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Part_organizationId_partNumber_key" ON "Part"("organizationId", "partNumber");

-- CreateIndex
CREATE INDEX "PartOperation_partId_idx" ON "PartOperation"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "PartOperation_partId_sequenceNumber_key" ON "PartOperation"("partId", "sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VendorQuotation_quotationNumber_key" ON "VendorQuotation"("quotationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FirstArticleInspection_faiNumber_key" ON "FirstArticleInspection"("faiNumber");

-- CreateIndex
CREATE UNIQUE INDEX "NonConformanceReport_ncrNumber_key" ON "NonConformanceReport"("ncrNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceVerification_invoiceId_key" ON "InvoiceVerification"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Machine_machineCode_key" ON "Machine"("machineCode");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerOrder_orderNumber_key" ON "CustomerOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialReceipt_receiptNumber_key" ON "MaterialReceipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "VendorMaterialLedger_organizationId_vendorId_partNumber_idx" ON "VendorMaterialLedger"("organizationId", "vendorId", "partNumber");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_reportsToId_fkey" FOREIGN KEY ("reportsToId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationVendor" ADD CONSTRAINT "OrganizationVendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationVendor" ADD CONSTRAINT "OrganizationVendor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorCapability" ADD CONSTRAINT "VendorCapability_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryChallan" ADD CONSTRAINT "DeliveryChallan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryChallan" ADD CONSTRAINT "DeliveryChallan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryChallan" ADD CONSTRAINT "DeliveryChallan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryChallan" ADD CONSTRAINT "DeliveryChallan_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryChallan" ADD CONSTRAINT "DeliveryChallan_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallanItem" ADD CONSTRAINT "ChallanItem_challanId_fkey" FOREIGN KEY ("challanId") REFERENCES "DeliveryChallan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallanItem" ADD CONSTRAINT "ChallanItem_poItemId_fkey" FOREIGN KEY ("poItemId") REFERENCES "POItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobProcess" ADD CONSTRAINT "JobProcess_challanItemId_fkey" FOREIGN KEY ("challanItemId") REFERENCES "ChallanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobProcess" ADD CONSTRAINT "JobProcess_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessUpdate" ADD CONSTRAINT "ProcessUpdate_jobProcessId_fkey" FOREIGN KEY ("jobProcessId") REFERENCES "JobProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessUpdate" ADD CONSTRAINT "ProcessUpdate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchPlan" ADD CONSTRAINT "DispatchPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchPlan" ADD CONSTRAINT "DispatchPlan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchPlan" ADD CONSTRAINT "DispatchPlan_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchPlan" ADD CONSTRAINT "DispatchPlan_vehicleDispatchId_fkey" FOREIGN KEY ("vehicleDispatchId") REFERENCES "VehicleDispatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchItem" ADD CONSTRAINT "DispatchItem_challanItemId_fkey" FOREIGN KEY ("challanItemId") REFERENCES "ChallanItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchItem" ADD CONSTRAINT "DispatchItem_dispatchPlanId_fkey" FOREIGN KEY ("dispatchPlanId") REFERENCES "DispatchPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_challanId_fkey" FOREIGN KEY ("challanId") REFERENCES "DeliveryChallan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_vehicleDispatchId_fkey" FOREIGN KEY ("vehicleDispatchId") REFERENCES "VehicleDispatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoiceItem" ADD CONSTRAINT "VendorInvoiceItem_challanItemId_fkey" FOREIGN KEY ("challanItemId") REFERENCES "ChallanItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoiceItem" ADD CONSTRAINT "VendorInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "VendorInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrayConfiguration" ADD CONSTRAINT "TrayConfiguration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrayConfiguration" ADD CONSTRAINT "TrayConfiguration_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "VendorQuotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POItem" ADD CONSTRAINT "POItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRateCard" ADD CONSTRAINT "VendorRateCard_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockStatement" ADD CONSTRAINT "StockStatement_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockStatement" ADD CONSTRAINT "StockStatement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockStatement" ADD CONSTRAINT "StockStatement_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockStatement" ADD CONSTRAINT "StockStatement_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockStatementItem" ADD CONSTRAINT "StockStatementItem_stockStatementId_fkey" FOREIGN KEY ("stockStatementId") REFERENCES "StockStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallanStockItem" ADD CONSTRAINT "ChallanStockItem_challanId_fkey" FOREIGN KEY ("challanId") REFERENCES "DeliveryChallan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallanStockItem" ADD CONSTRAINT "ChallanStockItem_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "StockStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_challanId_fkey" FOREIGN KEY ("challanId") REFERENCES "DeliveryChallan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_jobProcessId_fkey" FOREIGN KEY ("jobProcessId") REFERENCES "JobProcess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EndCustomer" ADD CONSTRAINT "EndCustomer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Part" ADD CONSTRAINT "Part_endCustomerId_fkey" FOREIGN KEY ("endCustomerId") REFERENCES "EndCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Part" ADD CONSTRAINT "Part_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartOperation" ADD CONSTRAINT "PartOperation_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartOperation" ADD CONSTRAINT "PartOperation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuotation" ADD CONSTRAINT "VendorQuotation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuotation" ADD CONSTRAINT "VendorQuotation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuotation" ADD CONSTRAINT "VendorQuotation_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirstArticleInspection" ADD CONSTRAINT "FirstArticleInspection_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirstArticleInspection" ADD CONSTRAINT "FirstArticleInspection_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirstArticleInspection" ADD CONSTRAINT "FirstArticleInspection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirstArticleInspection" ADD CONSTRAINT "FirstArticleInspection_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirstArticleInspection" ADD CONSTRAINT "FirstArticleInspection_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirstArticleInspection" ADD CONSTRAINT "FirstArticleInspection_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirstArticleInspection" ADD CONSTRAINT "FirstArticleInspection_partDevelopmentId_fkey" FOREIGN KEY ("partDevelopmentId") REFERENCES "PartDevelopment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformanceReport" ADD CONSTRAINT "NonConformanceReport_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformanceReport" ADD CONSTRAINT "NonConformanceReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformanceReport" ADD CONSTRAINT "NonConformanceReport_qualityCheckId_fkey" FOREIGN KEY ("qualityCheckId") REFERENCES "QualityCheck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformanceReport" ADD CONSTRAINT "NonConformanceReport_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceVerification" ADD CONSTRAINT "InvoiceVerification_accountsApprovedById_fkey" FOREIGN KEY ("accountsApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceVerification" ADD CONSTRAINT "InvoiceVerification_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "VendorInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceVerification" ADD CONSTRAINT "InvoiceVerification_ppcVerifiedById_fkey" FOREIGN KEY ("ppcVerifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceVerification" ADD CONSTRAINT "InvoiceVerification_securityVerifiedById_fkey" FOREIGN KEY ("securityVerifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDispatch" ADD CONSTRAINT "VehicleDispatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDispatch" ADD CONSTRAINT "VehicleDispatch_plannedBy_fkey" FOREIGN KEY ("plannedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartDevelopment" ADD CONSTRAINT "PartDevelopment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartDevelopment" ADD CONSTRAINT "PartDevelopment_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartDevelopment" ADD CONSTRAINT "PartDevelopment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartDevelopment" ADD CONSTRAINT "PartDevelopment_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrderItem" ADD CONSTRAINT "CustomerOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_dispatchPlanId_fkey" FOREIGN KEY ("dispatchPlanId") REFERENCES "DispatchPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceiptItem" ADD CONSTRAINT "MaterialReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "MaterialReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceiptItem" ADD CONSTRAINT "MaterialReceiptItem_challanItemId_fkey" FOREIGN KEY ("challanItemId") REFERENCES "ChallanItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMaterialLedger" ADD CONSTRAINT "VendorMaterialLedger_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMaterialLedger" ADD CONSTRAINT "VendorMaterialLedger_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMaterialLedger" ADD CONSTRAINT "VendorMaterialLedger_challanId_fkey" FOREIGN KEY ("challanId") REFERENCES "DeliveryChallan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMaterialLedger" ADD CONSTRAINT "VendorMaterialLedger_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "MaterialReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
