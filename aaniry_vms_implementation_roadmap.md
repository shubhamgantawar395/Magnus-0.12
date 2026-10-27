# Aaniry Vendor Management System (VMS)
## Complete Implementation Roadmap

**Document Version:** 1.0  
**Date:** February 5, 2026  
**Prepared for:** Aaniry Overseas Pvt. Ltd.

---

## Executive Summary

The Aaniry VMS is a purpose-built B2B platform designed to digitize and streamline CNC machining vendor management, eliminating phone-based coordination and creating real-time visibility across the entire job lifecycle. This document provides a detailed implementation blueprint covering technical architecture, development phases, UI/UX design, and go-to-market strategy.

**Key Business Impact:**
- Zero phone-call PPC coordination
- Real-time job visibility across vendors
- 60%+ reduction in dispatch planning time
- Strong vendor stickiness through daily usage
- Foundation for industrial SaaS product

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [Feature Specifications](#feature-specifications)
5. [User Interface Design](#user-interface-design)
6. [API Architecture](#api-architecture)
7. [Implementation Phases](#implementation-phases)
8. [Security & Compliance](#security-compliance)
9. [SaaS Product Strategy](#saas-product-strategy)
10. [Risk Mitigation](#risk-mitigation)

---

## 1. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web App    │  │  Mobile Web  │  │   Desktop    │      │
│  │  (React)     │  │  (PWA)       │  │   (Electron) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway / Load Balancer               │
│                     (nginx + SSL/TLS)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Application Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Service │  │  Job Engine  │  │  Document    │      │
│  │    (JWT)     │  │              │  │  Generator   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Notification │  │  Analytics   │  │  Integration │      │
│  │   Service    │  │   Engine     │  │    Layer     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │    Redis     │  │  File Store  │      │
│  │  (Primary)   │  │   (Cache)    │  │   (S3/DO)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

**Frontend Architecture:**
- React 18 with TypeScript for type safety
- Next.js 14 for SSR and optimized routing
- Tailwind CSS for consistent styling
- Zustand for state management
- React Query for server state
- Chart.js for analytics visualization

**Backend Architecture:**
- Node.js with NestJS framework
- Modular monolith architecture (microservices-ready)
- Repository pattern for data access
- Event-driven for inter-service communication
- Queue system (Bull) for async jobs

**Data Architecture:**
- PostgreSQL for relational data
- Redis for session management and caching
- S3-compatible storage for documents
- Full-text search with PostgreSQL

---

## 2. Technology Stack

### Frontend Stack
```javascript
{
  "framework": "Next.js 14",
  "language": "TypeScript 5.3",
  "styling": "Tailwind CSS 3.4",
  "stateManagement": "Zustand",
  "dataFetching": "React Query (TanStack Query)",
  "forms": "React Hook Form + Zod",
  "charts": "Chart.js / Recharts",
  "tables": "TanStack Table",
  "dateHandling": "date-fns",
  "notifications": "React Hot Toast",
  "icons": "Lucide React"
}
```

### Backend Stack
```javascript
{
  "runtime": "Node.js 20 LTS",
  "framework": "NestJS 10",
  "language": "TypeScript 5.3",
  "orm": "Prisma",
  "validation": "class-validator",
  "authentication": "Passport JWT",
  "documentation": "Swagger/OpenAPI",
  "testing": "Jest + Supertest",
  "queue": "Bull (Redis-based)",
  "logging": "Winston"
}
```

### Database & Infrastructure
```javascript
{
  "database": "PostgreSQL 16",
  "cache": "Redis 7",
  "storage": "DigitalOcean Spaces (S3-compatible)",
  "hosting": "DigitalOcean App Platform / AWS",
  "cdn": "Cloudflare",
  "monitoring": "Sentry + DataDog",
  "email": "SendGrid / Amazon SES",
  "sms": "Twilio (optional)"
}
```

### Development Tools
```javascript
{
  "versionControl": "Git + GitHub",
  "cicd": "GitHub Actions",
  "containerization": "Docker + Docker Compose",
  "apiTesting": "Postman / Insomnia",
  "codeQuality": "ESLint + Prettier",
  "typeChecking": "TypeScript strict mode"
}
```

---

## 3. Database Schema

### Core Tables

```sql
-- Users & Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'admin', 'customer', 'vendor'
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Organizations (Customers/OEMs)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15) UNIQUE NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    contact_person VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Vendors (Machining Suppliers)
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15) UNIQUE NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    contact_person VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, suspended
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Vendor Capabilities
CREATE TABLE vendor_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    process_name VARCHAR(100) NOT NULL, -- 'Turning', 'VMC', 'Grinding', etc.
    machine_count INTEGER,
    capacity_per_month INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Delivery Challans (Material Issued to Vendor)
CREATE TABLE delivery_challans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challan_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    vendor_id UUID REFERENCES vendors(id),
    challan_date DATE NOT NULL,
    vehicle_number VARCHAR(50),
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),
    total_quantity INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'issued', -- issued, in_process, completed, closed
    remarks TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Challan Items (Parts in Challan)
CREATE TABLE challan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challan_id UUID REFERENCES delivery_challans(id) ON DELETE CASCADE,
    part_number VARCHAR(100) NOT NULL,
    part_description TEXT,
    quantity_issued INTEGER NOT NULL,
    unit_of_measure VARCHAR(20) DEFAULT 'NOS',
    material_grade VARCHAR(50),
    drawing_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Job Process Definitions (Custom Workflows)
CREATE TABLE job_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challan_item_id UUID REFERENCES challan_items(id) ON DELETE CASCADE,
    process_sequence INTEGER NOT NULL, -- 1, 2, 3...
    process_name VARCHAR(100) NOT NULL,
    process_type VARCHAR(50), -- 'turning', 'milling', 'grinding', 'coating', etc.
    target_quantity INTEGER,
    completed_quantity INTEGER DEFAULT 0,
    rejected_quantity INTEGER DEFAULT 0,
    rework_quantity INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(challan_item_id, process_sequence)
);

-- Process Updates Log
CREATE TABLE process_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_process_id UUID REFERENCES job_processes(id) ON DELETE CASCADE,
    quantity_completed INTEGER NOT NULL,
    quantity_rejected INTEGER DEFAULT 0,
    quantity_rework INTEGER DEFAULT 0,
    remarks TEXT,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Dispatch Planning
CREATE TABLE dispatch_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    vendor_id UUID REFERENCES vendors(id),
    planned_date DATE NOT NULL,
    vehicle_number VARCHAR(50),
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),
    status VARCHAR(50) DEFAULT 'planned', -- planned, in_transit, delivered
    total_trays INTEGER,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Dispatch Items
CREATE TABLE dispatch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_plan_id UUID REFERENCES dispatch_plans(id) ON DELETE CASCADE,
    challan_item_id UUID REFERENCES challan_items(id),
    quantity_dispatched INTEGER NOT NULL,
    trays_used INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Invoices (Vendor to Customer)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_type VARCHAR(50) DEFAULT 'tax_invoice', -- tax_invoice, job_work_invoice
    vendor_id UUID REFERENCES vendors(id),
    customer_id UUID REFERENCES customers(id),
    invoice_date DATE NOT NULL,
    due_date DATE,
    total_amount DECIMAL(15,2) NOT NULL,
    cgst_amount DECIMAL(15,2) DEFAULT 0,
    sgst_amount DECIMAL(15,2) DEFAULT 0,
    igst_amount DECIMAL(15,2) DEFAULT 0,
    grand_total DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, paid, cancelled
    payment_terms TEXT,
    remarks TEXT,
    invoice_pdf_url TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoice Line Items
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    challan_id UUID REFERENCES delivery_challans(id),
    part_number VARCHAR(100) NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL,
    rate DECIMAL(10,2) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Documents (Generic Storage)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'challan', 'invoice', 'vendor', etc.
    entity_id UUID NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- 'pdf', 'image', 'drawing'
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    changes JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_challans_vendor ON delivery_challans(vendor_id);
CREATE INDEX idx_challans_customer ON delivery_challans(customer_id);
CREATE INDEX idx_challans_status ON delivery_challans(status);
CREATE INDEX idx_job_processes_status ON job_processes(status);
CREATE INDEX idx_invoices_vendor ON invoices(vendor_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
```

---

## 4. Feature Specifications

### 4.1 Vendor Onboarding & Management

**Admin Features:**
- Create and approve vendor accounts
- View vendor capabilities and machines
- Suspend/reactivate vendors
- Export vendor list

**Vendor Profile Management:**
```typescript
interface VendorProfile {
  companyName: string;
  gstin: string;
  address: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  capabilities: VendorCapability[];
  documents: Document[];
  status: 'pending' | 'approved' | 'suspended';
}

interface VendorCapability {
  processName: string;
  machineCount: number;
  capacityPerMonth: number;
  notes?: string;
}
```

**Approval Workflow:**
1. Vendor submits registration form
2. System sends email notification to admin
3. Admin reviews vendor details
4. Admin approves/rejects with comments
5. Vendor receives activation email

---

### 4.2 Delivery Challan Module

**Customer (OEM) Actions:**
- Create new delivery challan
- Add multiple parts/items
- Assign to vendor
- Track challan status
- View challan history

**Challan Form Fields:**
```typescript
interface DeliveryChallan {
  challanNumber: string; // Auto-generated or manual
  challanDate: Date;
  vendorId: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  items: ChallanItem[];
  remarks?: string;
}

interface ChallanItem {
  partNumber: string;
  partDescription: string;
  quantityIssued: number;
  unitOfMeasure: string;
  materialGrade?: string;
  drawingReference?: string;
}
```

**Auto-numbering Logic:**
- Format: `DC/[YEAR]/[MONTH]/[SEQUENCE]`
- Example: `DC/2026/02/001`

**Document Generation:**
- PDF challan with QR code
- Email to vendor automatically
- WhatsApp integration (optional)

---

### 4.3 Custom Job Lifecycle Engine

**Process Flow Builder:**
```typescript
interface JobProcess {
  id: string;
  challanItemId: string;
  processSequence: number;
  processName: string;
  processType: string;
  targetQuantity: number;
  completedQuantity: number;
  rejectedQuantity: number;
  reworkQuantity: number;
  status: 'pending' | 'in_progress' | 'completed';
  startedAt?: Date;
  completedAt?: Date;
}
```

**Process Types:**
- Turning
- VMC (Vertical Machining Center)
- CNC Milling
- Grinding
- Broaching
- Heat Treatment
- Coating
- Inspection
- Packaging

**Update Logic:**
1. Vendor selects process
2. Enters completed, rejected, rework quantities
3. System validates: completed + rejected + rework ≤ target
4. Auto-updates downstream process availability
5. Logs update with timestamp

**Example Flow:**
```
Raw Material (1000 pcs)
    ↓
Turning (1000 → 980 OK, 20 rejected)
    ↓
VMC (980 → 970 OK, 10 rejected)
    ↓
Grinding (970 → 965 OK, 5 rejected)
    ↓
Inspection (965 → 960 OK, 5 rejected)
    ↓
Ready for Dispatch: 960 pcs
```

---

### 4.4 Production Status Dashboard

**Vendor Dashboard KPIs:**
```typescript
interface VendorDashboard {
  totalJobsReceived: number;
  jobsInProgress: number;
  jobsReadyForDispatch: number;
  overdueJobs: number;
  monthlyProduction: {
    month: string;
    quantity: number;
  }[];
  processWiseStatus: {
    processName: string;
    pendingQty: number;
    completedQty: number;
  }[];
}
```

**Customer Dashboard KPIs:**
```typescript
interface CustomerDashboard {
  totalChallanssued: number;
  quantityInProcess: number;
  quantityReady: number;
  shortSupply: number;
  vendorWiseStatus: {
    vendorName: string;
    jobsActive: number;
    quantityPending: number;
    quantityReady: number;
    avgTurnaroundDays: number;
  }[];
  agingAnalysis: {
    lessThan7Days: number;
    days7to14: number;
    days14to30: number;
    moreThan30Days: number;
  };
}
```

**Real-time Updates:**
- WebSocket connection for live updates
- Notification on process completion
- Alert on rejection threshold breach

---

### 4.5 Dispatch Planning & Tray Management

**Dispatch Planning Screen:**
```typescript
interface DispatchPlan {
  id: string;
  vendorId: string;
  plannedDate: Date;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  items: DispatchItem[];
  totalTrays: number;
  status: 'planned' | 'in_transit' | 'delivered';
}

interface DispatchItem {
  challanItemId: string;
  partNumber: string;
  quantityReady: number;
  quantityToDispatch: number;
  traysRequired: number;
}
```

**Tray Calculation Logic:**
```typescript
function calculateTrays(partNumber: string, quantity: number): number {
  const trayCapacity = getTrayCapacity(partNumber);
  return Math.ceil(quantity / trayCapacity);
}
```

**Features:**
- View all ready parts across vendors
- Auto-calculate tray requirements
- Plan multi-vendor pickup routes
- Generate dispatch note
- Mark as dispatched with vehicle details

---

### 4.6 Invoice Management

**Vendor Invoice Creation:**
```typescript
interface Invoice {
  invoiceNumber: string;
  invoiceType: 'tax_invoice' | 'job_work_invoice';
  invoiceDate: Date;
  dueDate: Date;
  challanIds: string[];
  items: InvoiceItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  paymentTerms?: string;
  remarks?: string;
}

interface InvoiceItem {
  challanId: string;
  partNumber: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}
```

**GST Calculation:**
```typescript
function calculateGST(
  amount: number,
  vendorState: string,
  customerState: string
): { cgst: number; sgst: number; igst: number } {
  const gstRate = 0.18; // 18% GST
  
  if (vendorState === customerState) {
    // Intra-state: CGST + SGST
    return {
      cgst: (amount * gstRate) / 2,
      sgst: (amount * gstRate) / 2,
      igst: 0
    };
  } else {
    // Inter-state: IGST
    return {
      cgst: 0,
      sgst: 0,
      igst: amount * gstRate
    };
  }
}
```

**Invoice PDF Template:**
- Company letterhead
- GST details
- Item-wise breakdown
- Tax summary
- Payment terms
- Bank details
- Digital signature

---

### 4.7 Reports & Analytics

**Operational Reports:**

1. **Vendor Performance Report**
   - Turnaround time by vendor
   - Rejection rate trends
   - On-time delivery %
   - Capacity utilization

2. **Job Aging Report**
   - Jobs older than 7/14/30 days
   - Bottleneck process identification
   - Pending quantity by process

3. **Short Supply Register**
   - Issued vs. supplied quantity
   - Balance pending
   - Expected completion date

**Financial Reports:**

1. **Invoice Summary**
   - Pending invoices by vendor
   - Aging analysis
   - Payment due dates

2. **Vendor Payable**
   - Outstanding amount by vendor
   - Payment priority
   - Credit period analysis

**Export Options:**
- PDF for printing
- Excel for analysis
- CSV for data processing

---

## 5. User Interface Design

### 5.1 Design System

**Color Palette:**
```css
:root {
  /* Primary Colors - Industrial Blue */
  --primary-50: #e3f2fd;
  --primary-100: #bbdefb;
  --primary-500: #2196f3;
  --primary-700: #1976d2;
  --primary-900: #0d47a1;

  /* Secondary Colors - Machinery Orange */
  --secondary-500: #ff9800;
  --secondary-700: #f57c00;

  /* Neutral Colors */
  --gray-50: #fafafa;
  --gray-100: #f5f5f5;
  --gray-300: #e0e0e0;
  --gray-500: #9e9e9e;
  --gray-700: #616161;
  --gray-900: #212121;

  /* Status Colors */
  --success: #4caf50;
  --warning: #ff9800;
  --error: #f44336;
  --info: #2196f3;
}
```

**Typography:**
```css
/* Primary Font: Inter (Clean, Modern) */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* Monospace Font: JetBrains Mono (Code/Numbers) */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  line-height: 1.5;
}

.mono {
  font-family: 'JetBrains Mono', monospace;
}
```

**Component Library:**
- Buttons: Primary, Secondary, Ghost, Danger
- Forms: Input, Select, Checkbox, Radio, Date Picker
- Tables: Sortable, Filterable, Paginated
- Cards: Stat Card, Job Card, Process Card
- Modals: Confirmation, Form, Preview
- Navigation: Top Nav, Sidebar, Breadcrumbs

---

### 5.2 Screen Mockups

**Login Screen:**
```
┌──────────────────────────────────────────────┐
│                                              │
│              [Aaniry VMS Logo]               │
│         Vendor Management System             │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  Select Role:                          │ │
│  │  ( ) Admin  ( ) Customer  ( ) Vendor   │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  Email / GSTIN                         │ │
│  │  [________________________]            │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  Password                              │ │
│  │  [________________________]  👁         │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  [ ] Remember me    Forgot Password?        │
│                                              │
│       [        Login        ]                │
│                                              │
│  Don't have an account? Contact Admin       │
│                                              │
└──────────────────────────────────────────────┘
```

**Customer Dashboard:**
```
┌────────────────────────────────────────────────────────────┐
│ [Logo] Aaniry VMS          Dashboard    [User ▼] [Logout] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Dashboard > Overview                                      │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Jobs     │  │ In       │  │ Ready    │  │ Overdue  │ │
│  │ Issued   │  │ Process  │  │          │  │          │ │
│  │   156    │  │   89     │  │   45     │  │   12     │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                                                            │
│  [+ Create Challan]  [Plan Dispatch]    Search: [____]   │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Vendor    │ Part   │ Issued│Complete│Ready│Aging│ │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ ABC Mach  │ PN-001 │  500  │  400   │ 350 │ 15d │ │ │
│  │ XYZ Tools │ PN-002 │ 1000  │  850   │ 800 │  8d │ │ │
│  │ DEF Engg  │ PN-003 │  750  │  600   │ 500 │ 22d │⚠│ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  [Process-wise Status Chart]  [Aging Analysis Chart]      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Vendor Dashboard:**
```
┌────────────────────────────────────────────────────────────┐
│ [Logo] Aaniry VMS          Dashboard    [User ▼] [Logout] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Dashboard > My Jobs                                       │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Jobs     │  │ In       │  │ Ready    │  │ This     │ │
│  │ Received │  │ Process  │  │          │  │ Month    │ │
│  │   42     │  │   28     │  │   14     │  │  3,450   │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                                                            │
│  Active Jobs:                                              │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Challan: DC/2026/02/045 | Part: PN-001               │ │
│  │ ─────────────────────────────────────────────────── │ │
│  │ Turning ✓ → VMC (250/500) → Grinding → Inspection   │ │
│  │ [Update Process]                                     │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Challan: DC/2026/02/046 | Part: PN-002               │ │
│  │ ─────────────────────────────────────────────────── │ │
│  │ Turning ✓ → VMC ✓ → Broaching (180/200) → Coating   │ │
│  │ [Update Process]                                     │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Process Update Modal:**
```
┌────────────────────────────────────────────┐
│  Update Process: VMC                       │
│                                            │
│  Challan: DC/2026/02/045                   │
│  Part: PN-001 - Bearing Housing            │
│  Target Quantity: 500                      │
│                                            │
│  ┌────────────────────────────────────────┐│
│  │ Completed Quantity                     ││
│  │ [_______250_______]                    ││
│  └────────────────────────────────────────┘│
│                                            │
│  ┌────────────────────────────────────────┐│
│  │ Rejected Quantity                      ││
│  │ [________5________]                    ││
│  └────────────────────────────────────────┘│
│                                            │
│  ┌────────────────────────────────────────┐│
│  │ Rework Quantity                        ││
│  │ [________0________]                    ││
│  └────────────────────────────────────────┘│
│                                            │
│  ┌────────────────────────────────────────┐│
│  │ Remarks (optional)                     ││
│  │ [Tool breakage during operation...]   ││
│  │ [                                   ]  ││
│  └────────────────────────────────────────┘│
│                                            │
│  [Cancel]              [Update Process]    │
│                                            │
└────────────────────────────────────────────┘
```

---

## 6. API Architecture

### 6.1 RESTful API Endpoints

**Authentication:**
```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
```

**Customers:**
```
GET    /api/v1/customers
POST   /api/v1/customers
GET    /api/v1/customers/:id
PUT    /api/v1/customers/:id
DELETE /api/v1/customers/:id
```

**Vendors:**
```
GET    /api/v1/vendors
POST   /api/v1/vendors
GET    /api/v1/vendors/:id
PUT    /api/v1/vendors/:id
DELETE /api/v1/vendors/:id
POST   /api/v1/vendors/:id/approve
POST   /api/v1/vendors/:id/suspend
GET    /api/v1/vendors/:id/capabilities
POST   /api/v1/vendors/:id/capabilities
```

**Delivery Challans:**
```
GET    /api/v1/challans
POST   /api/v1/challans
GET    /api/v1/challans/:id
PUT    /api/v1/challans/:id
DELETE /api/v1/challans/:id
GET    /api/v1/challans/:id/pdf
POST   /api/v1/challans/:id/items
GET    /api/v1/challans/:id/status
```

**Job Processes:**
```
GET    /api/v1/jobs
GET    /api/v1/jobs/:challanItemId/processes
POST   /api/v1/jobs/:challanItemId/processes
GET    /api/v1/jobs/processes/:id
PUT    /api/v1/jobs/processes/:id/update
GET    /api/v1/jobs/processes/:id/history
```

**Dispatch:**
```
GET    /api/v1/dispatch/ready-items
POST   /api/v1/dispatch/plans
GET    /api/v1/dispatch/plans/:id
PUT    /api/v1/dispatch/plans/:id
DELETE /api/v1/dispatch/plans/:id
POST   /api/v1/dispatch/plans/:id/confirm
GET    /api/v1/dispatch/plans/:id/note
```

**Invoices:**
```
GET    /api/v1/invoices
POST   /api/v1/invoices
GET    /api/v1/invoices/:id
PUT    /api/v1/invoices/:id
DELETE /api/v1/invoices/:id
GET    /api/v1/invoices/:id/pdf
POST   /api/v1/invoices/:id/send
```

**Reports:**
```
GET    /api/v1/reports/vendor-performance
GET    /api/v1/reports/job-aging
GET    /api/v1/reports/short-supply
GET    /api/v1/reports/invoice-summary
GET    /api/v1/reports/dashboard-stats
```

**Analytics:**
```
GET    /api/v1/analytics/production-trends
GET    /api/v1/analytics/rejection-analysis
GET    /api/v1/analytics/turnaround-time
GET    /api/v1/analytics/capacity-utilization
```

### 6.2 API Response Format

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "challanNumber": "DC/2026/02/001",
    "vendor": {
      "id": "uuid",
      "name": "ABC Machining"
    }
  },
  "message": "Challan created successfully",
  "timestamp": "2026-02-05T10:30:00Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "quantityIssued",
        "message": "Quantity must be greater than 0"
      }
    ]
  },
  "timestamp": "2026-02-05T10:30:00Z"
}
```

**Pagination:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

### 6.3 Authentication & Authorization

**JWT Token Structure:**
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'customer' | 'vendor';
  customerId?: string;
  vendorId?: string;
  iat: number;
  exp: number;
}
```

**Role-based Access Control (RBAC):**
```typescript
const permissions = {
  admin: [
    'customers:*',
    'vendors:*',
    'challans:*',
    'jobs:*',
    'dispatch:*',
    'invoices:*',
    'reports:*'
  ],
  customer: [
    'vendors:read',
    'vendors:create',
    'challans:*',
    'jobs:read',
    'dispatch:*',
    'invoices:read',
    'reports:own'
  ],
  vendor: [
    'jobs:read',
    'jobs:update',
    'invoices:*',
    'reports:own'
  ]
};
```

---

## 7. Implementation Phases

### Phase 1: MVP (Weeks 1-6) - Core Job Tracking

**Goal:** Get basic vendor coordination working to eliminate phone calls

**Week 1-2: Foundation**
- Database setup and migrations
- Authentication system
- Basic user management
- Admin panel skeleton

**Week 3-4: Core Features**
- Vendor onboarding flow
- Delivery challan creation
- Basic job lifecycle tracking
- Simple dashboard

**Week 5-6: Essential Workflows**
- Process-wise status updates
- Production dashboard
- Basic notifications
- PDF generation for challans

**Deliverables:**
- Working system for Aaniry + Seinúmero
- Vendor can update job status
- Customer can view progress
- No phone calls needed for status

**Success Metrics:**
- 3 vendors onboarded
- 50+ challans processed
- 90% reduction in status phone calls

---

### Phase 2: Enhanced Features (Weeks 7-12)

**Week 7-8: Dispatch Planning**
- Dispatch readiness marking
- Tray calculation
- Vehicle planning
- Dispatch notes

**Week 9-10: Invoice Module**
- Invoice creation by vendor
- GST calculation
- PDF invoice generation
- Invoice tracking

**Week 11-12: Reports & Analytics**
- Vendor performance reports
- Job aging analysis
- Short supply register
- Export functionality

**Deliverables:**
- Complete dispatch coordination
- Digital invoicing
- Management reports

**Success Metrics:**
- 100% digital dispatch planning
- Zero manual invoice creation
- Weekly reports automated

---

### Phase 3: Advanced Features (Weeks 13-18)

**Week 13-14: Mobile Optimization**
- Progressive Web App (PWA)
- Mobile-responsive design
- Offline capability
- Push notifications

**Week 15-16: Integration**
- WhatsApp notifications
- Email automation
- Excel import/export
- API for ERP integration

**Week 17-18: Quality & Scale**
- Performance optimization
- Advanced analytics
- User feedback implementation
- Documentation

**Deliverables:**
- Mobile-friendly vendor app
- Automated notifications
- ERP-ready APIs

**Success Metrics:**
- 80% mobile usage by vendors
- <2s page load time
- 10+ vendors using system

---

### Phase 4: SaaS Productization (Weeks 19-24)

**Week 19-20: Multi-tenancy**
- Tenant isolation
- Custom domains
- Whitelabeling
- Usage tracking

**Week 21-22: Billing & Subscriptions**
- Stripe integration
- Subscription plans
- Usage limits
- Payment gateway

**Week 23-24: Marketing & Launch**
- Landing page
- Documentation
- Case studies
- Sales materials

**Deliverables:**
- Production-ready SaaS
- Subscription billing
- Marketing website

**Success Metrics:**
- 5 paying customers
- ₹50,000 MRR
- 95% uptime

---

## 8. Security & Compliance

### 8.1 Security Measures

**Authentication Security:**
- bcrypt for password hashing (cost factor: 12)
- JWT with 24-hour expiry
- Refresh token rotation
- Rate limiting on auth endpoints (5 attempts per 15 min)
- Account lockout after 5 failed attempts

**Data Security:**
- All data encrypted at rest (AES-256)
- TLS 1.3 for data in transit
- Database backups encrypted
- Sensitive fields (GSTIN, phone) masked in logs

**API Security:**
- Rate limiting per user (100 req/min)
- CORS configuration
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS protection

**Access Control:**
- Role-based access control (RBAC)
- Row-level security for multi-tenancy
- Audit logging for all sensitive operations
- Session management

### 8.2 Compliance

**GST Compliance:**
- GSTIN validation
- HSN/SAC code support
- E-invoice generation (future)
- GST return data export

**Data Privacy:**
- GDPR-inspired data handling
- User data export capability
- Right to deletion
- Privacy policy and terms

**Audit Trail:**
- All CRUD operations logged
- User activity tracking
- Change history for critical data
- Immutable audit logs

---

## 9. SaaS Product Strategy

### 9.1 Product Positioning

**Product Name:** Aaniry VMS (or "MachinePath" / "JobFlow360")

**Tagline:** "Vendor coordination software built by machinists, for machinists"

**Unique Value Proposition:**
- Industry-specific (not generic ERP)
- Process-wise job tracking
- Designed for Indian manufacturing workflows
- Built by people who understand machining

**Target Market:**
- Tier-1 & Tier-2 automotive OEMs
- EV component manufacturers
- Defense suppliers
- Heavy machinery manufacturers
- Multi-vendor job shops

**Market Size (India):**
- 10,000+ CNC job shops
- 5,000+ Tier-1/2 suppliers
- $500M+ addressable market

---

### 9.2 Pricing Strategy

**Starter Plan - ₹4,999/month**
- 5 vendors
- 1 customer organization
- 100 challans/month
- Basic job tracking
- Email support
- 2 user accounts

**Growth Plan - ₹14,999/month**
- 25 vendors
- Unlimited challans
- Dispatch planning
- Invoice management
- Priority email support
- 10 user accounts
- Basic reports

**Enterprise Plan - Custom Pricing**
- Unlimited vendors
- Advanced analytics
- ERP integration
- Dedicated account manager
- Custom workflows
- SLA guarantee
- Unlimited users

**Add-ons:**
- WhatsApp integration: ₹2,999/month
- Advanced analytics: ₹4,999/month
- Mobile app: ₹1,999/month per platform

**Annual Discount:** 20% off (2 months free)

---

### 9.3 Go-to-Market Strategy

**Phase 1: Proof of Concept (Months 1-3)**
- Use internally at Aaniry with 5 vendors
- Document time/cost savings
- Create video testimonials
- Build case study

**Phase 2: Pilot Customers (Months 4-6)**
- Approach 3-5 OEMs in Pune MIDC
- Offer discounted pilot pricing (₹9,999/month)
- Intensive onboarding support
- Gather feedback and iterate

**Phase 3: Local Market Launch (Months 7-12)**
- Target Pune/Pimpri-Chinchwad industrial belt
- Direct sales to manufacturing clusters
- Industry event participation
- LinkedIn B2B marketing
- Referral program for existing customers

**Phase 4: Regional Expansion (Year 2)**
- Expand to Gujarat (Ahmedabad, Vadodara)
- Chennai automotive corridor
- NCR industrial areas
- Partner with manufacturing associations
- Content marketing (blog, YouTube)

**Phase 5: National Scale (Year 3+)**
- Pan-India expansion
- Channel partners
- Freemium model consideration
- International markets (SEA, Middle East)

---

### 9.4 Customer Acquisition Strategy

**Direct Sales:**
- Attend manufacturing trade shows
- Cold outreach to MIDC registered companies
- LinkedIn Sales Navigator targeting
- Industry association partnerships

**Inbound Marketing:**
- SEO-optimized content
- Manufacturing workflow guides
- YouTube tutorials
- Case study library

**Partner Network:**
- ERP implementation partners
- Industrial consultants
- CA firms serving manufacturers
- Industry associations

**Referral Program:**
- ₹10,000 credit for each successful referral
- Dual incentive (referrer and referee)
- Unlimited referrals

---

### 9.5 Revenue Projections

**Year 1:**
- Month 1-3: 0 customers (internal use)
- Month 4-6: 3 pilot customers @ ₹9,999 = ₹30K MRR
- Month 7-9: 8 total customers @ avg ₹12K = ₹96K MRR
- Month 10-12: 15 total customers @ avg ₹12K = ₹180K MRR
- **Year 1 ARR:** ₹1.2M - ₹2.16M

**Year 2:**
- Target: 50 customers @ avg ₹15K MRR
- **Year 2 ARR:** ₹9M

**Year 3:**
- Target: 150 customers @ avg ₹18K MRR
- **Year 3 ARR:** ₹32.4M

**Key Assumptions:**
- 70% annual retention rate
- 5% monthly churn
- 15% upsell to higher plans
- Customer acquisition cost: ₹50K
- LTV:CAC ratio target: 3:1

---

### 9.6 Competitive Analysis

**Existing Solutions:**

1. **Generic ERPs (Tally, SAP Business One)**
   - Too complex and expensive
   - Not industry-specific
   - Poor UX for shop floor
   - Weak vendor coordination

2. **Excel-based Systems**
   - No real-time updates
   - Error-prone
   - No automation
   - No mobile access

3. **WhatsApp Groups**
   - Unstructured
   - No data tracking
   - No accountability
   - Information loss

**Aaniry VMS Advantages:**
- Built for CNC job work specifically
- Modern, mobile-friendly UX
- Affordable for SMEs
- Quick implementation (days, not months)
- No hardware required
- Indian GST compliant

---

## 10. Risk Mitigation

### 10.1 Technical Risks

**Risk:** Scalability issues as user base grows
**Mitigation:**
- Use horizontal scaling (containerized deployment)
- Database connection pooling
- Redis caching layer
- CDN for static assets
- Load testing from Phase 2

**Risk:** Data loss or corruption
**Mitigation:**
- Automated daily backups
- Point-in-time recovery enabled
- Multi-region backup storage
- Quarterly disaster recovery drills

**Risk:** Security breaches
**Mitigation:**
- Regular security audits
- Penetration testing
- Bug bounty program (future)
- Security monitoring (Sentry)
- Incident response plan

---

### 10.2 Business Risks

**Risk:** Low customer adoption
**Mitigation:**
- Intensive pilot with 3-5 customers
- Hands-on onboarding
- Video tutorials and documentation
- Dedicated customer success manager
- Feedback-driven development

**Risk:** High churn rate
**Mitigation:**
- Sticky product through daily usage
- High switching costs (historical data)
- Regular feature updates
- Proactive customer health monitoring
- Annual contracts with discount

**Risk:** Pricing too high/low
**Mitigation:**
- Competitor price benchmarking
- Value-based pricing (ROI calculation)
- Multiple plan tiers
- Flexible pricing for large customers
- Regular pricing reviews

---

### 10.3 Operational Risks

**Risk:** Slow customer onboarding
**Mitigation:**
- Standardized onboarding playbook
- Video training materials
- Dedicated onboarding team
- Self-service knowledge base
- Template library

**Risk:** Support ticket overload
**Mitigation:**
- Comprehensive documentation
- In-app help and tooltips
- Chatbot for common queries
- Tiered support based on plan
- Community forum (future)

**Risk:** Feature bloat and complexity
**Mitigation:**
- Strict product roadmap governance
- User feedback prioritization framework
- MVP-first approach for new features
- Avoid custom development for single customer
- Regular UX audits

---

## 11. Success Metrics & KPIs

### 11.1 Product Metrics

**User Engagement:**
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Session duration
- Feature adoption rate
- Mobile vs. desktop usage

**Business Metrics:**
- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR)
- Customer Acquisition Cost (CAC)
- Customer Lifetime Value (LTV)
- LTV:CAC ratio
- Churn rate (target: <5% monthly)
- Net Revenue Retention (NRR)

**Operational Metrics:**
- Challans created per month
- Jobs tracked per month
- Invoices generated per month
- Average turnaround time reduction
- Phone call reduction %

---

### 11.2 Customer Success Metrics

**Onboarding:**
- Time to first value (<7 days)
- Onboarding completion rate (>90%)
- Training session attendance

**Adoption:**
- Percentage of vendors onboarded
- Active vendor participation rate
- Process updates per week
- Dashboard login frequency

**Satisfaction:**
- Net Promoter Score (NPS) - target: >50
- Customer Satisfaction (CSAT) - target: >4.5/5
- Support ticket resolution time (<24 hours)
- Feature request implementation rate

---

## 12. Next Steps & Action Plan

### Immediate Actions (Week 1)

1. **Technical Setup:**
   - [ ] Set up development environment
   - [ ] Initialize Git repository
   - [ ] Configure PostgreSQL database
   - [ ] Set up basic Next.js + NestJS project structure

2. **Design:**
   - [ ] Finalize color scheme and branding
   - [ ] Create Figma mockups for key screens
   - [ ] Design system components library

3. **Planning:**
   - [ ] Create detailed sprint backlog
   - [ ] Set up project management (Jira/Linear)
   - [ ] Define sprint cadence (2-week sprints)

4. **Team:**
   - [ ] Assign roles and responsibilities
   - [ ] Schedule daily standups
   - [ ] Set up communication channels

---

### Week 2-6 Sprint Goals

**Sprint 1 (Week 2-3): Foundation**
- Authentication system
- User management
- Basic dashboards

**Sprint 2 (Week 4-5): Core Features**
- Vendor onboarding
- Delivery challan creation
- Job tracking skeleton

**Sprint 3 (Week 6): Integration**
- Process updates
- Notifications
- PDF generation

---

## 13. Conclusion

The Aaniry VMS represents a significant opportunity to:

1. **Solve Real Pain:** Eliminate coordination chaos in CNC vendor management
2. **Build Competitive Moat:** Create sticky, daily-use software with high switching costs
3. **Scale Beyond Machining:** Transform into a horizontal industrial SaaS platform
4. **Capture Market Value:** Address a ₹500M+ market in India alone

**The key insight:** Build this first for yourself, validate with real usage, then sell. Industrial SaaS companies that emerge from real operational pain have the highest success rates.

**Critical Success Factors:**
- Ruthless focus on core workflow (Phases 1-2)
- Obsessive attention to vendor UX (mobile-first)
- Data quality and reliability
- Fast, hands-on customer onboarding
- Continuous iteration based on usage data

This is not just a software project—it's the foundation for a new business line that could outgrow the machining business itself.

---

**Document prepared by:** Claude (Anthropic AI)  
**For:** Aaniry Overseas Pvt. Ltd.  
**Date:** February 5, 2026  
**Version:** 1.0

**Recommended Next Steps:**
1. Review this document with technical and business stakeholders
2. Validate database schema with sample data
3. Create detailed wireframes in Figma
4. Set up development environment
5. Begin Sprint 1 development

---

## Appendix A: Technology Stack Alternatives

### Alternative Frontend Frameworks
- **Vue.js + Nuxt:** Similar to React/Next.js, slightly simpler learning curve
- **SvelteKit:** Better performance, less ecosystem maturity
- **Angular:** More opinionated, steeper learning curve

**Recommendation:** Stick with React/Next.js for ecosystem maturity and developer availability

### Alternative Backend Frameworks
- **Django (Python):** Excellent for rapid development, strong ORM
- **Laravel (PHP):** Great for traditional CRUD apps
- **Go (Gin/Echo):** Better performance, simpler deployment

**Recommendation:** NestJS for TypeScript consistency across stack, but Django is excellent alternative

### Alternative Databases
- **MySQL:** Popular, well-supported, slightly less feature-rich
- **MongoDB:** Good for rapid prototyping, weak for complex queries
- **CockroachDB:** Better scalability, less mature

**Recommendation:** PostgreSQL for reliability, JSON support, and advanced features

---

## Appendix B: Sample Data Models

```typescript
// Example: Complete Challan with Items and Processes
const sampleChallan = {
  id: "ch_123",
  challanNumber: "DC/2026/02/001",
  challanDate: "2026-02-01",
  customerId: "cust_456",
  vendorId: "vend_789",
  vehicleNumber: "MH12AB1234",
  driverName: "Ramesh Kumar",
  driverPhone: "+919876543210",
  status: "in_process",
  items: [
    {
      id: "item_001",
      partNumber: "PN-2024-001",
      partDescription: "Bearing Housing - CNC Machined",
      quantityIssued: 500,
      unitOfMeasure: "NOS",
      materialGrade: "EN8",
      drawingReference: "DWG-2024-001-Rev.C",
      processes: [
        {
          id: "proc_001",
          processSequence: 1,
          processName: "Turning",
          processType: "turning",
          targetQuantity: 500,
          completedQuantity: 500,
          rejectedQuantity: 20,
          reworkQuantity: 0,
          status: "completed",
          startedAt: "2026-02-02T08:00:00Z",
          completedAt: "2026-02-03T18:00:00Z"
        },
        {
          id: "proc_002",
          processSequence: 2,
          processName: "VMC Operations",
          processType: "milling",
          targetQuantity: 480,
          completedQuantity: 250,
          rejectedQuantity: 5,
          reworkQuantity: 0,
          status: "in_progress",
          startedAt: "2026-02-04T08:00:00Z",
          completedAt: null
        },
        {
          id: "proc_003",
          processSequence: 3,
          processName: "Grinding",
          processType: "grinding",
          targetQuantity: 475,
          completedQuantity: 0,
          rejectedQuantity: 0,
          reworkQuantity: 0,
          status: "pending",
          startedAt: null,
          completedAt: null
        }
      ]
    }
  ],
  createdAt: "2026-02-01T10:00:00Z",
  updatedAt: "2026-02-04T15:30:00Z"
};
```

---

## Appendix C: API Request/Response Examples

**Create Delivery Challan:**
```http
POST /api/v1/challans
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "challanNumber": "DC/2026/02/050",
  "challanDate": "2026-02-05",
  "vendorId": "vend_789",
  "vehicleNumber": "MH12CD5678",
  "driverName": "Suresh Patil",
  "driverPhone": "+919876543210",
  "items": [
    {
      "partNumber": "PN-2024-015",
      "partDescription": "Gear Shaft",
      "quantityIssued": 1000,
      "unitOfMeasure": "NOS",
      "materialGrade": "EN24",
      "drawingReference": "DWG-2024-015-Rev.A"
    }
  ],
  "remarks": "Urgent delivery required"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ch_456",
    "challanNumber": "DC/2026/02/050",
    "status": "issued",
    "pdfUrl": "https://cdn.aaniryvms.com/challans/DC-2026-02-050.pdf"
  },
  "message": "Challan created successfully and sent to vendor",
  "timestamp": "2026-02-05T10:30:00Z"
}
```

---

**Update Job Process:**
```http
PUT /api/v1/jobs/processes/proc_002/update
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "completedQuantity": 100,
  "rejectedQuantity": 5,
  "reworkQuantity": 0,
  "remarks": "Tool wear observed, replaced cutting tool at 250 pcs"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processId": "proc_002",
    "completedQuantity": 350,
    "rejectedQuantity": 10,
    "status": "in_progress",
    "nextProcess": {
      "id": "proc_003",
      "processName": "Grinding",
      "availableQuantity": 340
    }
  },
  "message": "Process updated successfully",
  "timestamp": "2026-02-05T14:45:00Z"
}
```

---

This implementation roadmap provides a complete blueprint for building the Aaniry VMS. The system is designed to scale from a single-tenant internal tool to a multi-tenant SaaS product serving hundreds of manufacturing companies across India.

The key to success is disciplined execution of Phase 1 to prove the concept, followed by rapid iteration based on real user feedback. The industrial SaaS market in India is underserved and ready for modern, purpose-built solutions.
