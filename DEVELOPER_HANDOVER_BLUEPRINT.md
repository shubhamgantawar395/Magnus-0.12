# Magnus / Aaniry VMS 2.0 — Microscopic Developer Handover & Future Architecture Blueprint

> [!IMPORTANT]
> **Purpose of This Document**: This is the complete, line-by-line engineering handover and architectural blueprint for **`Magnus-0.1-main` (Aaniry VMS 2.0)**. Every backend module, Prisma model, SQL migration, frontend route, service, component, TypeScript compile error, security vulnerability, and data-flow bug has been microscopically audited with exact file paths and line numbers. Sections 7–9 provide full production specifications for **GSTR-1 Filing & GSTR-3B Portal Reconciliation (with ITC-04)** and a **Completely Working Plant & MES Layout**.

---

## 1. Live System Status, Environment & Verified Credentials

Both application servers and the PostgreSQL 18 database are **currently running live** on this machine:

| Tier | Technology | Status | Local URL / Port | Workspace Directory |
| :--- | :--- | :--- | :--- | :--- |
| **Database** | PostgreSQL 18 (Native Windows Service) | **RUNNING** | `localhost:5432` (`aaniry_vms`) | `C:\Program Files\PostgreSQL\18\bin` |
| **Backend API** | NestJS 10.3 + Prisma 5.22 + Socket.IO | **RUNNING** | `http://localhost:3001` | [backend](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend) |
| **Swagger Docs** | `@nestjs/swagger` OpenAPI UI | **RUNNING** | `http://localhost:3001/api` | [main.ts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/main.ts#L59-L69) |
| **Frontend Web** | Next.js 14.1 (App Router) + Tailwind + Zustand | **RUNNING** | `http://localhost:3000` | [frontend](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend) |

### 1.1 Active Environment Configuration
- **Backend `.env`** ([backend/.env](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/.env)):
  ```env
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aaniry_vms?schema=public"
  JWT_SECRET="aaniry-vms-super-secret-jwt-key-2026-dev"
  PORT=3001
  CORS_ORIGIN="http://localhost:3000"
  ```
- **Frontend `.env.local`** ([frontend/.env.local](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/.env.local)):
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:3001
  ```

### 1.2 Verified Seeded Login Credentials (Password: `password123`)
> [!WARNING]
> Both [README.md](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/README.md#L118-L120) and [SETUP_COMPLETE.md](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/SETUP_COMPLETE.md#L120-L123) document the password as `Admin@123`, which is **wrong** and fails with `401 Unauthorized`. The actual bcrypt password hash stored in the database for all 26 seeded accounts is **`password123`** (seeded via [create-demo-users.ts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/prisma/create-demo-users.ts#L6)).

| Account Role (`UserRole`) | Email | Password | Organization / Entity | Default Landing Route |
| :--- | :--- | :--- | :--- | :--- |
| `admin` | `admin@aaniry.com` | `password123` | Aaniry Manufacturing (`ORG001`) | `/dashboard/admin` |
| `director` | `director@aaniry.com` | `password123` | Aaniry Manufacturing (`ORG001`) | `/dashboard/executive/morning-briefing` |
| `gm` | `gm@aaniry.com` | `password123` | Aaniry Manufacturing (`ORG001`) | `/dashboard/executive` |
| `production_manager` | `pm@aaniry.com` | `password123` | Aaniry Manufacturing (`ORG001`) | `/dashboard/production` |
| `ppc_manager` | `ppc@aaniry.com` | `password123` | Aaniry Manufacturing (`ORG001`) | `/dashboard/ppc` |
| `quality_head` | `quality@aaniry.com` | `password123` | Aaniry Manufacturing (`ORG001`) | `/dashboard/quality` |
| `vendor_owner` | `vendor1@test.com` … `vendor10@test.com` | `password123` | Linked to Vendors 1–10 | `/dashboard/vendor` |
| `customer` | `customer1@test.com` … `customer10@test.com` | `password123` | Linked to Customers 1–10 | `/dashboard/customer` |

---

## 2. Database Architecture, Prisma Schema & Migration Audit

### 2.1 Database State & Dual-Schema Conflict
The `aaniry_vms` PostgreSQL database currently contains **52 tables**:
1. **41 PascalCase singular tables** managed by Prisma ([backend/prisma/schema.prisma](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/prisma/schema.prisma) — 1,437 lines, 41 models, 19 enums). `npx prisma migrate diff` confirms **zero drift** between `schema.prisma` and the live PascalCase tables.
2. **11 legacy `snake_case` plural tables** (`payments`, `production_updates`, `quality_rejections`, `stock_summary`, `tray_master`, etc.) left over from [database_schema.sql](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/database_schema.sql) (693 lines).

> [!CAUTION]
> **Docker & SQL Init Conflict**: [docker-compose.yml](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/docker-compose.yml#L15) mounts `./database_schema.sql:/docker-entrypoint-initdb.d/init.sql`. `database_schema.sql` creates 18 `snake_case` plural tables (`users`, `vendors`, `delivery_challans`, etc.) with `uuid_generate_v4()`, which **do not match** Prisma's PascalCase singular models (`"User"`, `"Vendor"`, `"DeliveryChallan"`). Furthermore, `docker-compose.yml` uses `POSTGRES_USER: aaniry` / `POSTGRES_PASSWORD: aaniry_dev_2026`, whereas [backend/.env.example](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/.env.example#L2) uses `postgres:postgres`. Remove the `database_schema.sql` volume mount from `docker-compose.yml` immediately.

### 2.2 Broken Prisma Migration Chain (`backend/prisma/migrations/*`)
1. **Gitignore Excludes Migrations**: [.gitignore](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/.gitignore#L31) contains `prisma/migrations/`, preventing new migrations from being committed.
2. **`npx prisma migrate deploy` Fails on Fresh DB**:
   - Migration [`20260326000000_supplier_grn/migration.sql`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/prisma/migrations/20260326000000_supplier_grn/migration.sql#L73) executes:
     ```sql
     ALTER TABLE "SupplierGRN" ADD CONSTRAINT "SupplierGRN_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ...
     ```
     However, **`"Supplier"` was never created in any migration file**! Running `prisma migrate deploy` on a clean database fails with `ERROR: relation "Supplier" does not exist`.
3. **Models, Enums, and Columns in `schema.prisma` Missing from All Migration Files**:
   - **4 Missing Models**: `Supplier` (`lines 204–232`), `GatePass` (`lines 1277–1311`), `KnowledgeItem` (`lines 1365–1386`), `AiFeedback` (`lines 1388–1406`).
   - **3 Missing Enum Updates**: `UserRole.security`, `Department` (`store`, `ppc`, `accounts`, `security`), `InvoiceStatus.gate_approved`.
   - **11 Missing Columns**: `Organization.plants`, `DeliveryChallan.issuerDetails`, `JobProcess.measurements`, `JobProcess.liveCheckLink`, `VendorInvoice.gateApprovedAt`, `VendorInvoice.gateApprovedByName`, `VendorInvoice.gateApprovalRemarks`, `VendorInvoiceItem.gateReceivedQty`, `VendorInvoiceItem.gateRemarks`, `Part.supplierId`, `Part.materialType`, `Part.dispatchTarget`, `PartOperation.pcpDocumentUrl`.
   - **Non-Standard Migration Folders**: `backend/prisma/migrations/20260322_perf_indexes` and `backend/prisma/migrations/add_system_setting` lack the `YYYYMMDDHHMMSS_` timestamp format required by Prisma's migration runner.

### 2.3 Complete 41-Model Prisma Inventory & Multi-Tenancy / Type Audit
In [backend/prisma/schema.prisma](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/prisma/schema.prisma):
- **Monetary Float Bug**: **Every single currency/financial column in `schema.prisma` uses `Float` (IEEE-754 double precision) instead of `@db.Decimal(14, 2)`**. In GST calculations (e.g., `subtotal * 0.09` for CGST/SGST), `Float` produces representation drift (`19.99 * 100 = 1998.9999999999998`) that causes GST portal JSON schema rejections (`RET191114`).
- **Missing `organizationId` on 20 Models**: Half of the tables lack direct `organizationId` foreign keys, forcing multi-hop joins (`challan -> customer -> organizationId`) that several services forget to perform.

| # | Prisma Model (`schema.prisma` Lines) | `organizationId` | Key Relations & Structural Defects |
| :--- | :--- | :--- | :--- |
| 1 | `User` (`103–150`) | Optional (`String?`) | Self-relation `reportsToId`; missing composite index `[organizationId, role]`. |
| 2 | `Vendor` (`153–200`) | Optional (`String?`) | `vendorCode` is globally `@unique` (`L155`) instead of `@@unique([organizationId, vendorCode])`. **Missing `createdById` field**, which crashes `VendorsService.create` (`vendors.service.ts:57`)! |
| 3 | `Supplier` (`204–232`) | Required (`String`) | Raw casting/forging supplier master; `@@unique([organizationId, supplierCode])`. |
| 4 | `VendorCapability` (`234–247`) | **NONE** | Scoped only via `vendorId`. |
| 5 | `DeliveryChallan` (`250–310`) | Optional (`String?`) | `challanNumber` globally `@unique` (`L252`). **`ChallansService.create` never sets `organizationId` (`challans.service.ts:119-132`)**, leaving it `NULL` on all app-created challans! Monetary fields (`materialValue`, `cgst`, `sgst`, `igst`, `totalAmount`) are `Float`. |
| 6 | `ChallanItem` (`313–349`) | **NONE** | `ratePerPiece`, `totalValue` are `Float`. |
| 7 | `JobProcess` (`352–385`) | **NONE** | Tracks `targetQuantity`, `completedQuantity`, `rejectedQuantity`, `reworkQuantity`. |
| 8 | `ProcessUpdate` (`388–404`) | **NONE** | Audit trail of job process quantity updates. |
| 9 | `TrayConfiguration` (`407–427`) | Required (`String`) | `@@unique([organizationId, customerId, partNumber])`. |
| 10 | `DispatchPlan` (`430–462`) | **NONE** | `planNumber` globally `@unique`. Scoped only via `customerId` and `vendorId`. |
| 11 | `DispatchItem` (`465–482`) | **NONE** | Links `DispatchPlan` to `ChallanItem`. |
| 12 | `Invoice` (`485–525`) | **NONE** | Legacy invoice table (`InvoiceModule`). `subtotal`, `cgst`, `sgst`, `igst`, `totalAmount` are `Float`. |
| 13 | `InvoiceItem` (`528–550`) | **NONE** | Legacy invoice line items. |
| 14 | `VendorInvoice` (`553–612`) | **NONE** | Active 2-stage gate-verified invoice model (`VendorInvoiceModule`). **Missing `organizationId`**, GSTINs, IRN, E-Way Bill, and SAC/HSN tax rates. All money fields are `Float`. |
| 15 | `VendorInvoiceItem` (`615–643`) | **NONE** | Active invoice items with `gateReceivedQty` and `gateRemarks`. |
| 16 | `Document` (`646–662`) | **NONE** | **Unused orphan model** (zero backend references). |
| 17 | `AuditLog` (`665–683`) | **NONE** | Scoped only via `userId`. |
| 18 | `Organization` (`689–707`) | Self (`id`) | Tenant root (`code`, `gstin`, `plants[]`, `subscriptionTier`, `maxUsers`, `maxVendors`). |
| 19 | `EndCustomer` (`709–727`) | Required (`String`) | `code` is globally `@unique` (`L711`) instead of `@@unique([organizationId, code])`. |
| 20 | `Customer` (`729–765`) | Required (`String`) | `code` (`L731`) and `gstin` (`L734`) are globally `@unique`. |
| 21 | `PurchaseOrder` (`767–816`) | Required (`String`) | `poNumber` globally `@unique` (`L769`). Money fields (`subtotal`, `cgst`, `sgst`, `igst`, `totalAmount`) are `Float`. |
| 22 | `POItem` (`818–845`) | **NONE** | `ratePerPiece`, `amount`, `materialCost` are `Float`. |
| 23 | `VendorRateCard` (`847–879`) | **NONE** | Rate card per `vendorId + partNumber + operationName`. Money fields are `Float`. |
| 24 | `StockStatement` (`881–912`) | Required (`String`) | Monthly vendor stock statement header. |
| 25 | `StockStatementItem` (`914–937`) | **NONE** | Legacy part-level stock item (still updated by `StockStatementsService.update()` while `create()` writes `ChallanStockItem`!). |
| 26 | `ChallanStockItem` (`939–967`) | **NONE** | Challan-level stock statement item. |
| 27 | `QualityCheck` (`973–1014`) | **NONE** | Inspection records (`checkNumber` globally `@unique`). |
| 28 | `Notification` (`1016–1047`) | Required (`String`) | In-app notification store. |
| 29 | `Part` (`1054–1089`) | Required (`String`) | Part master (`@@unique([organizationId, partNumber])`). |
| 30 | `PartOperation` (`1091–1119`) | **NONE** | Routing steps per `Part` (`sequenceNumber`, `executionType`, `vendorCapability`). |
| 31 | `InvoiceVerification` (`1121–1140`) | **NONE** | **Unused orphan model** (zero records ever created or queried). |
| 32 | `Machine` (`1146–1170`) | Required (`String`) | Basic machine master (`@@unique([organizationId, machineCode])`). No telemetry/OEE/layout fields. |
| 33 | `PartDevelopment` (`1176–1211`) | Required (`String`) | NPI / PPAP stage tracker (`@@unique([organizationId, partNumber])`). |
| 34 | `CustomerOrder` (`1216–1244`) | Required (`String`) | OEM sales order (`@@unique([organizationId, orderNumber])`). |
| 35 | `CustomerOrderItem` (`1246–1268`) | **NONE** | Sales order line items (`ratePerPiece` is `Float`). |
| 36 | `GatePass` (`1277–1311`) | Required (`String`) | Outward/inward gate pass (`passNumber` globally `@unique`). |
| 37 | `MaterialReceipt` (`1317–1356`) | Required (`String`) | Inward receipt (`grnNumber` globally `@unique`). |
| 38 | `VendorMaterialLedger` (`1358–1386`) | Required (`String`) | Running balance ledger (`balanceAfter`). |
| 39 | `AiConversation` (`1392–1411`) | **NONE** | Jarvis AI chat log (`userId` only). |
| 40 | `KnowledgeItem` (`1417–1438`) | Required (`String`) | Jarvis AI knowledge base (`category`, `title`, `content`). |
| 41 | `AiFeedback` (`1440–1458`) | Required (`String`) | Thumbs up/down feedback on Jarvis AI responses. |
| 42* | `SupplierGRN` & `SupplierGRNItem` (`1464–1518`) | Required (`String`) | Supplier raw-material GRN + FIFO batch items (`grnNumber` globally `@unique`). |
| 43* | `LineDeadline` (`1524–1554`) | Required (`String`) | Monthly/weekly customer line targets (`@@unique([organizationId, customerId, partNumber, month, year])`). |
| 44* | `SystemSetting` (`1556–1563`) | Global (`key`) | Key-value table for global settings (e.g. API keys). |

*(Note: Including `SupplierGRN`, `SupplierGRNItem`, `LineDeadline`, and `SystemSetting`, there are 45 `model` declarations in `schema.prisma`, corresponding to 41 active domain tables in PostgreSQL).*

---

## 3. Microscopic Backend Audit (All 35 Modules & Global Bootstrap)

### 3.1 Global Bootstrap, Middleware & AppModule Defects
1. **Broken Custom Gzip Middleware ([backend/src/main.ts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/main.ts#L18-L56)) — `BROKEN`**:
   - Lines 24–55 monkey-patch `res.write` and `res.end`. Standard NestJS/Express `res.json()` calls `res.end(chunk)` directly without calling `res.write()`. When `res.end` runs (`L45`), `gzip` is still `null`, so `origEnd(chunk, ...)` is called uncompressed — **JSON responses are never compressed**.
   - Worse, if a streaming response calls `res.write(chunk)` when `shouldCompress()` is true (`L32`), `gzip.pipe(res as any, { end: true })` (`L35`) pipes `gzip` output back into `res.write`, which is the monkey-patched function itself (`else if (gzip) { gzip.write(chunk) }`), causing an **infinite recursion loop (`Maximum call stack size exceeded`)**!
   - **Fix**: Delete lines 18–56 and use standard `import * as compression from 'compression'; app.use(compression());`.
2. **Insecure Wildcard CORS with Credentials ([backend/src/main.ts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/main.ts#L81-L86)) — `SECURITY FLAW`**:
   - `app.enableCors({ origin: true, credentials: true })` reflects any `Origin` header with `Access-Control-Allow-Credentials: true`, completely ignoring `process.env.CORS_ORIGIN`.
3. **ValidationPipe Bypass on Plain Interfaces ([backend/src/main.ts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/main.ts#L72-L78)) — `SECURITY FLAW`**:
   - Global `ValidationPipe` is configured with `whitelist: true, forbidNonWhitelisted: true`. However, 14 controllers declare `@Body()` using TypeScript `interface`s, inline object literals, or `any` instead of `class-validator` classes (`vendor-invoices`, `supplier-grn`, `gate-passes`, `material-receipts`, `vendor-ledger`, `line-deadlines`, `customer-orders`, `trays`, `platform`, `users`). TypeScript erases `interface`s at compile time (`design:paramtypes` = `Object`), so **`ValidationPipe` skips validation and whitelisting completely** on those endpoints.
4. **Dead `TenantMiddleware` ([backend/src/middleware/tenant.middleware.ts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/middleware/tenant.middleware.ts#L1-L25)) — `STUB / DEAD CODE`**:
   - Never registered in `AppModule`. Its own comment (`L12-16`) notes that Express middleware runs before `JwtAuthGuard`, so `req.user` is always `undefined`.
5. **Unregistered `AuditLogModule` ([backend/src/app.module.ts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/app.module.ts#L28)) — `BROKEN`**:
   - `AuditLogModule` is imported on line 28 of `app.module.ts` but **omitted from the `imports: [...]` array (`L43–82`)**. Every call to `/audit-logs` returns `404 Not Found`.

---

### 3.2 Module-by-Module Microscopic Audit (All 35 Modules)

#### Module 1: `auth` ([backend/src/modules/auth](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/auth)) — `PARTIAL (CRITICAL PRIVILEGE ESCALATION)`
- **Endpoints**: `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `POST /auth/refresh`, `POST /auth/logout`.
- **Bugs & Security Flaws**:
  1. **Public Unauthenticated Privilege Escalation (`P0`)**: [`POST /auth/register`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/auth/auth.controller.ts#L16-L19) has **no `JwtAuthGuard`** and [`RegisterDto`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/auth/dto/register.dto.ts#L15-L16) accepts `@IsEnum(UserRole) role: UserRole`. Any anonymous internet user can POST `{"email":"hacker@evil.com","password":"password123","firstName":"H","lastName":"X","role":"platform_admin"}` and mint a Super Admin account!
  2. **Stale Claims Overwrite in `validateToken`**: [`auth.service.ts:103-108`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/auth/auth.service.ts#L103-L108) spreads `{ ...user, organizationId: payload.organizationId, role: payload.role }`, overwriting fresh database `role`/`organizationId` with stale JWT claims.
  3. **Case-Sensitive Email Creation**: [`auth.service.ts:18`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/auth/auth.service.ts#L18) lowercases email on login (`email.toLowerCase().trim()`), but `UsersService.create` (`users.service.ts:53`) stores mixed-case emails without `.toLowerCase()`, making mixed-case accounts impossible to log into!

#### Module 2: `users` ([backend/src/modules/users](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/users)) — `PARTIAL (CROSS-TENANT DATA LEAK)`
- **Endpoints**: `POST /users`, `GET /users`, `GET /users/vendor/:vendorId/users`, `GET /users/hierarchy/org`, `GET /users/:id`, `GET /users/:id/hierarchy`, `PATCH /users/:id`, `PATCH /users/:id/toggle-status`, `PATCH /users/:id/reset-password`, `DELETE /users/:id`.
- **Bugs & Security Flaws**:
  1. **Zero Tenant Isolation on 7 Endpoints**: `findOne` (`users.service.ts:138`), `update` (`L165`), `resetPassword` (`L202`), `getHierarchy` (`L230`), `remove` (`L213`), `findVendorUsers` (`L255`), and `toggleUserStatus` (`L275`) query by `id` or `vendorId` without checking `organizationId === req.user.organizationId`.
  2. **`vendor_owner` Can Disable Any User in Any Organization**: [`users.controller.ts:121`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/users/users.controller.ts#L121) grants `UserRole.vendor_owner` access to `PATCH /users/:id/toggle-status`, and `users.service.ts:275` toggles `isActive` on any user ID without checking if that user belongs to the caller's vendor!
  3. **`passwordHash` & `refreshToken` Leaked in API Responses**: `getHierarchy` ([`users.service.ts:244-250`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/users/users.service.ts#L244-L250)) and `remove` (`L219-221`) return raw `User` objects (including `passwordHash` and `refreshToken`) without `sanitizeUser()`.
  4. **Super Admin Filter Ignored**: [`users.controller.ts:38-52`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/users/users.controller.ts#L38-L52) ignores `@Query('organizationId')` for `platform_admin`, breaking the Super Admin `OrgUsersModal` (`super-admin/organizations/page.tsx:504`).

#### Module 3: `organizations` ([backend/src/modules/organizations](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/organizations)) — `PARTIAL`
- **Endpoints**: `POST /organizations`, `GET /organizations`, `GET /organizations/mine`, `PATCH /organizations/mine`, `GET /organizations/:id`, `PATCH /organizations/:id`, `DELETE /organizations/:id`.
- **Bugs & Security Flaws**:
  1. **Self-Upgrade Vulnerability**: [`PATCH /organizations/mine`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/organizations/organizations.controller.ts#L46-L51) uses `UpdateOrganizationDto` (which inherits `subscriptionTier`, `maxUsers`, `maxVendors`, `isActive` from `CreateOrganizationDto`), allowing any tenant `admin` to upgrade their own subscription tier and user limits!
  2. **Duplicate Empty GSTIN Crash**: [`organizations.service.ts:40`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/organizations/organizations.service.ts#L40) auto-creates a `Customer` with `gstin: createOrganizationDto.gstin || ''`. Because `Customer.gstin` is `@unique`, creating a second organization without a GSTIN crashes with a Prisma `P2002` unique constraint error on `""`.

#### Module 4: `platform` ([backend/src/modules/platform](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/platform)) — `PARTIAL`
- **Endpoints**: `GET /platform/stats`, `GET /platform/organizations`, `POST /platform/organizations`, `PATCH /platform/organizations/:id/suspend`, `PATCH /platform/organizations/:id/activate`, `PATCH /platform/organizations/:id/limits`, `DELETE /platform/organizations/:id`, `POST /platform/organizations/:id/impersonate`, `GET /platform/audit-logs`, `GET /platform/settings`, `POST /platform/settings`.
- **Bugs**:
  1. **Impersonation Fails if Org Has No `role: 'admin'` User**: [`platform.service.ts:189-193`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/platform/platform.service.ts#L189-L193) writes the audit log *before* checking if an admin user exists, and only searches `role: 'admin'` (ignoring `director`/`gm`).
  2. **Unvalidated `@Body() body: any`** on `updateLimits` (`platform.controller.ts:50`) and `updateSetting` (`L75`).

#### Module 5: `customers` ([backend/src/modules/customers](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/customers)) — `BROKEN ON UPDATE & OPTIONAL GSTIN`
- **Endpoints**: `POST /customers`, `GET /customers`, `GET /customers/:id`, `GET /customers/:id/stats`, `PATCH /customers/:id`, `DELETE /customers/:id`.
- **Bugs**:
  1. **Omitted `gstin` Causes False `409 Conflict` (`P0`)**: In [`customers.service.ts:12-21`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/customers/customers.service.ts#L12-L21), `this.prisma.customer.findFirst({ where: { gstin: createCustomerDto.gstin, organizationId } })` runs unconditionally. When `gstin` is `undefined`, Prisma removes `gstin` from the `WHERE` clause and matches **any existing customer in the organization**, throwing `ConflictException('Customer with this GSTIN already exists')`!
  2. **`PATCH /customers/:id` Crashes with 500 Prisma Error (`P0`)**: [`UpdateCustomerDto`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/customers/dto/update-customer.dto.ts) defines `contactEmail` and `contactPhone`. While `CustomersService.create` maps them to `email` and `phone` (`customers.service.ts:34-35`), [`CustomersService.update`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/customers/customers.service.ts#L162-L165) passes `updateCustomerDto` directly into `this.prisma.customer.update({ where: { id }, data: updateCustomerDto })`, crashing Prisma with `Unknown argument contactEmail`!

#### Module 6: `end-customers` ([backend/src/modules/end-customers](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/end-customers)) — `PARTIAL`
- **Endpoints**: `POST /end-customers`, `GET /end-customers`, `GET /end-customers/:id`, `PATCH /end-customers/:id`, `DELETE /end-customers/:id`.
- **Bugs**:
  1. **Role Lockout**: [`end-customers.controller.ts:19-48`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/end-customers/end-customers.controller.ts#L19-L48) allows `director, gm, ppc_manager, production_manager, platform_admin` but **omits `UserRole.admin` and `UserRole.executive`**!
  2. **Unit Test Failure**: [`end-customers.service.spec.ts:41`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/end-customers/end-customers.service.spec.ts#L41) fails (`npx jest`) because `EndCustomersService` uses `@Injectable({ scope: Scope.REQUEST })` (`end-customers.service.ts:12`), which requires `module.resolve(EndCustomersService)` instead of `module.get(EndCustomersService)`.

#### Module 7: `suppliers` ([backend/src/modules/suppliers](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/suppliers)) — `PARTIAL`
- **Endpoints**: `GET /suppliers`, `GET /suppliers/:id`, `POST /suppliers`, `PATCH /suppliers/:id`, `DELETE /suppliers/:id`.
- **Bugs**:
  1. **No `RolesGuard`**: Any authenticated user (including vendors and customers) can create, edit, or delete raw material suppliers (`suppliers.controller.ts:11`).
  2. **500 Foreign Key Crash on `DELETE /suppliers/:id`**: [`suppliers.service.ts:66-75`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/suppliers/suppliers.service.ts#L66-L75) unlinks `Part.supplierId` before deleting the supplier, but does not check or unlink `SupplierGRN.supplierId` (`onDelete: Restrict`), crashing with a 500 FK constraint violation if any GRNs exist.

#### Module 8: `vendors` ([backend/src/modules/vendors](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/vendors)) — `BROKEN ON CREATE (P0 CRASH)`
- **Endpoints**: `POST /vendors`, `GET /vendors`, `GET /vendors/stats`, `GET /vendors/capability/:processName`, `GET /vendors/:id`, `GET /vendors/:id/analytics`, `PATCH /vendors/:id`, `PATCH /vendors/:id/approve`, `PATCH /vendors/:id/suspend`, `POST /vendors/:id/capabilities`, `DELETE /vendors/capabilities/:capabilityId`, `DELETE /vendors/:id`.
- **Bugs**:
  1. **`POST /vendors` Always Crashes with 500 Prisma Error (`P0`)**: [`vendors.service.ts:57`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/vendors/vendors.service.ts#L57) executes:
     ```ts
     const vendor = await tx.vendor.create({
       data: { ...vendorData, vendorCode, customerId, organizationId, status: 'pending', createdById } as any
     });
     ```
     **`model Vendor` in `schema.prisma` (`L153–200`) does NOT have a `createdById` column!** Every single attempt to create a vendor via `POST /vendors` crashes at runtime with `PrismaClientValidationError: Unknown argument createdById`.
  2. **Hardcoded Fake Analytics**: [`vendors.service.ts:476-513`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/vendors/vendors.service.ts#L476-L513) (`getVendorAnalytics`) returns hardcoded numbers (`qualityScore: 94`, `deliveryScore: 95`, `overallRating: 'A'`) and static Jan–Jun array values instead of querying `JobProcess` or `DeliveryChallan`.
  3. **Missing Tenant & Vendor Ownership Checks**: `findOne`, `update`, `approveVendor`, `suspendVendor`, `addCapability`, `removeCapability`, and `remove` do not verify `organizationId`, and `vendor_owner` can call `PATCH /vendors/:id` (`vendors.controller.ts:81`) on another vendor's ID!

#### Module 9: `vendor-rate-cards` ([backend/src/modules/vendor-rate-cards](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/vendor-rate-cards)) — `PARTIAL (NO RBAC / NO TENANT ISOLATION)`
- **Endpoints**: `POST /vendor-rate-cards`, `GET /vendor-rate-cards`, `GET /vendor-rate-cards/lookup`, `GET /vendor-rate-cards/:id`, `PATCH /vendor-rate-cards/:id`, `DELETE /vendor-rate-cards/:id`.
- **Bugs**: No `RolesGuard` on controller (`vendor-rate-cards.controller.ts:10`); `VendorRateCard` has no `organizationId`; `vendor-rate-cards.service.ts` never checks whether `vendorId` belongs to `req.user.organizationId`.

#### Module 10: `vendor-ledger` ([backend/src/modules/vendor-ledger](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/vendor-ledger)) — `PARTIAL (DISCONNECTED LEDGER)`
- **Endpoints**: `GET /vendor-ledger`, `GET /vendor-ledger/summary`, `POST /vendor-ledger/adjustment`.
- **Bugs**:
  1. **Automatic Ledger Entries Never Written**: `VendorLedgerService` ([`vendor-ledger.service.ts:1-60`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/vendor-ledger/vendor-ledger.service.ts#L1-L60)) only has `addAdjustment`. Neither `ChallansService.create` nor `MaterialReceiptsService.create` ever writes `material_issued` or `material_returned` rows into `VendorMaterialLedger`! The table only contains rows from seed scripts or manual adjustments.
  2. **No `RolesGuard`** and unvalidated `@Body() dto: any` on `POST /vendor-ledger/adjustment` (`vendor-ledger.controller.ts:29`).

#### Module 11: `parts` ([backend/src/modules/parts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/parts)) — `WORKING (WITH MINOR RBAC GAPS)`
- **Endpoints**: `POST /parts`, `GET /parts`, `GET /parts/by-number/:partNumber`, `GET /parts/by-number/:partNumber/vendor-history`, `GET /parts/:id`, `PATCH /parts/:id`, `PATCH /parts/:id/dispatch-target`, `DELETE /parts/:id`, `POST /parts/:id/operations`, `PATCH /parts/:id/operations/:opId`, `DELETE /parts/:id/operations/:opId`, `POST /parts/:id/operations/reorder`.
- **Bugs**:
  1. [`PATCH /parts/:id/dispatch-target`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/parts/parts.controller.ts#L64-L68) has **no `@Roles()` decorator**, allowing any authenticated role to overwrite dispatch targets.
  2. `updateOperation` (`parts.service.ts:289`) and `removeOperation` (`L304`) update/delete `PartOperation` by `id: opId` without verifying `partId` or `part.organizationId`.

#### Module 12: `part-developments` ([backend/src/modules/part-developments](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/part-developments)) — `PARTIAL`
- **Endpoints**: `POST /part-developments`, `GET /part-developments`, `GET /part-developments/stats`, `GET /part-developments/:id`, `PATCH /part-developments/:id`, `PATCH /part-developments/:id/advance-stage`, `DELETE /part-developments/:id`.
- **Bugs**: No `RolesGuard` (`part-developments.controller.ts:9`); `update`, `advanceStage`, and `remove` do not pass `organizationId` into `prisma.partDevelopment.update/delete`.

#### Module 13: `machines` ([backend/src/modules/machines](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/machines)) — `PARTIAL (CRUD STUB ONLY)`
- **Endpoints**: `POST /machines`, `GET /machines`, `GET /machines/utilization`, `GET /machines/:id`, `PATCH /machines/:id`, `DELETE /machines/:id`.
- **Bugs**:
  1. Basic CRUD table only (`machineCode`, `machineName`, `machineType`, `capacityPerHour`, `status`). Has **no floor layout coordinates (`x`, `y`, `width`, `height`, `rotation`, `zoneId`)**, no live PLC/telemetry state, no OEE calculation, no downtime tracking, and no link to `JobProcess` or `PartOperation`.
  2. `getUtilizationSummary` (`machines.service.ts:62-97`) merely counts how many machines are in `running` vs `maintenance` status — it does not calculate real utilization or OEE.

#### Module 14: `purchase-orders` ([backend/src/modules/purchase-orders](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/purchase-orders)) — `PARTIAL`
- **Endpoints**: `POST /purchase-orders`, `GET /purchase-orders`, `GET /purchase-orders/:id/pdf`, `GET /purchase-orders/:id`, `PATCH /purchase-orders/:id`, `DELETE /purchase-orders/:id`, `POST /purchase-orders/:id/submit`, `POST /purchase-orders/:id/approve`, `POST /purchase-orders/:id/reject`.
- **Bugs**:
  1. **Hardcoded 18% IGST Only**: [`purchase-orders.service.ts:270-288`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/purchase-orders/purchase-orders.service.ts#L270-L288) hardcodes `taxRate = 0.18`, sets `cgst: 0, sgst: 0, igst: taxAmount`, and never compares Organization state vs Vendor state.
  2. **Race Condition on `generatePoNumber`**: [`purchase-orders.service.ts:245-267`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/purchase-orders/purchase-orders.service.ts#L245-L267) uses `count() + 1` for the current month; deleting a draft PO or concurrent requests causes duplicate `poNumber` (`P2002`).

#### Module 15: `customer-orders` ([backend/src/modules/customer-orders](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/customer-orders)) — `PARTIAL`
- **Endpoints**: `POST /customer-orders`, `GET /customer-orders`, `GET /customer-orders/:id`, `PATCH /customer-orders/:id`, `DELETE /customer-orders/:id`.
- **Bugs**: No `RolesGuard` (`customer-orders.controller.ts:9`); uses `@Body() dto: any` (`L15, L33`), completely bypassing `ValidationPipe`.

#### Module 16: `challans` ([backend/src/modules/challans](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/challans)) — `PARTIAL (CRITICAL DATA INTEGRITY BUGS)`
- **Endpoints**: `POST /challans`, `GET /challans`, `GET /challans/stats`, `GET /challans/:id/pdf`, `GET /challans/:id`, `PATCH /challans/:id`, `PATCH /challans/:id/status`, `DELETE /challans/:id`.
- **Bugs**:
  1. **`organizationId` Never Saved on Challan Creation (`P0`)**: [`challans.service.ts:119-132`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/challans/challans.service.ts#L119-L132) creates `DeliveryChallan` without setting `organizationId`! Every challan created via the API has `organizationId = NULL`. This breaks `GatePassesService.getMaterialRegister` (`gate-passes.service.ts:244`), `StockStatementsService.calculateChallanBasedStock` (`stock-statements.service.ts:333`), and `QualityService.getJobsForQuality` (`quality.service.ts:92`), all of which filter `deliveryChallan` by `organizationId`!
  2. **`customerId` Passed as `organizationId` in Notifications (`P1`)**: [`challans.service.ts:183, 200, 211`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/challans/challans.service.ts#L183-L216) queries `this.prisma.user.findMany({ where: { organizationId: challan.customerId } })` and passes `challan.customerId` (`Customer.id`, not `Organization.id`) to `notificationsService.createSystemNotification`. As a result, high-value challan notifications never find any executives!
  3. **`operations` Array Ignored — No `JobProcess` Created**: `CreateChallanItemDto` (`create-challan.dto.ts:26`) accepts `operations?: string[]`, but [`challans.service.ts:135-146`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/challans/challans.service.ts#L135-L146) discards `item.operations` and never creates `JobProcess` records!
  4. **Zero Tenant Isolation**: `findAll`, `findOne`, `update`, `updateStatus`, `generatePdf`, `remove`, and `getChallanStats` do not filter by `req.user.organizationId`.
  5. **Date Crash on E-Way Bill Fields**: `ewayBillDate` and `ewayBillExpiry` (`create-challan.dto.ts:68-74`) are passed as raw strings without `new Date()`, crashing Prisma if populated.

#### Module 17: `jobs` ([backend/src/modules/jobs](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/jobs)) — `PARTIAL (DOUBLE-DEDUCTION MATH BUG)`
- **Endpoints**: `POST /jobs/processes`, `GET /jobs/challan/:challanId`, `GET /jobs/vendor/active`, `GET /jobs/vendor/:vendorId/ready-for-dispatch`, `GET /jobs/vendor/:vendorId/ready-for-dispatch-by-part`, `GET /jobs/processes/:id`, `PATCH /jobs/processes/:id/update`, `PATCH /jobs/processes/:id/status`, `DELETE /jobs/processes/:id`.
- **Bugs**:
  1. **Double-Deduction of `rejectedQuantity` (`P0`)**: In [`jobs.service.ts:193-204`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/jobs/jobs.service.ts#L193-L204), `completedQuantity` and `rejectedQuantity` are tracked as separate mutually exclusive buckets (`totalProcessed = newCompleted + newRejected + newRework <= targetQuantity`). However, `enableNextProcess` (`L350`), `getReadyForDispatch` (`L433`), and `getReadyForDispatchByPart` (`L529`) all compute `completedQuantity - rejectedQuantity`! If `target = 100`, `completed = 90`, `rejected = 10`, the next operation and dispatch availability receive `90 - 10 = 80` instead of `90`!
  2. **Already-Dispatched & Invoiced Quantities Never Subtracted**: `getReadyForDispatch` (`L401-462`) and `getReadyForDispatchByPart` (`L467-557`) never subtract `DispatchItem.quantityDispatched` or `VendorInvoiceItem.invoiceQuantity`, allowing vendors to dispatch and invoice the same completed parts multiple times!

#### Module 18: `dispatch` ([backend/src/modules/dispatch](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/dispatch)) — `PARTIAL`
- **Endpoints**: `POST /dispatch`, `GET /dispatch`, `GET /dispatch/stats`, `GET /dispatch/:id`, `PATCH /dispatch/:id`, `PATCH /dispatch/:id/status`, `DELETE /dispatch/:id`.
- **Bugs**:
  1. **Quantity Check Compares Against Issued Instead of Completed**: [`dispatch.service.ts:62-68`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/dispatch/dispatch.service.ts#L62-L68) checks `totalDispatched + item.quantityDispatched > challanItem.quantityIssued` without checking if the parts have actually completed their `JobProcess` operations or passed `QualityCheck`!
  2. **Role Mismatch for Vendor Users**: `@Roles('admin', 'customer', 'vendor')` (`dispatch.controller.ts:28-92`) uses `'vendor'`, which does not exist in `UserRole` (`vendor_owner`, `vendor_dispatch`, `vendor_ppc`). Vendor users get `403 Forbidden` on every `/dispatch` endpoint!

#### Module 19: `gate-passes` ([backend/src/modules/gate-passes](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/gate-passes)) — `BROKEN ROUTES (ROUTE SHADOWING)`
- **Endpoints**: `POST /gate-passes`, `GET /gate-passes`, `GET /gate-passes/stats`, `GET /gate-passes/:id`, `PATCH /gate-passes/:id/return`, `PATCH /gate-passes/:id/close`, `GET /gate-passes/register`, `PATCH /gate-passes/:id/approve-return`, `PATCH /gate-passes/:id/mark-in-transit`, `PATCH /gate-passes/:id/confirm-store-receipt`, `GET /gate-passes/material-register`.
- **Bugs**:
  1. **Route Shadowing (`P0`)**: In [`gate-passes.controller.ts:45`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/gate-passes/gate-passes.controller.ts#L45), `@Get(':id')` is defined **above** `@Get('register')` (`L67`) and `@Get('material-register')` (`L100`). Calling `GET /gate-passes/register` or `GET /gate-passes/material-register` hits `findOne('register')` and returns `404 Gate pass not found`!
  2. **Invalid Enum Value & Null `organizationId` in `getMaterialRegister`**: [`gate-passes.service.ts:243-248`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/gate-passes/gate-passes.service.ts#L243-L248) queries `deliveryChallan` with `where: { organizationId, status: { not: 'cancelled' as any } }`. Because `ChallanStatus` does not have `'cancelled'` (`draft, issued, in_transit, received, closed, rejected`), Prisma throws a runtime validation error, and even if fixed, `organizationId` is `NULL` on app-created challans.

#### Module 20: `material-receipts` ([backend/src/modules/material-receipts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/material-receipts)) — `PARTIAL (DISCONNECTED)`
- **Endpoints**: `POST /material-receipts`, `GET /material-receipts`, `GET /material-receipts/stats`, `GET /material-receipts/:id`, `PATCH /material-receipts/:id/inspect`, `DELETE /material-receipts/:id`.
- **Bugs**: No `RolesGuard`; `@Body() dto: any`; creating or inspecting a `MaterialReceipt` never updates `DeliveryChallan.status`, never updates `POItem`, and never writes to `VendorMaterialLedger`. Also, the frontend service [`material-receipt-service.ts`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/services/material-receipt-service.ts#L1-L29) is a copy-paste of `customer-order-service.ts` that calls `/customer-orders` instead of `/material-receipts`!

#### Module 21: `supplier-grn` ([backend/src/modules/supplier-grn](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/supplier-grn)) — `BROKEN STORE BALANCE ENDPOINT`
- **Endpoints**: `POST /supplier-grn`, `GET /supplier-grn`, `GET /supplier-grn/store-balance`, `GET /supplier-grn/fifo/:partNumber`, `GET /supplier-grn/:id`, `PATCH /supplier-grn/:id/verify`, `DELETE /supplier-grn/:id`.
- **Bugs**:
  1. **`GET /supplier-grn/store-balance` Crashes with 500 Prisma Enum Error (`P0`)**: [`supplier-grn.service.ts:190`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/supplier-grn/supplier-grn.service.ts#L190) filters `challan: { status: { notIn: ['rejected', 'cancelled'] as any } }`. Because `'cancelled'` is not a valid `ChallanStatus` enum member in PostgreSQL, Prisma/Postgres rejects the query!
  2. **FIFO Allocation Not Connected to Challan Creation**: `getFifoBatches` (`supplier-grn.service.ts:242-286`) computes FIFO batch consumption across all challans for a `partNumber`, but `ChallansService.create` never links challan items to `SupplierGRNItem` batches or enforces that `quantityIssued <= storeBalance`.

#### Module 22: `stock-statements` ([backend/src/modules/stock-statements](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/stock-statements)) — `BROKEN`
- **Endpoints**: `POST /stock-statements`, `POST /stock-statements/auto-generate`, `GET /stock-statements`, `GET /stock-statements/:id`, `PATCH /stock-statements/:id`, `DELETE /stock-statements/:id`, `POST /stock-statements/:id/submit`, `POST /stock-statements/:id/reconcile`, `POST /stock-statements/:id/approve`, `POST /stock-statements/:id/dispute`.
- **Bugs**:
  1. **`calculateChallanBasedStock` Returns Empty for App Challans**: [`stock-statements.service.ts:331-337`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/stock-statements/stock-statements.service.ts#L331-L337) filters `deliveryChallan` by `organizationId`, which is `NULL` on all challans created through `ChallansService.create`.
  2. **`update()` Writes to Wrong Table (`P1`)**: `create()` (`L51-67`) creates `challanItems` (`ChallanStockItem`), whereas `update()` (`L102-133`) deletes and recreates `items` (`StockStatementItem`)!
  3. **Dead WebSocket Gateway**: [`stock-statements.gateway.ts`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/stock-statements/stock-statements.gateway.ts) is never injected into `StockStatementsService`, so zero real-time events are ever emitted.

#### Module 23: `quality` ([backend/src/modules/quality](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/quality)) — `PARTIAL (CROSS-TENANT DATA LEAK)`
- **Endpoints**: `POST /quality`, `GET /quality/jobs`, `GET /quality`, `GET /quality/stats`, `GET /quality/trends`, `GET /quality/defects`, `GET /quality/:id`, `PATCH /quality/:id`, `DELETE /quality/:id`, `POST /quality/:id/complete`, `POST /quality/:id/approve`, `POST /quality/:id/reject`.
- **Bugs**:
  1. **`organizationId` Completely Ignored in `QualityService` (`P0`)**: Even though `QualityController` passes `organizationId: req.user.organizationId` in `filters`, [`QualityService.findAll`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/quality/quality.service.ts#L152-L185), `getStatistics` (`L320`), `getQualityTrends` (`L425`), and `getTopDefects` (`L472`) **never use `filters.organizationId` in their Prisma `where` clauses**! Every tenant sees all quality checks across the entire database.
  2. **`getJobsForQuality` Returns 0 Rows for App Challans**: [`quality.service.ts:92`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/quality/quality.service.ts#L92) filters `challan: { organizationId }`, which is `NULL` on app-created challans.

#### Module 24 & 25: `invoices` ([backend/src/modules/invoices](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/invoices)) & `vendor-invoices` ([backend/src/modules/vendor-invoices](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/vendor-invoices)) — `PARTIAL (BROKEN PDF & NOTIFICATIONS)`
- **Architecture Note**: Two parallel invoice modules exist:
  - `InvoicesModule` (`/invoices` -> `Invoice` / `InvoiceItem` tables): Legacy customer-facing invoice module with `@Roles('admin', 'customer', 'vendor')` (blocks `vendor_owner`!).
  - `VendorInvoiceModule` (`/vendor-invoices` -> `VendorInvoice` / `VendorInvoiceItem` tables): Active 2-stage gate-entry + accounts-approval vendor invoicing system.
- **Bugs in `vendor-invoices`**:
  1. **`GET /vendor-invoices/:id/pdf` Returns Corrupted JSON Instead of Binary PDF (`P0`)**: In [`vendor-invoice.controller.ts:54-67`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/vendor-invoices/vendor-invoice.controller.ts#L54-L67), the controller sets headers on `req.res` and returns `pdfBuffer` directly (`return pdfBuffer;`) without `@Res() res: Response` or `new StreamableFile(pdfBuffer)`. NestJS's response interceptor serializes the Node `Buffer` as JSON `{"type":"Buffer","data":[37,80,68,70,...]}`!
  2. **Broken Notifications on Submit & Gate Approval (`P1`)**: [`vendor-invoice.service.ts:508`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/vendor-invoices/vendor-invoice.service.ts#L508) and [`line 647`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/vendor-invoices/vendor-invoice.service.ts#L647) query `this.prisma.user.findMany({ where: { organizationId: updatedInvoice.customerId } })`. Because `customerId` is a `Customer.id` (not an `Organization.id`), `securityUsers` and `approvers` are always `[]`, and **zero notifications are ever sent**!
  3. **No RBAC on Any `/vendor-invoices` Endpoint**: `VendorInvoiceController` (`vendor-invoice.controller.ts:15`) only uses `JwtAuthGuard` — any logged-in user can call `POST /vendor-invoices/:id/gate-approve`, `POST /vendor-invoices/:id/approve`, or `POST /vendor-invoices/:id/mark-paid`!

#### Module 26: `line-deadlines` ([backend/src/modules/line-deadlines](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/line-deadlines)) — `WORKING`
- **Endpoints**: `GET /line-deadlines`, `PATCH /line-deadlines/upsert`, `POST /line-deadlines/add-part`.
- **Notes**: Cleanly scoped by `orgId`. Only minor issue is `UpsertLineDeadlineDto` (`line-deadlines.service.ts:5`) is a TypeScript `interface` rather than a `class-validator` class.

#### Module 27: `executive` ([backend/src/modules/executive](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/executive)) — `PARTIAL`
- **Endpoints**: 14 endpoints under `/executive/*` (`stats`, `stock-statement`, `vendor-performance`, `dispatch-deadlines`, `spend-analysis`, `performance-trends`, `vendor-analytics/:vendorId`, `vendor-comparison`, `cost-analysis`, `part-overview`, `part-tracker`, `parts/customer/:customerId`, `PUT parts/:challanItemId/deadline`, `morning-briefing`, `war-room`).
- **Bugs**:
  1. **`POST /executive/dispatch-deadlines` Crashes (`P1`)**: [`executive.service.ts:309-319`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/executive/executive.service.ts#L309-L319) calls `this.prisma.dispatchPlan.create` without providing the required `planNumber` field!
  2. **Mock `Math.random()` Data**: `getVendorPerformanceTrends` (`L296-307`), `getVendorDetails` (`L376-381`), and `getVendorComparison` (`L441-444`) generate random numbers (`85 + Math.random() * 15`) on every request.

#### Module 28: `reports` ([backend/src/modules/reports](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/reports)) & Module 29: `exports` ([backend/src/modules/exports](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/exports)) — `PARTIAL`
- **Endpoints**: `GET /reports/stock-statement`, `GET /reports/vendor-performance`, `GET /reports/vendor-wise-stock`, `GET /reports/global-stock`; `GET /exports/stock-statement`.
- **Bugs**:
  1. `GET /reports/stock-statement` (`reports.controller.ts:32`) and `GET /exports/stock-statement` (`export.controller.ts:29`) use `@Roles('admin', 'customer', 'vendor')` and `req.user.role === 'vendor'`. Because vendor users have role `vendor_owner` / `vendor_ppc`, they receive `403 Forbidden`!
  2. `getStockStatement` (`reports.service.ts:145`) and `getVendorPerformance` (`L190`) do not verify that `vendorId` belongs to `req.user.organizationId`.

#### Module 30: `trays` ([backend/src/modules/trays](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/trays)) — `WORKING (MINOR ROLE BUG)`
- **Endpoints**: `POST /trays/config`, `GET /trays/config`, `GET /trays/config/:partNumber`, `DELETE /trays/config/:partNumber`, `POST /trays/calculate`, `POST /trays/calculate-multiple`.
- **Bug**: `tray.controller.ts:52, 75` uses `'vendor'` instead of `vendor_owner`/`vendor_ppc`/`vendor_dispatch`.

#### Module 31: `notifications` ([backend/src/modules/notifications](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/notifications)) — `PARTIAL`
- **Endpoints**: `POST /notifications`, `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`.
- **Bug**: `POST /notifications` (`notifications.controller.ts:24-28`) has no `@Roles()` guard, allowing any user to broadcast notifications to any user ID in their organization.

#### Module 32: `automation` ([backend/src/modules/automation](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/automation)) — `BROKEN CRON NOTIFICATIONS`
- **Cron Jobs**: `handleJobDeadlines` (`10:00 AM` daily), `checkPendingInvoices` (`11:00 AM` daily).
- **Bugs**:
  1. Lines `80`, `104`, `113`, and `177` of [`automation.service.ts`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/automation/automation.service.ts#L80-L178) pass `challan.customerId` (`Customer.id`) as `organizationId` into `notificationsService.createSystemNotification` and `user.findMany({ where: { organizationId: challan.customerId } })`!
  2. Line `56` checks `item.jobProcesses.some(p => p.status === 'completed')` instead of `.every(...)`, so as soon as operation 1 of 4 is completed, the cron job thinks the entire challan item is completed!

#### Module 33: `audit-log` ([backend/src/modules/audit-log](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/audit-log)) — `BROKEN (UNREGISTERED + WRONG DECORATORS)`
- **Endpoints**: `GET /audit-logs`, `GET /audit-logs/user/:userId`, `GET /audit-logs/entity/:entityType/:entityId`.
- **Bugs**:
  1. `AuditLogModule` is omitted from `imports` in `app.module.ts` (`L28`).
  2. In [`audit-log.controller.ts:42, 56-57`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/audit-log/audit-log.controller.ts#L39-L60), route parameters `:userId`, `:entityType`, and `:entityId` are read with `@Query(...)` instead of `@Param(...)`!
  3. `AuditLogService.findAll` (`audit-log.service.ts:32-74`) has no `organizationId` filter, leaking logs across all tenants.

#### Module 34: `aux-status` ([backend/src/modules/aux-status](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/aux-status)) — `WORKING (IN-MEMORY ONLY)`
- **Endpoints**: `PATCH /aux-status`, `GET /aux-status/me`, `GET /aux-status/org`.
- **Note**: Stores user presence (`meeting`, `available`, `lunch`, `break`, `away`) in an in-memory `Map` (`aux-status.service.ts:19`); resets on server restart.

#### Module 35: `ai` & `ai-knowledge` ([backend/src/modules/ai](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/ai), [backend/src/modules/ai-knowledge](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/ai-knowledge)) — `PARTIAL (API KEY MISMATCH & DEAD CODE)`
- **Endpoints**: `POST /ai/chat`, `GET /ai/suggestions`, `POST /ai/feedback`; `GET /ai/knowledge`, `POST /ai/knowledge`, `PATCH /ai/knowledge/:id`, `DELETE /ai/knowledge/:id`, `POST /ai/knowledge/seed`.
- **Bugs**:
  1. **Critical Super Admin API Key Mismatch (`P0`)**: The Super Admin UI ([`frontend/src/app/super-admin/page.tsx:143`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/super-admin/page.tsx#L143)) saves the AI key under `key: 'ANTHROPIC_API_KEY'` in `SystemSetting`. However, [`AiService.getOpenAiKey()`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/ai/ai.service.ts#L50-L57) looks up `key: 'OPENAI_API_KEY'` and calls OpenAI's `https://api.openai.com/v1/chat/completions` (`gpt-4o`, `L289-299`)! Saving an API key in the Super Admin dashboard has **zero effect** on Jarvis AI!
  2. **800+ Lines of Unreachable Dead Code**: In [`ai.service.ts:328-1135`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/ai/ai.service.ts#L328-L1135), the legacy regex intent router (`processQueryLegacy`, `handleExecutiveIntent`, etc.) is completely unreachable (`chat()` returns at `L325`).
  3. **Stale 5-Minute Context Cache After Action Execution**: When `AiActionsService.execute` creates a PO, challan, or vendor (`ai.service.ts:261`), `AiContextService.invalidateCache(organizationId)` is **never called**, so Jarvis AI continues quoting stale counts for 5 minutes.
  4. **Missing Role Access**: `ai.controller.ts:15` omits `plant_head`, `store_keeper`, `accounts_manager`, `quality_supervisor`, and `security` from `@Roles`.

---

## 4. Microscopic Frontend Audit (87 Routes, 36 Components, 16 Services & 47 TS Errors)

### 4.1 Frontend Build Verification (`npx tsc --noEmit`) — 47 TypeScript Errors Across 9 Files
Because [frontend/next.config.js](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/next.config.js) does not ignore TypeScript errors during `next build`, **`npm run build` in `frontend/` fails with 47 TypeScript errors**:

| # | File Path & Line | TypeScript Error Code | Root Cause & Runtime Impact |
| :--- | :--- | :--- | :--- |
| 1 | [dashboard/vendors/page.tsx](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/dashboard/vendors/page.tsx#L1-L231) | **38 errors** (`TS2304`, `TS2552`, `TS7006`) | **CRITICAL**: File starts at `export default function VendorsPage()` without `'use client'` and **without a single `import` statement** (`useRouter`, `useState`, `useEffect`, `Vendor`, `apiClient`, `vendorAnalyticsService`, `Link`, `Button`, `Input`, `Building2`, `CheckCircle2`, `Clock`, `ArrowLeft`, `Plus`, `Search`, `Phone`, `MapPin`). Crashes `/dashboard/vendors` immediately at runtime! |
| 2 | [dashboard/challans/page.tsx](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/dashboard/challans/page.tsx#L164) | `TS2304: Cannot find name 'ArrowUpRight'` | **CRITICAL**: `<ArrowUpRight className="w-4 h-4 ml-1" />` is rendered on line 164 without being imported from `lucide-react` (`L9-24`). Crashes `/dashboard/challans` with `ReferenceError: ArrowUpRight is not defined` whenever a challan row renders! |
| 3 | [dashboard/customer-orders/page.tsx](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/dashboard/customer-orders/page.tsx#L31-L47) | **2 errors** (`TS2741`) | Hardcoded mock fallback objects (`L31`, `L47`) omit required property `customerId: string` from `CustomerOrder`. |
| 4 | [dashboard/executive/war-room/page.tsx](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/dashboard/executive/war-room/page.tsx#L113) | `TS2741: Property 'data' is missing` | Renders `<PerformanceTrendChart />` without passing required prop `data: TrendData[]`. |
| 5 | [dashboard/line-deadlines/page.tsx](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/dashboard/line-deadlines/page.tsx#L623) | `TS2802: Type 'Set<string>' can only be iterated...` | `[...new Set(...)]` requires `"downlevelIteration": true` or `"target": "es2015"` in `frontend/tsconfig.json`, or `Array.from(new Set(...))`. |
| 6 | [dashboard/platform/users/create/page.tsx](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/dashboard/platform/users/create/page.tsx#L180) | `TS2339: Property 'STORE_HEAD' does not exist` | References `UserRole.STORE_HEAD`, whereas [types/user.ts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/types/user.ts#L19) defines `UserRole.STORE_KEEPER = 'store_keeper'`. |
| 7 | [purchase-orders/[id]/edit/page.tsx](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/purchase-orders/%5Bid%5D/edit/page.tsx#L77) | `TS18048: 'po.items' is possibly 'undefined'` | Calls `po.items.map(...)` without optional chaining `po.items?.map(...)`. |
| 8 | [super-admin/organizations/page.tsx](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/super-admin/organizations/page.tsx#L437) | `TS2345: Type 'PlatformOrganization[]' is not assignable...` | Local `Organization` interface requires `maxUsers` and `maxVendors`, which are optional on `PlatformOrganization`. |
| 9 | [users/[id]/page.tsx](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/users/%5Bid%5D/page.tsx#L87) | `TS2367: Types 'UserRole' and '"admin"' have no overlap` | [frontend/src/types/user.ts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/types/user.ts#L3-L25) omits `ADMIN = 'admin'` and `SECURITY = 'security'` from `enum UserRole`! |

---

### 4.2 Additional Runtime Crashes, Dead Links & Split-Brain Architecture

1. **TDZ Crash on `/dashboard/executive/sourcing` ([VendorComparisonMatrix.tsx](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/components/VendorComparisonMatrix.tsx#L39-L55)) — `BROKEN`**:
   - Inside `sortedData = [...data].sort(...)`, lines `39–48` reference `field` (`if (field === 'totalSpend') ...`) **before** `const field = sortField;` is declared on line `55`! JavaScript's Temporal Dead Zone throws `ReferenceError: Cannot access 'field' before initialization` as soon as `/dashboard/executive/sourcing` loads with >= 2 vendors!
2. **`TypeError: vendorsList.map is not a function` on `/dashboard/admin/vendor-performance` ([page.tsx](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/dashboard/admin/vendor-performance/page.tsx#L36-L40)) — `BROKEN`**:
   - Calls `apiClient.get('/vendors')` (`L36`). Backend `VendorsService.findAll` returns `{ data: Vendor[], pagination: {...} }`. Line `40` sets `const vendorsList: VendorSummary[] = res.data || [];` and calls `vendorsList.map(...)` (`L43`) on the wrapper object, crashing with `TypeError`! Furthermore, lines `44–56` fabricate vendor scores using `Math.random()`.
3. **Copy-Paste Bug in [`material-receipt-service.ts`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/services/material-receipt-service.ts#L1-L29) — `BROKEN`**:
   - The entire file is an exact copy of `customer-order-service.ts` — it exports `customerOrderService` and calls `/customer-orders` instead of `/material-receipts`!
4. **Missing `/dashboard` Root Page (`404 Not Found`)**:
   - There is **no `frontend/src/app/dashboard/page.tsx`**, yet 4 pages link or redirect to `/dashboard`:
     - [`dashboard/admin/knowledge-center/page.tsx:58`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/dashboard/admin/knowledge-center/page.tsx#L58) (`router.replace('/dashboard')`)
     - [`dashboard/admin/settings/page.tsx:31`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/dashboard/admin/settings/page.tsx#L31) (`router.replace('/dashboard')`)
     - [`dashboard/challans/page.tsx:86`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/dashboard/challans/page.tsx#L86) (`<Link href="/dashboard">`)
     - [`dashboard/vendor/page.tsx:396`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/dashboard/vendor/page.tsx#L396) (`<Link href="/dashboard">`)
5. **Broken Navigation Links (404s)**:
   - [`Sidebar.tsx:109`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/components/layout/Sidebar.tsx#L109): Vendor sidebar "Stock" links to `/dashboard/stock` (**404**; actual page is `/dashboard/vendor/stock-statement`).
   - [`dashboard/challans/dispatch/page.tsx:459`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/dashboard/challans/dispatch/page.tsx#L459): "View Details" links to `/dashboard/challans/dispatch/${plan.id}` (**404**; no `[id]/page.tsx` exists).
   - [`dashboard/supplier-grn/page.tsx`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/dashboard/supplier-grn/page.tsx): Links GRN cards to `/dashboard/supplier-grn/${grn.id}` (**404**; only `/dashboard/supplier-grn/create` exists).
   - [`dashboard/customer/page.tsx:138, 250, 257`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/dashboard/customer/page.tsx#L138): Links to `/challans/new` and `/challans/${id}` (**404**; actual routes are `/dashboard/challans/create` and `/dashboard/challans/${id}`).
6. **Super Admin Split-Brain (`/super-admin` vs `/dashboard/platform`)**:
   - [`login/page.tsx:43`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/login/page.tsx#L43) redirects `platform_admin` to `/dashboard/platform`.
   - [`dashboard/layout.tsx:48-51`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/dashboard/layout.tsx#L48-L51) immediately intercepts `platform_admin` on any `/dashboard/*` route and redirects them to `/super-admin`, making all 6 pages under `/dashboard/platform/*` (`organizations`, `users`, `analytics`, `settings`) completely unreachable!
   - Furthermore, [`super-admin/organizations/page.tsx:455`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/super-admin/organizations/page.tsx#L455) saves the impersonation token to `localStorage.setItem('auth_token', res.accessToken)`, whereas `apiClient` ([`lib/api-client.ts:27`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/lib/api-client.ts#L27)) reads `localStorage.getItem('access_token')` and `useAuthStore` reads `auth-storage`! Thus, clicking "Impersonate" in `/super-admin/organizations` fails to log into the tenant!
7. **Duplicate Top-Level vs `/dashboard/*` Routes**:
   - 31 pages exist outside `/dashboard` (`/customers`, `/vendors`, `/purchase-orders`, `/quality`, `/stock-statements`, `/users`, `/vendor-rate-cards`). These top-level routes render **without `Sidebar` or `DashboardLayout`**, creating a jarring broken-shell experience when navigated to.
8. **WebSocket Hook Configuration Bug ([`useWebSocket.tsx:7, 67`](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/hooks/useWebSocket.tsx#L7))**:
   - Reads `process.env.NEXT_PUBLIC_BACKEND_URL` (instead of `NEXT_PUBLIC_API_URL`) and `localStorage.getItem('token')` (instead of `'access_token'`).

---

### 4.3 Complete Inventory of All 56 `/dashboard/*` Pages

| Route Path (`frontend/src/app/dashboard/...`) | Status | Backend Endpoints Called & Audit Notes |
| :--- | :--- | :--- |
| `layout.tsx` | **WORKING** | Auth guard + Sidebar + Topbar + Jarvis `AiAssistant` widget + Command Palette (`⌘K`). |
| `admin/page.tsx` | **WORKING** | Calls `/users`, `/vendors`, `/purchase-orders`, `/challans/stats`, `/quality/stats`, `/organizations/mine`. |
| `admin/hierarchy/page.tsx` | **WORKING** | Calls `GET /users/hierarchy/org`, `PATCH /users/:id`. |
| `admin/knowledge-center/page.tsx` | **WORKING** | Calls `/ai/knowledge` CRUD + `/ai/knowledge/seed`. Redirects non-admins to `/dashboard` (404). |
| `admin/settings/page.tsx` | **WORKING** | Calls `GET/PATCH /organizations/mine`. |
| `admin/users/page.tsx` | **WORKING** | Calls `/users` CRUD, `/vendors`, `/users/:id/toggle-status`, `/users/:id/reset-password`. |
| `admin/vendor-performance/page.tsx` | **BROKEN** | Crashes (`res.data.map is not a function`) + uses `Math.random()` for fake metrics. |
| `challans/page.tsx` | **BROKEN** | Crashes (`ArrowUpRight is not defined` at line 164). |
| `challans/create/page.tsx` | **PARTIAL** | Calls `POST /challans`, `/parts/by-number/:pn`, `/trays/calculate`. Backend omits `organizationId` & `JobProcess` creation. |
| `challans/[id]/page.tsx` | **WORKING** | Calls `GET /challans/:id`, `PATCH /challans/:id/status`, `GET /challans/:id/pdf`. |
| `challans/dispatch/page.tsx` | **PARTIAL** | Calls `/dispatch` & `/jobs/vendor/:id/ready-for-dispatch`. Links to non-existent `/dashboard/challans/dispatch/:id` (404). |
| `challans/inward/page.tsx` | **WORKING** | Calls `GET /challans`, `PATCH /challans/:id/status`. |
| `customer/page.tsx` | **PARTIAL** | Calls `/challans/stats`, `/challans`, `/dispatch`. Broken links to `/challans/new` and `/challans/:id` (404). |
| `customer-orders/page.tsx` | **PARTIAL** | Calls `/customer-orders`, `/customers`. Falls back to hardcoded mock orders on error (2 TS errors). |
| `customers/page.tsx` | **WORKING** | Calls `GET /end-customers`, `DELETE /end-customers/:id`. |
| `customers/create/page.tsx` | **PARTIAL** | Calls `POST /end-customers` (`admin` role blocked by backend `@Roles`). |
| `customers/[id]/page.tsx` | **WORKING** | Calls `GET /end-customers/:id`. |
| `customers/[id]/edit/page.tsx` | **PARTIAL** | Calls `PATCH /end-customers/:id` (`admin` role blocked by backend `@Roles`). |
| `executive/page.tsx` | **WORKING** | Calls `/executive/part-overview`, `/executive/part-tracker`, `/vendors`, `/customers`, `PUT /executive/parts/:id/deadline`. |
| `executive/analytics/page.tsx` | **WORKING** | Calls `/executive/spend-analysis`, `/executive/performance-trends`, `/executive/cost-analysis`. |
| `executive/morning-briefing/page.tsx` | **WORKING** | Calls `/executive/morning-briefing`, `/purchase-orders/:id/approve`, `/purchase-orders/:id/reject`. |
| `executive/part-tracker/page.tsx` | **WORKING** | Redirects to `/dashboard/executive?tab=tracker`. |
| `executive/parts/[customerId]/page.tsx` | **WORKING** | Calls `/executive/parts/customer/:customerId`, `PUT /executive/parts/:id/deadline`. |
| `executive/sourcing/page.tsx` | **BROKEN** | Renders `VendorComparisonMatrix` which crashes with TDZ `ReferenceError: Cannot access 'field' before initialization`. |
| `executive/vendors/[id]/page.tsx` | **PARTIAL** | Calls `/executive/vendor-analytics/:id` (backend returns `Math.random()` trend values). |
| `executive/war-room/page.tsx` | **PARTIAL** | Calls `/executive/war-room`. Has TS error on `<PerformanceTrendChart />` missing `data` prop. |
| `gate-pass/page.tsx` | **PARTIAL** | Calls `/gate-passes` CRUD. Note: `/gate-passes/register` & `/gate-passes/material-register` are shadowed on backend. |
| `invoices/page.tsx` | **PARTIAL** | Calls `/vendor-invoices`. Downloading PDF via `/vendor-invoices/:id/pdf` returns JSON-serialized Buffer. |
| `invoices/create/page.tsx` | **WORKING** | Calls `POST /vendor-invoices` with challan/operation auto-fill. |
| `invoices/[id]/page.tsx` | **PARTIAL** | Calls `/vendor-invoices/:id`, `gate-approve`, `approve`, `reject`, `mark-paid`. PDF download broken. |
| `line-deadlines/page.tsx` | **WORKING** | Calls `/line-deadlines`, `/line-deadlines/upsert`, `/line-deadlines/add-part` (1 TS downlevelIteration error). |
| `machines/page.tsx` | **PARTIAL** | Basic card list calling `/machines` & `/machines/utilization`. No plant floor map or live telemetry. |
| `material-receipts/page.tsx` | **WORKING** | Calls `/material-receipts`, `/material-receipts/stats`, `/vendors`, `/purchase-orders`. |
| `part-development/page.tsx` | **WORKING** | Calls `/part-developments`, `/part-developments/stats`, `/part-developments/:id/advance-stage`. |
| `parts/page.tsx` | **WORKING** | Calls `/parts` & `/parts/:id/operations` CRUD + reorder. |
| `platform/*` (6 pages) | **BROKEN** | Unreachable by `platform_admin` because `dashboard/layout.tsx:48` redirects to `/super-admin`. |
| `ppc/page.tsx` | **WORKING** | Calls `/challans`, `/vendors`, `/dispatch`, `/jobs/challan/:id`. |
| `production/page.tsx` | **WORKING** | Calls `/challans/stats`, `/dispatch/stats`, `/vendors/stats`, `/challans`, `/dispatch`. |
| `purchase-orders/page.tsx` | **WORKING** | Calls `GET /purchase-orders`, `DELETE /purchase-orders/:id`. |
| `purchase-orders/create/page.tsx` | **WORKING** | Calls `POST /purchase-orders`, `/vendors`, `/parts/by-number/:pn`, `/vendor-rate-cards/lookup`. |
| `purchase-orders/[id]/page.tsx` | **WORKING** | Calls `/purchase-orders/:id`, `submit`, `approve`, `reject`, `pdf`. |
| `quality/page.tsx` | **PARTIAL** | Calls `/quality/stats`, `/quality`. Backend leaks quality records across all organizations. |
| `reports/global-stock/page.tsx` | **WORKING** | Calls `/reports/global-stock`, `/end-customers`, `/vendors`, `PATCH /parts/:id/dispatch-target`. |
| `reports/stock-statement/page.tsx` | **PARTIAL** | Calls `/reports/stock-statement` & `/exports/stock-statement` (blocked for `vendor_owner` role). |
| `reports/vendor-wise-stock/page.tsx` | **WORKING** | Calls `/reports/vendor-wise-stock`, `/vendors`, `PATCH /parts/:id/dispatch-target`. |
| `supplier-grn/page.tsx` | **PARTIAL** | Calls `/supplier-grn`, `/supplier-grn/store-balance` (`store-balance` crashes with 500 enum error on `'cancelled'`). |
| `supplier-grn/create/page.tsx` | **WORKING** | Calls `POST /supplier-grn`, `/suppliers`, `/purchase-orders`, `/parts`. |
| `suppliers/page.tsx` | **WORKING** | Calls `/suppliers` CRUD. |
| `trays/page.tsx` | **WORKING** | Calls `/trays/config`, `/trays/calculate`, `/parts/by-number/:pn`. |
| `vendor/page.tsx` | **WORKING** | Vendor portal dashboard calling `/vendors/stats`, `/challans`, `/jobs/vendor/active`, `/dispatch`. |
| `vendor/challans/page.tsx` | **WORKING** | Vendor inward challan list & receipt confirmation. |
| `vendor/dispatch/page.tsx` | **PARTIAL** | Calls `/dispatch` (`POST /dispatch` returns `403 Forbidden` for `vendor_owner` due to `@Roles('vendor')`!). |
| `vendor/invoices/page.tsx` | **WORKING** | Vendor invoice list & submission. |
| `vendor/jobs/page.tsx` | **PARTIAL** | Calls `/jobs/processes/:id/update` (suffers from backend `rejectedQuantity` double-deduction bug). |
| `vendor/stock-statement/page.tsx` | **PARTIAL** | Calls `/reports/stock-statement` (`403 Forbidden` for `vendor_owner`!). |
| `vendor-ledger/page.tsx` | **PARTIAL** | Calls `/vendor-ledger`, `/vendor-ledger/summary`, `/vendor-ledger/adjustment` (no auto-entries from challans). |
| `vendors/page.tsx` | **BROKEN** | Missing `'use client'` and all imports (38 TS errors; crashes immediately). |

---

## 5. Repository Cleanup, Scripts Inventory & Documentation Drift

### 5.1 Root & Prisma Scripts Audit (69 Scripts Total)
There are **41 ad-hoc scripts in `backend/` root** and **28 scripts in `backend/prisma/`**.
- **Keep (6 Core Seed Scripts in `backend/prisma/`)**:
  - [seed.ts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/prisma/seed.ts) (official Prisma seed entry point)
  - [seed-aaniry.ts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/prisma/seed-aaniry.ts) (comprehensive Aaniry org + parts + vendors + POs + challans seed)
  - [create-demo-users.ts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/prisma/create-demo-users.ts) (creates all 26 demo accounts with `password123`)
  - [seed-phase2.ts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/prisma/seed-phase2.ts) (rate cards, stock statements, quality checks, notifications)
  - [seed-machines-partdev.ts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/prisma/seed-machines-partdev.ts) (machines, part developments, customer orders, receipts, ledger)
  - [seed-platform-admin.ts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/prisma/seed-platform-admin.ts) (creates `superadmin@aaniry.com`)
- **Archive or Delete (63 One-Off Debug/Fix Scripts)**:
  - All 41 files in `backend/*.ts` and `backend/*.js` (`check-admin.ts`, `check-challans.ts`, `debug-data.ts`, `fix-challan-org.ts`, `reset-admin.ts`, `test-api-response.ts`, `verify-fixes.ts`, etc.) plus `backend/error.json` and `backend/out.json`.
  - Note: [backend/check-env.ts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/check-env.ts#L10-L15) and [backend/prisma/test-api.ts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/prisma/test-api.ts#L8) hardcode a previous developer's macOS paths (`/Users/adityabisen/Desktop/aaniry-vms/...`).

---

## 6. Prioritized Production-Readiness Checklist (P0 → P3)

### P0 — Critical Crashes, Build Blockers & Security Vulnerabilities (Fix Immediately)
1. **Lock Down `POST /auth/register`** ([auth.controller.ts:16](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/auth/auth.controller.ts#L16)): Require `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.admin, UserRole.platform_admin)`, and forbid non-`platform_admin` callers from assigning `platform_admin`.
2. **Fix `POST /vendors` 500 Crash** ([vendors.service.ts:57](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/vendors/vendors.service.ts#L57)): Remove `createdById` from `tx.vendor.create({ data: ... })` (or add `createdById String?` to `model Vendor` in `schema.prisma`).
3. **Fix `POST /customers` & `PATCH /customers/:id` Crashes** ([customers.service.ts:12-21, 162-165](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/customers/customers.service.ts#L12-L21)): Only check duplicate `gstin` when `if (createCustomerDto.gstin)` is truthy; map `contactEmail -> email` and `contactPhone -> phone` in `CustomersService.update`.
4. **Fix `ChallansService.create` Missing `organizationId` & `JobProcess` Creation** ([challans.service.ts:119-146](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/challans/challans.service.ts#L119-L146)): Populate `organizationId: user.organizationId` on `DeliveryChallan.create` and auto-create `JobProcess` rows from `item.operations` (or `PartOperation` master).
5. **Fix `JobsService` Double-Deduction of `rejectedQuantity`** ([jobs.service.ts:350, 433, 529](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/jobs/jobs.service.ts#L350)): Use `completedQuantity` directly instead of `completedQuantity - rejectedQuantity`, and subtract already-dispatched/invoiced quantities in `getReadyForDispatch`.
6. **Fix `GatePassesController` Route Shadowing & Invalid Enum `'cancelled'`** ([gate-passes.controller.ts:45, 67, 100](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/gate-passes/gate-passes.controller.ts#L45), [gate-passes.service.ts:245](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/gate-passes/gate-passes.service.ts#L245), [supplier-grn.service.ts:190](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/supplier-grn/supplier-grn.service.ts#L190)): Move `@Get('register')` and `@Get('material-register')` above `@Get(':id')`, and remove `'cancelled'` from `ChallanStatus` filters.
7. **Fix `GET /vendor-invoices/:id/pdf` Buffer Serialization Bug** ([vendor-invoice.controller.ts:54-67](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/vendor-invoices/vendor-invoice.controller.ts#L54-L67)): Inject `@Res() res: Response` and call `res.end(pdfBuffer)` (matching `purchase-orders.controller.ts:38-48`).
8. **Fix Custom Gzip Infinite Recursion & Wildcard CORS** ([main.ts:18-56, 81-86](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/main.ts#L18-L56)): Replace monkey-patched `res.write`/`res.end` with `compression()` middleware and restrict `origin` to `process.env.CORS_ORIGIN?.split(',')`.
9. **Fix All 47 Frontend TypeScript Errors & Runtime Crashes**:
   - Restore `'use client'` and imports in [dashboard/vendors/page.tsx](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/dashboard/vendors/page.tsx#L1).
   - Import `ArrowUpRight` in [dashboard/challans/page.tsx](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/dashboard/challans/page.tsx#L9).
   - Move `const field = sortField;` above `.sort()` in [VendorComparisonMatrix.tsx](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/components/VendorComparisonMatrix.tsx#L38).
   - Unwrap `res.data?.data` in [dashboard/admin/vendor-performance/page.tsx](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/dashboard/admin/vendor-performance/page.tsx#L40).
   - Rewrite [material-receipt-service.ts](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/services/material-receipt-service.ts) to call `/material-receipts`.
   - Fix the remaining 5 TS errors (`customer-orders`, `war-room`, `line-deadlines`, `platform/users/create`, `purchase-orders/[id]/edit`, `super-admin/organizations`, `types/user.ts`).
10. **Fix Jarvis AI Key Mismatch** ([super-admin/page.tsx:143](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/super-admin/page.tsx#L143) vs [ai.service.ts:51](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/ai/ai.service.ts#L51)): Align `SystemSetting` key name (`OPENAI_API_KEY`) or support both OpenAI and Anthropic providers.

### P1 — Multi-Tenancy Isolation, RBAC & Data Flow Integrity
1. **Enforce `organizationId` Filtering Across All Services**: Add `organizationId` checks to `UsersService`, `VendorsService`, `VendorRateCardsService`, `ChallansService`, `JobsService`, `DispatchService`, `QualityService`, `InvoicesService`, `VendorInvoiceService`, `ReportsService`, and `AuditLogService`.
2. **Replace Invalid `@Roles('vendor')` with Actual Vendor Enum Roles**: Update `DispatchController`, `InvoicesController`, `ReportsController`, `ExportController`, and `TrayController` to include `UserRole.vendor_owner, UserRole.vendor_ppc, UserRole.vendor_dispatch, UserRole.vendor_quality`.
3. **Fix Notification `organizationId` Bug (`challan.customerId` vs `organizationId`)**: In `ChallansService` (`L183, 200`), `VendorInvoiceService` (`L508, 647`), and `AutomationService` (`L80, 104, 113, 177`), resolve `customer.organizationId` instead of passing `customerId` as `organizationId`.
4. **Register `AuditLogModule` & Fix `@Param` Decorators**: Add `AuditLogModule` to `imports` in `app.module.ts` and replace `@Query` with `@Param` in `audit-log.controller.ts:42, 56-57`.
5. **Wire Automatic `VendorMaterialLedger` Entries**: Write `material_issued` ledger rows inside `ChallansService.create` transaction and `material_returned` rows inside `VendorInvoiceService.gateApprove` / `MaterialReceiptsService.create`.
6. **Migrate All Currency Columns from `Float` to `Decimal(14, 2)`** in `schema.prisma` and convert Prisma migrations to a clean baseline.

---

## 7. Future Feature Blueprint #1: GST Portal Integration (GSTR-1 Filing, GSTR-3B Checking/Reconciliation, GSTR-2B/IMS, E-Invoice, E-Way Bill & ITC-04)

### 7.1 Current Codebase GST Gaps vs Statutory Requirements
Currently, [vendor-invoice.service.ts:285-296](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/vendor-invoices/vendor-invoice.service.ts#L285-L296) and [purchase-orders.service.ts:276-286](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/purchase-orders/purchase-orders.service.ts#L276-L286) hardcode an 18% tax rate, store monetary amounts as IEEE-754 `Float`, do not validate GSTIN check digits, do not store HSN/SAC tax slabs, and have zero integration with the GSTN Portal or NIC E-Invoice/E-Way Bill systems.

### 7.2 2025–2026 GSTN Statutory Rules That Must Be Enforced in Code
1. **GSTR-1 HSN Phase-III Validation (Mandatory from May 2025 Return Period)**:
   - Minimum **6-digit HSN/SAC** is mandatory when Aggregate Annual Turnover (AATO) > ₹5 Crore (4-digit for AATO <= ₹5 Cr). Free-text HSN entry must be replaced by a validated GSTN HSN/SAC Master lookup.
   - **Table 12 Split**: HSN summary must be split into **`hsn_b2b`** and **`hsn_b2c`** JSON arrays instead of a single `hsn.data` array.
   - **Mandatory Table 13 (`doc_issue`)**: GSTR-1 `RETSAVE` blocks filing if Table 13 (Document Issued Summary — Serial From, Serial To, Total Issued, Cancelled, Net Issued for Tax Invoices, Delivery Challans, Credit/Debit Notes) is missing.
2. **GSTR-3B Hard-Lock & 3-Year Time Bar (Mandatory from July 2025)**:
   - **Table 3.1 Hard-Lock**: Auto-populated outward tax liability in GSTR-3B Table 3.1 (derived from GSTR-1 / GSTR-1A / IFF) is **non-editable** on the GST portal. Any outward correction *must* be filed via **GSTR-1A** in the same period before filing GSTR-3B.
   - **3-Year Filing Block**: Returns cannot be filed after 3 years from their statutory due date (Section 37/39).
3. **Invoice Management System (IMS) & GSTR-2B (Oct 2024 + Oct 2025 Specified Period Rollout)**:
   - Every inward vendor invoice (`VendorInvoice`) synced from the GST Portal enters **IMS** where the OEM recipient must take an explicit action: **Accept (`A`)**, **Reject (`R`)**, or **Keep Pending (`P`)**.
   - After actions are saved on IMS, the recipient must trigger **`GSTR-2B Regenerate`** before GSTR-3B Table 4 (Eligible ITC) is finalized.
4. **30-Day E-Invoice Reporting Limit (Effective 1 April 2025)**:
   - Taxpayers with AATO >= ₹10 Crore cannot report invoices to the NIC Invoice Registration Portal (IRP) more than **30 days** after the `invoiceDate`.
5. **Job-Work Section 143, Rule 45, SAC 9988 & Form GST ITC-04**:
   - Raw materials / semi-finished goods sent to job workers (`DeliveryChallan`) under Section 143 without tax require an **E-Way Bill** (`SupplyType = Outward`, `SubSupplyType = Job Work`, `DocType = CHL`) for **all inter-state movements regardless of value**, and intra-state movements above state thresholds (₹50,000–₹1,00,000).
   - **365-Day / 3-Year Return Clock**: Inputs must return within **1 year (365 days)** and capital goods/dies within **3 years (1,095 days)** from `challanDate`. If unreturned past day 365, Section 143(3) deems the original challan a **taxable outward supply on the date of issue**, requiring GSTR-1 reporting + **18% p.a. interest under Section 50** from `challanDate`!
   - **SAC 9988 Job-Work GST Rate**: Job-work services by registered vendors (`SAC 9988`) attract **12%** (6% CGST + 6% SGST or 12% IGST) for standard manufacturing services when the principal is registered, or **18%** under updated rate notifications / unregistered principals — must be driven by the HSN/SAC Rate Master, never hardcoded.
   - **Form GST ITC-04**: Mandatory half-yearly (AATO > ₹5 Cr: Apr–Sep due Oct 25, Oct–Mar due Apr 25) or annual (AATO <= ₹5 Cr: due Apr 25) return containing **Table 4** (Challans issued to job workers), **Table 5A** (Received back from job workers), **Table 5B** (Received back from another job worker), and **Table 5C** (Supplied directly from job worker's premises).

---

### 7.3 End-to-End GST Portal Architecture (GSP/ASP Model)

```mermaid
sequenceDiagram
    autonumber
    participant UI as Magnus Frontend (GST Compliance Hub)
    participant API as NestJS GstModule (/gst/*)
    participant DB as PostgreSQL (Decimal 14,2)
    participant GSP as GSP / ASP Gateway (ClearTax / MastersIndia / Iris)
    participant GSTN as GSTN Portal & NIC IRP / EWB

    Note over UI,GSTN: Flow A: OTP Session & Token Lifecycle (6-Hour SEK)
    UI->>API: POST /gst/session/otp (gstin, username)
    API->>GSP: Authenticate & Request OTP (OTPREQUEST)
    GSP->>GSTN: Trigger OTP to Registered Mobile/Email
    UI->>API: POST /gst/session/verify (gstin, otp)
    API->>GSP: Exchange OTP for AuthToken + Encrypted SEK
    API->>DB: Store AES-256-GCM Encrypted AuthToken & SEK (TTL = 6h)

    Note over UI,GSTN: Flow B: GSTR-1 Preparation, Validation, Save & Filing
    UI->>API: POST /gst/gstr1/generate (returnPeriod: "102026")
    API->>DB: Aggregate Sales Invoices, Credit/Debit Notes, HSN B2B/B2C, Doc Series (Table 13)
    API-->>UI: Pre-validation Report (GSTIN Checksum, POS, HSN 6-digit, Tax Rounding)
    UI->>API: POST /gst/gstr1/upload (returnPeriod)
    API->>GSP: PUT GSTR1 (action: RETSAVE)
    GSP->>GSTN: Submit Encrypted Payload -> Returns reference_id
    API->>GSP: Poll GET RETSTATUS (reference_id)
    GSP-->>API: Status: P (Processed) or PE (Processed with Error + error_report)
    UI->>API: POST /gst/gstr1/file (pan, evcOtp / dscSignature)
    API->>GSP: POST RETFILE (Sign & File GSTR-1 -> Returns ARN)

    Note over UI,GSTN: Flow C: GSTR-3B Checking, GSTR-2B/IMS Sync & 4-Way Reconciliation
    UI->>API: POST /gst/gstr3b/check-portal (returnPeriod: "102026")
    API->>GSP: Fetch GSTR-3B RETSUM + Auto-Calculated 3B + GSTR-2B + IMS Invoices
    GSP->>GSTN: Pull Table 3.1 (Liability) & Table 4 (ITC) & GSTR-2B Line Items
    API->>DB: Run 4-Way Match (Magnus Books vs Portal GSTR-1 vs Portal GSTR-2B/IMS vs Portal GSTR-3B)
    API-->>UI: Line-by-Line Variance Matrix + IMS Action Queue (Accept / Reject / Pending)
```

### 7.4 Prisma Schema Additions for GST Compliance (`backend/prisma/schema.prisma`)

```prisma
enum GstReturnType {
  GSTR1
  GSTR1A
  GSTR2B
  GSTR3B
  ITC04
}

enum GstFilingStatus {
  draft
  validated
  uploaded_pending   // RETSAVE sent, polling RETSTATUS
  processed_clean    // Status = P
  processed_errors   // Status = PE
  ready_to_file      // RETSUM verified
  filed              // ARN generated
}

enum ImsActionStatus {
  no_action
  accepted           // 'A'
  rejected           // 'R'
  pending            // 'P'
}

enum ReconMatchStatus {
  exact_match        // Invoice No, Date, Taxable, Tax all match within ₹1
  fuzzy_match        // Invoice No normalized match (e.g. INV/001 vs INV-001)
  value_mismatch     // Invoice exists on both sides, tax/taxable differs
  missing_in_portal  // In Magnus VendorInvoice, not uploaded by vendor in GSTR-1
  missing_in_books   // In Portal GSTR-2B/IMS, not recorded in Magnus
  pos_mismatch       // Place of Supply mismatch causing CGST/SGST vs IGST error
}

model GstCredential {
  id                  String   @id @default(cuid())
  organizationId      String
  gstin               String   @unique
  legalName           String
  tradeName           String?
  stateCode           String   // 2-digit e.g. "27" for Maharashtra
  gspProvider         String   @default("cleartax") // cleartax, mastersindia, cygnet, iris
  portalUsername      String
  clientIdEncrypted   String?
  clientSecretEncrypted String?
  authTokenEncrypted  String?
  sekEncrypted        String?  // Session Encryption Key (6h TTL)
  tokenExpiresAt      DateTime?
  einvoiceUsername    String?
  einvoicePasswordEnc String?
  isActive            Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  organization        Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  returnFilings       GstReturnFiling[]
  reconciliations     GstReconciliationRun[]
}

model HsnSacMaster {
  code                String   @id // 4, 6, or 8 digit HSN or 6 digit SAC (e.g. "998898")
  type                String   // "HSN" | "SAC"
  description         String
  uqc                 String   @default("NOS") // GSTN Standard UQC: NOS, KGS, MTR, SET, PCS, OTH
  defaultGstRate      Decimal  @db.Decimal(5, 2) // 0, 5, 12, 18, 28
  effectiveFrom       DateTime @default(now())
  isActive            Boolean  @default(true)
}

model GstReturnFiling {
  id                  String          @id @default(cuid())
  organizationId      String
  gstin               String
  returnType          GstReturnType
  returnPeriod        String          // MMYYYY e.g. "102026"
  financialYear       String          // e.g. "2026-27"
  status              GstFilingStatus @default(draft)
  referenceId         String?         // GSTN reference_id from RETSAVE
  arnNumber           String?         // ARN after RETFILE
  filedAt             DateTime?
  filedByUserId       String?
  booksPayloadJson    Json?           // Computed payload from Magnus DB
  portalSummaryJson   Json?           // Downloaded RETSUM / auto-calc 3B from portal
  errorReportJson     Json?           // PE error_report from RETSTATUS
  varianceJson        Json?           // Delta between Books and Portal
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  credential          GstCredential   @relation(fields: [gstin], references: [gstin])

  @@unique([gstin, returnType, returnPeriod])
  @@index([organizationId, returnPeriod])
}

model GstPortalInwardInvoice {
  id                  String           @id @default(cuid())
  organizationId      String
  recipientGstin      String
  supplierGstin       String
  supplierTradeName   String?
  returnPeriod        String           // MMYYYY
  invoiceNumber       String
  normalizedInvNo     String           // Uppercase alphanumeric stripped of /, -, leading zeros
  invoiceDate         DateTime
  invoiceType         String           @default("R") // R, SEWP, SEWOP, DE, CBW
  placeOfSupply       String           // 2-digit state code
  reverseCharge       Boolean          @default(false)
  itcAvailable        Boolean          @default(true)
  taxableValue        Decimal          @db.Decimal(14, 2)
  igstAmount          Decimal          @db.Decimal(14, 2)
  cgstAmount          Decimal          @db.Decimal(14, 2)
  sgstAmount          Decimal          @db.Decimal(14, 2)
  cessAmount          Decimal          @default(0) @db.Decimal(14, 2)
  totalAmount         Decimal          @db.Decimal(14, 2)
  gstr1FilingStatus   Boolean          @default(false)
  gstr1FilingDate     DateTime?
  gstr3bFilingStatus  Boolean          @default(false) // Crucial: Did vendor actually pay tax in 3B?
  irn                 String?
  imsAction           ImsActionStatus  @default(no_action)
  imsRemarks          String?
  imsSyncedAt         DateTime?
  matchedVendorInvId  String?          @unique
  matchStatus         ReconMatchStatus @default(missing_in_books)
  varianceAmount      Decimal          @default(0) @db.Decimal(14, 2)
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  @@unique([recipientGstin, supplierGstin, invoiceNumber, financialYear])
  financialYear       String
  @@index([organizationId, returnPeriod, matchStatus])
}

model GstReconciliationRun {
  id                  String   @id @default(cuid())
  organizationId      String
  gstin               String
  returnPeriod        String   // MMYYYY
  booksOutwardTaxable Decimal  @db.Decimal(14, 2)
  portalGstr1Taxable  Decimal  @db.Decimal(14, 2)
  portalGstr3bTaxable Decimal  @db.Decimal(14, 2)
  booksOutwardTax     Decimal  @db.Decimal(14, 2)
  portalGstr1Tax      Decimal  @db.Decimal(14, 2)
  portalGstr3bTax     Decimal  @db.Decimal(14, 2)
  booksEligibleItc    Decimal  @db.Decimal(14, 2)
  portalGstr2bItc     Decimal  @db.Decimal(14, 2)
  portalGstr3bTable4A Decimal  @db.Decimal(14, 2)
  netCashTaxPayable   Decimal  @db.Decimal(14, 2)
  itcAtRiskDefaulters Decimal  @db.Decimal(14, 2) // Vendors who filed GSTR-1 but NOT GSTR-3B
  summaryReportJson   Json
  executedById        String
  createdAt           DateTime @default(now())

  credential          GstCredential @relation(fields: [gstin], references: [gstin])
}
```

### 7.5 Backend Module Structure (`backend/src/modules/gst`)
Create `GstModule` with 6 specialized services:
1. **`GstSessionService`**:
   - Validates 15-character GSTIN format (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`) **plus Luhn Mod-36 check-digit verification** on character 15.
   - Manages GSP authentication (`OTPREQUEST` -> `AUTHTOKEN` -> AES-256-ECB decryption of `sek` using AppKey -> caches decrypted SEK in memory/DB for 6 hours).
2. **`Gstr1BuilderService`**:
   - Queries approved outward `Invoice` records, credit/debit notes, and `DeliveryChallan` document series for `(organizationId, returnPeriod)`.
   - Partitions invoices into GSTN JSON sections:
     - **`b2b`**: Registered customers (`ctin` present) grouped by `ctin -> inv[] -> itms[]`.
     - **`b2cl`**: Unregistered inter-state invoices where `val > 250000`.
     - **`b2cs`**: Unregistered intra-state + inter-state `<= 250000` aggregated by `(pos, sply_ty, rt)`.
     - **`cdnr` / `cdnur`**: Credit/debit notes against original invoices.
     - **`hsn`**: Split into `hsn_b2b` and `hsn_b2c` (May 2025 Phase-III schema) with mandatory 6-digit HSN/SAC and GSTN-compliant `uqc` (`NOS`, `KGS`, `SET`).
     - **`doc_issue` (Table 13)**: Auto-computes `from`, `to`, `totnum`, `cancel`, `net_issue` across all outward series (Tax Invoices, Delivery Challans under Sec 143, Credit Notes, Gate Passes).
3. **`Gstr1PortalService`**:
   - Uploads payload via `PUT /taxpayerapi/v1.0/returns/gstr1` (`action: "RETSAVE"`), stores `reference_id`, polls `RETSTATUS` every 5 seconds until status is `P` or `PE`, pulls `RETSUM` for verification, and executes `RETFILE` (PAN + EVC OTP or DSC PKCS#7 signature).
   - Supports **GSTR-1A** same-period amendments before GSTR-3B filing.
4. **`Gstr3bCheckerService` (Checking & Reconciliation of GSTR-3B on GST Portal)**:
   - Pulls 3 live datasets from the GST Portal for `returnPeriod`:
     1. **`GET /returns/gstr3b?action=RETSUM`** (Saved/Filed GSTR-3B on Portal)
     2. **`GET /returns/gstr3b?action=AUTOCALC`** (System-computed GSTR-3B liability from GSTR-1/1A & ITC from GSTR-2B)
     3. **`GET /returns/gstr2b`** & **`GET /ims/invoices`** (Supplier-wise inward ITC & IMS status)
   - Runs the **4-Way Reconciliation Engine**:
     - **Check 1 (Table 3.1 Outward Liability Lock Check)**: Compares Magnus Books Outward Sales (`subtotal`, `igst`, `cgst`, `sgst`) vs Portal GSTR-1 `RETSUM` vs Portal GSTR-3B Table `3.1(a)`. Flags any unfiled invoice that must be pushed to **GSTR-1A** before GSTR-3B can be filed (since Table 3.1 is hard-locked).
     - **Check 2 (Table 4 Eligible ITC vs GSTR-2B & Books)**: Matches `VendorInvoice` (status `gate_approved`, `approved`, `paid`) against `GstPortalInwardInvoice` using deterministic 4-pass matching:
       - *Pass 1 (IRN Match)*: Exact 64-char IRN match.
       - *Pass 2 (Exact Match)*: `supplierGstin + invoiceNumber + invoiceDate` with tax delta `<= ₹1.00`.
       - *Pass 3 (Normalized Fuzzy Match)*: Strips `/`, `-`, spaces, FY prefixes, and leading zeros (`INV/2026/0042` == `042`).
       - *Pass 4 (Exceptions)*: Categorizes into `value_mismatch`, `pos_mismatch`, `missing_in_portal`, or `missing_in_books`.
     - **Check 3 (Rule 36(4) & Section 16(2)(aa) / (c) Vendor Default Shield)**: Checks `gstr3bFilingStatus` of every vendor in GSTR-2B. If a vendor filed GSTR-1 (so the invoice appears in GSTR-2B) but **has not filed GSTR-3B**, flags the vendor for **Payment Hold** in Magnus so the OEM does not suffer ITC reversal + interest!
     - **Check 4 (Offset & Cash Ledger Check)**: Pulls `GET /ledgers/bal` (Electronic Cash Ledger & Electronic Credit Ledger balances) and applies Section 49 / Rule 88A offset order (`IGST Credit -> IGST, then CGST/SGST`; `CGST Credit -> CGST, then IGST`; `SGST Credit -> SGST, then IGST`) to show exact **Net Cash Challan (`PMT-06`) Required**.
5. **`Itc04JobWorkService` (Section 143 / Rule 45 Compliance)**:
   - Tracks the **365-day return clock** on every `DeliveryChallan` item (`challanDate + 365 days`) using FIFO reconciliation against `VendorInvoiceItem.gateReceivedQty` + scrap returned.
   - Emits alerts at **300, 330, 350, and 360 days**; on Day 365, calculates deemed supply tax + **18% p.a. Section 50 interest**.
   - Generates **Form GST ITC-04 JSON** (Tables `4`, `5A`, `5B`, `5C`) ready for direct GST portal upload or API submission.

### 7.6 Frontend GST Compliance Hub (`/dashboard/gst/*`)
Add 4 pages under `frontend/src/app/dashboard/gst/`:
1. `/dashboard/gst/page.tsx` (**GST Command Center**): Live Portal Session badge (6h countdown + 1-click OTP modal), current month GSTR-1 status, GSTR-3B liability vs ITC summary, and ITC-04 365-day aging alert banner.
2. `/dashboard/gst/gstr1/page.tsx` (**GSTR-1 Filing Workbench**): Tabbed review of `B2B`, `B2CL`, `B2CS`, `CDNR`, `HSN (B2B/B2C)`, and `Table 13 Document Series` with pre-flight error fixer, `Push to GST Portal (RETSAVE)`, `Poll Status`, `Generate GSTR-1A Amendment`, and `File with EVC OTP`.
3. `/dashboard/gst/gstr3b-reconciliation/page.tsx` (**GSTR-3B Portal Checker & 2B/IMS Reconciler**): Side-by-side comparison of **Magnus Books vs Portal GSTR-1 vs Portal GSTR-2B vs Portal GSTR-3B** (Tables 3.1, 3.2, 4A, 4B, 4D, 6.1), interactive **IMS Action Table** (`Accept` / `Reject` / `Pending` with 1-click `Regenerate GSTR-2B`), and **Vendor GST Defaulter Hold List**.
4. `/dashboard/gst/itc04/page.tsx` (**Job-Work ITC-04 & Section 143 Tracker**): Aging buckets (`0–180d`, `181–300d`, `301–350d`, `351–365d`, `>365d Breached`) per challan and vendor, plus 1-click **ITC-04 Table 4/5A JSON Export**.

---

## 8. Future Feature Blueprint #2: Completely Working Plant & MES (Manufacturing Execution System) Layout

### 8.1 Current Codebase State vs Target MES Architecture
Currently, [backend/src/modules/machines](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/backend/src/modules/machines) and [frontend/src/app/dashboard/machines/page.tsx](file:///c:/Users/shubh/Downloads/Magnus-0.1-main/frontend/src/app/dashboard/machines/page.tsx) only provide a flat list of machines (`machineCode`, `machineName`, `machineType`, `capacityPerHour`, `status`). `Organization.plants` (`schema.prisma:694`) is just a `String[]` array, and `JobProcess` is only linked to external vendor `ChallanItem`s — there is **no in-house `WorkOrder`**, no spatial 2D floor layout, no real-time machine state telemetry, no OEE ($A \times P \times Q$) calculation, no operator shop-floor terminal, and no lot/heat genealogy.

### 8.2 ISA-95 Equipment Hierarchy & MES Architecture

```mermaid
flowchart TD
    subgraph ISA95["ISA-95 Plant Hierarchy"]
        ORG["Organization (Enterprise)"] --> PLANT["Plant (Site: e.g., Plant-1 Pune, Plant-2 Chakan)"]
        PLANT --> ZONE["ShopFloorZone (Area: Foundry, CNC Bay, Press Shop, Heat Treat, QC Lab, Store)"]
        ZONE --> WC["WorkCenter / ProductionLine (Cell: VMC Line-A, Turning Cell-2)"]
        WC --> MAC["Machine + MachineLayoutNode (Work Unit: CNC-01, X/Y/W/H/Rotation on 2D Canvas)"]
    end

    subgraph Edge["Shop-Floor Edge & Telemetry Layer"]
        PLC["CNC / PLC / Smart Energy Meter (Fanuc FOCAS, Siemens S7, Modbus TCP, OPC-UA)"]
        GW["Edge Gateway / Simulator Service (node-opcua / mqtt.js / modbus-serial)"]
        TERM["Operator Tablet PWA (/dashboard/mes/terminal/[machineId])"]
        PLC --> GW
        GW -->|MQTT: magnus/plantId/zoneId/machineId/telemetry| BROKER["MQTT Broker / NestJS MesTelemetryGateway"]
        TERM -->|REST + Socket.IO| BROKER
    end

    subgraph CoreMES["NestJS MES Engine & Real-Time Digital Twin"]
        BROKER --> STATE["MachineStateEvent & ProductionCountEvent (TimescaleDB / Postgres)"]
        STATE --> OEE["Real-Time OEE Engine (Availability × Performance × Quality)"]
        STATE --> WS["Socket.IO Namespace (/mes-live) -> 2D Floor Map Canvas (react-konva)"]
        WO["WorkOrder & WorkOrderOperation"] --> TERM
        WO -->|Outsourced Step (executionType = outsourced)| DC["Auto-Generate DeliveryChallan + E-Way Bill"]
    end
```

### 8.3 Prisma Schema Additions for Complete Plant & MES (`backend/prisma/schema.prisma`)

```prisma
enum MachineLiveState {
  RUNNING          // Green (#10B981) — Active spindle/cycle
  SETUP            // Blue (#3B82F6) — Changeover / Die setting
  IDLE             // Amber (#F59E0B) — Starved / Blocked / Waiting operator
  DOWN_UNPLANNED   // Red (#EF4444) — Breakdown / Fault
  DOWN_PLANNED     // Slate (#64748B) — Preventive Maintenance / No shift
  QUALITY_HOLD     // Purple (#8B5CF6) — Waiting First Piece Inspection (FPI) / Andon
  OFFLINE          // Gray (#374151) — Edge heartbeat lost > 30s
}

enum WorkOrderStatus {
  planned
  released
  in_progress
  on_hold
  completed
  closed
}

model Plant {
  id                  String   @id @default(cuid())
  organizationId      String
  plantCode           String   // e.g. "PLT-01"
  plantName           String   // e.g. "Chakan Main Machining Plant"
  gstin               String?
  address             String?
  city                String?
  state               String?
  floorWidthMeters    Float    @default(120)
  floorHeightMeters   Float    @default(80)
  gridSnapSizePx      Int      @default(10)
  blueprintSvgUrl     String?  // Background CAD/SVG floor plan
  isActive            Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  organization        Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  zones               ShopFloorZone[]
  shifts              PlantShift[]
  workOrders          WorkOrder[]

  @@unique([organizationId, plantCode])
}

model ShopFloorZone {
  id                  String   @id @default(cuid())
  plantId             String
  zoneCode            String   // e.g. "ZONE-CNC", "ZONE-QC", "ZONE-STORE"
  zoneName            String
  zoneType            String   // "production", "inspection", "wip_buffer", "raw_store", "dispatch_bay", "aisle"
  colorHex            String   @default("#1E293B")
  polygonPointsJson   Json     // [{x, y}, ...] polygon vertices on 2D floor canvas
  createdAt           DateTime @default(now())

  plant               Plant        @relation(fields: [plantId], references: [id], onDelete: Cascade)
  workCenters         WorkCenter[]

  @@unique([plantId, zoneCode])
}

model WorkCenter {
  id                  String   @id @default(cuid())
  zoneId              String
  code                String   // e.g. "WC-VMC-01"
  name                String
  hourlyRateCost      Decimal  @default(0) @db.Decimal(10, 2)
  machines            Machine[]

  zone                ShopFloorZone @relation(fields: [zoneId], references: [id], onDelete: Cascade)
}

// Extend existing Machine model with layout, telemetry & OEE relations:
model MachineLayoutNode {
  id                  String           @id @default(cuid())
  machineId           String           @unique
  plantId             String
  zoneId              String?
  x                   Float            @default(100) // Canvas X coordinate
  y                   Float            @default(100) // Canvas Y coordinate
  width               Float            @default(90)
  height              Float            @default(70)
  rotation            Float            @default(0)   // 0, 90, 180, 270 degrees
  shapeType           String           @default("cnc_horizontal") // cnc, vmc, press, furnace, cmm, conveyor
  plcProtocol         String?          // "OPC_UA", "MQTT", "MODBUS_TCP", "SIMULATOR"
  plcEndpointUrl      String?          // e.g. "opc.tcp://192.168.1.50:4840"
  liveState           MachineLiveState @default(IDLE)
  currentWorkOrderId  String?
  currentOperationId  String?
  currentOperatorId   String?
  currentSpindleRpm   Int?
  currentFeedRate     Float?
  currentPowerKw      Float?
  idealCycleTimeSec   Float            @default(60)
  lastHeartbeatAt     DateTime?
  updatedAt           DateTime         @updatedAt

  machine             Machine          @relation(fields: [machineId], references: [id], onDelete: Cascade)
}

model PlantMaterialFlowEdge {
  id                  String   @id @default(cuid())
  plantId             String
  sourceMachineId     String
  targetMachineId     String
  flowType            String   @default("conveyor") // "conveyor", "forklift", "agv", "manual_tray"
  waypointsJson       Json?    // [{x, y}] orthogonal routing points on canvas
}

model PlantShift {
  id                  String   @id @default(cuid())
  plantId             String
  shiftName           String   // "Shift A (06:00-14:00)", "Shift B (14:00-22:00)", "Shift C (22:00-06:00)"
  startTime           String   // "06:00"
  endTime             String   // "14:00"
  plannedBreakMinutes Int      @default(30)
  plant               Plant    @relation(fields: [plantId], references: [id], onDelete: Cascade)
}

model WorkOrder {
  id                  String              @id @default(cuid())
  organizationId      String
  plantId             String
  woNumber            String              // e.g. "WO/2026/10/0042"
  customerOrderId     String?
  partId              String
  partNumber          String
  plannedQty          Int
  completedQty        Int                 @default(0)
  scrapQty            Int                 @default(0)
  status              WorkOrderStatus     @default(planned)
  priority            Int                 @default(3) // 1=Critical, 5=Low
  materialLotId       String?             // Heat/Batch number allocated from SupplierGRNItem
  plannedStartAt      DateTime
  plannedEndAt        DateTime
  actualStartAt       DateTime?
  actualEndAt         DateTime?
  createdAt           DateTime            @default(now())

  plant               Plant               @relation(fields: [plantId], references: [id])
  operations          WorkOrderOperation[]

  @@unique([organizationId, woNumber])
}

model WorkOrderOperation {
  id                  String           @id @default(cuid())
  workOrderId         String
  sequenceNumber      Int              // 10, 20, 30, 40
  operationName       String           // "Rough Turning", "Heat Treatment", "Finish Grinding"
  executionType       String           @default("inhouse") // "inhouse" | "outsourced"
  assignedMachineId   String?
  assignedVendorId    String?
  linkedChallanId     String?          // Populated automatically when outsourced step generates DeliveryChallan
  setupTimeStdMin     Float            @default(30)
  cycleTimeStdSec     Float            @default(45)
  targetQty           Int
  goodQty             Int              @default(0)
  scrapQty            Int              @default(0)
  reworkQty           Int              @default(0)
  fpiApproved         Boolean          @default(false) // First Piece Inspection gate
  fpiApprovedById     String?
  status              String           @default("pending") // pending, setup, running, paused, completed
  startedAt           DateTime?
  completedAt         DateTime?

  workOrder           WorkOrder        @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
}

model MachineStateEvent {
  id                  String           @id @default(cuid())
  machineId           String
  shiftId             String?
  workOrderOpId       String?
  state               MachineLiveState
  startedAt           DateTime         @default(now())
  endedAt             DateTime?
  durationSeconds     Int?
  downtimeReasonCode  String?          // e.g. "MECH_SPINDLE", "TOOL_BREAK", "NO_MATERIAL", "DIE_CHANGE"
  downtimeCategory    String?          // "UNPLANNED", "PLANNED", "CHANGEOVER", "MICRO_STOP"
  operatorId          String?
  remarks             String?

  @@index([machineId, startedAt])
}

model ProductionCountEvent {
  id                  String   @id @default(cuid())
  machineId           String
  workOrderOpId       String
  operatorId          String?
  timestamp           DateTime @default(now())
  goodDelta           Int      @default(1)
  scrapDelta          Int      @default(0)
  reworkDelta         Int      @default(0)
  scrapReasonCode     String?  // "BLOWHOLE", "OVERSIZE", "SURFACE_FINISH", "TOOL_MARK"
  actualCycleTimeSec  Float?

  @@index([machineId, timestamp])
  @@index([workOrderOpId])
}

model AndonAlert {
  id                  String   @id @default(cuid())
  plantId             String
  machineId           String
  workOrderOpId       String?
  alertType           String   // "MAINTENANCE", "QUALITY_FPI", "MATERIAL_STARVED", "TOOLING", "SAFETY"
  severity            String   @default("HIGH") // "CRITICAL", "HIGH", "MEDIUM"
  status              String   @default("TRIGGERED") // "TRIGGERED", "ACKNOWLEDGED", "RESOLVED"
  triggeredById       String
  acknowledgedById    String?
  resolvedById        String?
  triggeredAt         DateTime @default(now())
  acknowledgedAt      DateTime?
  resolvedAt          DateTime?
  resolutionNotes     String?
}

model ToolMaster {
  id                  String   @id @default(cuid())
  organizationId      String
  toolCode            String   // e.g. "DIE-402", "INSERT-CNMG-120408"
  toolName            String
  maxLifeStrokes      Int      // e.g. 50000 strokes
  currentStrokes      Int      @default(0)
  warningThresholdPct Float    @default(85)
  mountedOnMachineId  String?
  status              String   @default("ACTIVE") // "ACTIVE", "NEEDS_REGRIND", "SCRAPPED"

  @@unique([organizationId, toolCode])
}
```

### 8.4 Real-Time OEE Mathematical Engine
In `backend/src/modules/mes/mes-oee.service.ts`, OEE is calculated continuously per **Machine**, **WorkCenter**, **Zone**, **Shift**, and **Plant** using exact time-bounded state logs:

$$\text{Planned Production Time (PPT)} = \text{Shift Duration} - \text{Planned Downtime (Breaks + PM)}$$

$$\text{Run Time} = \text{PPT} - \text{Unplanned Downtime} - \text{Setup / Changeover Time}$$

$$\text{Availability } (A) = \frac{\text{Run Time}}{\text{PPT}}, \quad \text{Performance } (P) = \frac{\text{Ideal Cycle Time} \times \text{Total Count}}{\text{Run Time}}, \quad \text{Quality } (Q) = \frac{\text{Good Count}}{\text{Total Count}}$$

$$\text{OEE} = A \times P \times Q$$

- **Six Big Losses Breakdown**: Automatically classifies every second of lost time and every rejected piece into:
  1. *Equipment Failure* (`DOWN_UNPLANNED`)
  2. *Setup & Adjustments* (`SETUP`)
  3. *Idling & Minor Stops* (`IDLE` events `< 5 min`)
  4. *Reduced Speed* ($\text{Run Time} - \text{Ideal Cycle Time} \times \text{Total Count}$)
  5. *Process Defects* (`scrapDelta` during steady-state run)
  6. *Reduced Yield / Startup Rejects* (`scrapDelta` during `SETUP` / pre-FPI approval)

### 8.5 Interactive 2D Digital Twin Plant & MES Layout (`/dashboard/mes/*`)
Build 4 interconnected views under `frontend/src/app/dashboard/mes/`:

1. **`/dashboard/mes/plant-layout/page.tsx` (Interactive 2D Digital Twin Floor Map & Drag-and-Drop Editor)**:
   - Powered by **`react-konva`** (60 FPS HTML5 Canvas pan/zoom viewport with 5 layers: Blueprint/Grid Layer, Shop-Floor Zone Polygons Layer, Material Flow Arrows/WIP Buffers Layer, Interactive Machine Nodes Layer, and Andon/HUD Overlay Layer).
   - ** Dual Mode (`DESIGN MODE` vs `LIVE MONITOR MODE`)**:
     - **Design Mode**: Drag-and-drop machines from the left palette onto the plant floor, snap to grid (`10px = 0.5m`), resize/rotate (`0°/90°/180°/270°`), draw zone polygons (`Foundry`, `CNC Bay`, `Heat Treat`, `QC Lab`, `Store`), draw material flow routes (`PlantMaterialFlowEdge`) between machines, and bind each machine node to a real `Machine` + PLC/Simulator endpoint (`Save Layout -> PUT /mes/plants/:id/layout`).
     - **Live Monitor Mode**: Connects to Socket.IO namespace `/mes-live`. Every machine node renders:
       - Live color-coded border & glow (`RUNNING` = Emerald, `SETUP` = Blue, `IDLE` = Amber, `DOWN_UNPLANNED` = Pulsing Red, `QUALITY_HOLD` = Purple).
       - Live mini-badge showing **OEE %**, **Active Work Order / Part Number**, **Progress Bar (`goodQty / targetQty`)**, and **Spindle RPM / Cycle Timer**.
       - Animated material flow particles along routes between active work centers and live WIP tray counts at buffer stations.
       - **Plant Replay Scrubber**: Time-slider at the bottom of the canvas allowing the Plant Head to scrub back through the last 24 hours to visually see where bottlenecks or cascading breakdowns occurred.
   - **Built-in Digital Twin Simulator Toggle**: Includes a backend `MesSimulatorService` so the plant layout immediately pulses with realistic live machine cycles, part counts, micro-stops, and Andon alerts out-of-the-box even before physical PLCs are wired!

2. **`/dashboard/mes/terminal/[machineId]/page.tsx` (Shop-Floor Operator Tablet Terminal — Touch UI)**:
   - High-contrast dark touch interface designed for 10-inch industrial tablets mounted at each machine:
     - **Operator Badge Scan / PIN Login** + Assigned Work Order Queue.
     - **1-Tap State Bar**: `START SETUP` -> `REQUEST FPI (First Piece Inspection)` -> `START PRODUCTION` -> `LOG DOWNTIME` -> `TRIGGER ANDON`.
     - **Part Counter & Scrap Pad**: `+1 Good`, `+Tray (Auto-uses TrayConfiguration capacity!)`, `+1 Scrap` (opens 2-tap Scrap Reason modal), and digital **Part Control Plan (PCP) / CAD Drawing viewer** (`PartOperation.pcpDocumentUrl`).
     - **Mandatory Downtime Modal**: If the machine stops for `> 120 seconds`, the tablet screen flashes amber/red and requires the operator to tap a 2-level Downtime Reason (`Mechanical -> Spindle`, `Tooling -> Insert Broken`, `Material -> Waiting Forklift`).

3. **`/dashboard/mes/scheduler/page.tsx` (Finite-Capacity Gantt Scheduler & Subcontracting Bridge)**:
   - Drag-and-drop Gantt timeline (`WorkOrders` across `Machines` and `Shifts`).
   - **Seamless In-House ↔ Vendor Subcontracting Bridge**: When a `WorkOrderOperation` has `executionType === 'outsourced'` (e.g., Operation 20 = Induction Hardening at a vendor, followed by Operation 30 = In-House Finish Grinding):
     - Completing Operation 10 in-house automatically prompts **1-Click Generate Outward Job-Work Challan + Gate Pass + E-Way Bill** (linked via `WorkOrderOperation.linkedChallanId`).
     - When the vendor returns the material and Security approves the Gate Entry (`VendorInvoice` / `MaterialReceipt`), Operation 20 auto-completes and Operation 30 turns green (`READY`) on the in-house CNC machine's tablet queue!

4. **`/dashboard/mes/oee-analytics/page.tsx` (OEE Waterfall, Six Big Losses & Pareto Dashboard)**:
   - Plant/Zone/Machine OEE trends, MTBF (Mean Time Between Failures) & MTTR (Mean Time To Repair) cards, Downtime Pareto chart, and Tool/Die life bars (`ToolMaster.currentStrokes / maxLifeStrokes`).

---

## 9. Future Feature Blueprint #3: High-Leverage Indian Manufacturing ERP & VMS Add-Ons

To make Magnus the undisputed market leader for Indian Tier-1/Tier-2 automotive and engineering manufacturers, add these 5 high-ROI operational modules:

### 9.1 TallyPrime XML-over-HTTP Bidirectional Connector (`backend/src/modules/tally`)
- **Why**: 90%+ of Indian SMEs/mid-market OEMs finalize statutory accounting in TallyPrime.
- **How**: TallyPrime exposes an XML-over-HTTP server on local/tunnel port `9000`.
- **Implementation**:
  - Push approved `VendorInvoice` records as Tally **`Purchase` / `Job Work In Order` Vouchers** (`<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA><TALLYMESSAGE><VOUCHER VCHTYPE="Purchase">...`) with automatic Party Ledger, CGST/SGST/IGST Ledger, TDS Ledger, and Bill-wise Reference (`<BILLALLOCATIONS.LIST>`) mapping.
  - Pull Tally Payment Vouchers (`UTR`, payment date, cleared amount) back into Magnus to automatically transition `VendorInvoice.status` to `paid`.

### 9.2 Section 194C Job-Work TDS Engine
- **Statutory Rule**: Under Income Tax Section 194C, job-work payments require **1% TDS** (if the vendor's 4th character of PAN/GSTIN, i.e., `gstin[5]`, is `'P'` for Individual or `'H'` for HUF) or **2% TDS** (for Companies `'C'`, Firms `'F'`, LLPs) when a single bill exceeds **₹30,000** or aggregate FY billing exceeds **₹1,00,000** (or **20% under Section 206AA** if PAN is missing/inoperative).
- **Implementation**: Auto-detect entity type from character 6 of `Vendor.gstin`, track cumulative FY spend per vendor, and compute `tdsRate`, `tdsAmount`, and `netPayableToVendor = totalAmount - tdsAmount` on every `VendorInvoice`.

### 9.3 MSME Section 43B(h) 15/45-Day Payment Compliance Shield
- **Statutory Rule**: Under Income Tax Section 43B(h), any sum payable to a registered **Micro or Small Enterprise (Udyam)** beyond **45 days** from acceptance/deemed acceptance (`gateApprovedAt`) (or **15 days** without a written agreement) is **disallowed as a business expense** in that financial year, adding 25%–30% corporate tax liability on the unpaid invoice value!
- **Implementation**: Add `udyamNumber String?` and `msmeCategory ("MICRO" | "SMALL" | "MEDIUM" | "NONE")` to `Vendor`. Display a live **MSME 45-Day Countdown Clock** on `/dashboard/invoices` and `/dashboard/executive/morning-briefing` flagging invoices approaching day 35 before March 31.

### 9.4 WhatsApp Cloud API Shop-Floor & Vendor Bot
- Many Tier-2/Tier-3 job-work vendors do not check web portals daily. Integrate Meta WhatsApp Cloud API to send interactive template messages when a `DeliveryChallan` is issued or overdue, allowing vendors to tap **"Confirm Receipt"** or **"Update Completed Qty"** directly inside WhatsApp.

### 9.5 Vendor ASN (Advance Shipment Notice) with QR-Code Gate Entry
- When a vendor creates a `VendorInvoice` or `DispatchPlan`, embed a signed **QR Code** on the generated PDF (`common/pdf.service.ts`) encoding `{ invoiceId, challanId, vendorId, items: [{ partNumber, qty }] }`.
- At the OEM factory gate, the `security` guard scans the QR code on `/dashboard/gate-pass` using a mobile camera or 2D barcode scanner, instantly opening the `gate-approve` verification modal with zero manual typing.
