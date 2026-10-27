# Aaniry VMS — Manual E2E Test Plan

> Frontend: http://localhost:3000 · Backend: http://localhost:3001
> Run `migrate reset --force` and `npm run start:dev` before starting.
> Use `[ ]` checkboxes to track as you go.

---

## Prerequisites — Seed Accounts

Before you begin, create these accounts manually via the super-admin console or directly in the DB:

| Role | Email | Password | Notes |
|---|---|---|---|
| platform_admin | superadmin@aaniry.com | Test@1234 | Pre-seeded |
| admin | admin@orgA.com | Test@1234 | Create in Module 2 |
| ppc_manager | ppc@orgA.com | Test@1234 | Create in Module 2 |
| production_manager | prod@orgA.com | Test@1234 | Create in Module 2 |
| vendor_owner | owner@vendorA.com | Test@1234 | Created inline with vendor |

---

## Module 1 — Auth & RBAC

### 1.1 Platform Admin Login
- [ ] Go to `/login`, log in as `superadmin@aaniry.com`
- [ ] Redirected to `/super-admin` (NOT `/dashboard`)
- [ ] Sidebar shows: Dashboard, Organizations, Vendors, Audit Logs
- [ ] KPI cards render (even if 0 values)
- [ ] Navigate to `/dashboard` manually → should redirect back or show 403

### 1.2 Org Admin Login
- [ ] Log in as `admin@orgA.com`
- [ ] Redirected to `/dashboard`
- [ ] Sidebar shows full menu: Vendors, Staff, Parts/Customers, Stock Statements
- [ ] Does NOT see Super Admin menu items

### 1.3 PPC Manager Login
- [ ] Log in as `ppc@orgA.com`
- [ ] Can navigate to `/dashboard/stock-statements`
- [ ] Can navigate to `/dashboard/customers` and VIEW parts + job cycle
- [ ] Sees amber banner on job cycle panel: "PPC cannot edit job cycles"
- [ ] Add/Delete operation buttons are NOT visible for PPC

### 1.4 Vendor Owner Login
- [ ] Log in as `owner@vendorA.com`
- [ ] Redirected to `/dashboard/vendor` (vendor portal)
- [ ] Cannot access `/dashboard/customers` or `/super-admin`

### 1.5 RBAC Smoke Test (API)
Open browser DevTools → Network tab, then as `ppc@orgA.com`:
- [ ] `GET /reports/global-stock` → 200 ✓ (PPC should have access)
- [ ] `POST /parts/[any-id]/operations` → 403 ✗ (PPC cannot edit job cycle)
- [ ] `GET /users` → 200 ✓ (scoped to org)

**Expected failures = correct RBAC. Any 200 on the 403 row = bug.**

---

## Module 2 — Vendor & User Creation

### 2.1 Super-Admin Creates Organisation
- [ ] Login as platform_admin → go to `/super-admin/organizations`
- [ ] Click **"Add Organization"**
- [ ] Fill: Name `Org Alpha`, Code `ORGA`, GSTIN (optional)
- [ ] Submit → org appears in the list

### 2.2 Super-Admin Creates Users in Organisation
- [ ] Click on Org Alpha → **"View Users"** panel slides out
- [ ] Click **"Add User"** inside the panel
- [ ] Create `admin@orgA.com` → Role: `admin`, Department: `executive`
- [ ] Create `ppc@orgA.com` → Role: `ppc_manager`, Department: `planning`
- [ ] Create `prod@orgA.com` → Role: `production_manager`, Department: `production`
- [ ] All three appear in the users panel with correct roles
- [ ] Verify no 400/422 errors in Network tab during creation

**Known previous bug check:** `ppc_manager` must have an `organizationId` — verify it in the users list (should not be orphaned).

### 2.3 Admin Creates Users from Org Dashboard
- [ ] Login as `admin@orgA.com`
- [ ] Go to `/dashboard/admin/executive-users` (Staff Management)
- [ ] Click **"Add User"**
- [ ] Create `store@orgA.com` → Role: `store_keeper`, Department: `planning`
- [ ] Create `qual@orgA.com` → Role: `quality_head`, Department: `quality`
- [ ] Both appear in the table with correct role badges

### 2.4 Vendor Creation — Without Owner Credentials
- [ ] Login as `ppc@orgA.com` → go to `/dashboard/vendors/new`
- [ ] Fill vendor details: Company Name `Vendor Alpha`, Code `VEND-A`, contact email
- [ ] Leave "Owner Portal Access" toggle **OFF**
- [ ] Submit → vendor created, appears in vendor list
- [ ] Vendor has no `vendor_owner` user (check via super-admin user panel)

### 2.5 Vendor Creation — With Owner Credentials
- [ ] Create another vendor: `Vendor Beta`, Code `VEND-B`
- [ ] Toggle **"Owner Portal Access" ON**
- [ ] Fill: First Name `Ravi`, Last Name `Kumar`, Email `owner@vendorb.com`, Password `Ravi@1234`
- [ ] Submit → vendor created
- [ ] Login as `owner@vendorb.com` → should land on vendor portal ✓
- [ ] Note the credential somewhere safe (the warning card mentions this)

### 2.6 Vendor Creation — Duplicate Email Guard
- [ ] Try creating a third vendor with `ownerEmail = owner@vendorb.com` (already used)
- [ ] Should get a clear error: "Email already in use" — NOT a 500

---

## Module 3 — Parts & Job Cycle

### 3.1 Create End Customer (Tier-1 OEM)
- [ ] Login as `admin@orgA.com` → go to `/dashboard/customers`
- [ ] Click **"Add Customer"**
- [ ] Fill: Name `Bajaj Auto`, Code `BAJAJ`, City `Pune`
- [ ] Customer appears in the left panel

### 3.2 Create Parts
- [ ] With Bajaj Auto selected, click **"Add Part"**
- [ ] Fill: Part Number `BJ-001`, Part Name `Engine Bracket`, Material Grade `EN8`, UOM `NOS`
- [ ] Part appears in the right table with Job Cycle badge showing `0 ops`
- [ ] Add a second part: `BJ-002` — `Gearbox Cover`

### 3.3 Add Job Cycle Operations (as Admin)
- [ ] Click the ⚙ icon on `BJ-001` to open Job Cycle panel
- [ ] Click **"Add Operation"**
- [ ] Op 1: Seq `10`, Name `CNC Turning`, Type `outsourced`, Vendor Capability `CNC`
- [ ] Op 2: Seq `20`, Name `Surface Grinding`, Type `inhouse`, Machine `Surface Grinder`
- [ ] Op 3: Seq `30`, Name `Phosphating`, Type `outsourced`
- [ ] All 3 appear in order. Badge on part row updates to `3 ops`
- [ ] Delete Op 3 → disappears. Badge drops to `2 ops`

### 3.4 PPC Read-Only Enforcement
- [ ] Login as `ppc@orgA.com` → go to `/dashboard/customers`
- [ ] Click ⚙ on BJ-001
- [ ] Amber banner visible: "PPC cannot modify job cycles"
- [ ] **No "Add Operation" button visible**
- [ ] **No delete icon on existing operations**
- [ ] Operations are readable ✓

### 3.5 Reorder Operations (as Production Manager)
- [ ] Login as `prod@orgA.com` → open BJ-001 job cycle
- [ ] Drag Op 20 above Op 10 (or use reorder if UI supports it)
- [ ] Sequence numbers update correctly after save

---

## Module 4 — Stock Statements

> You need some challan data for these tests. If challans don't exist yet, create at least 2 delivery challans (via `/dashboard/challans/new`) issued to Vendor Alpha for parts BJ-001 and BJ-002 before testing this module.

### 4.1 Stock Statements Landing Page
- [ ] Login as any internal user → go to `/dashboard/stock-statements`
- [ ] Two cards: **Global Stock Statement** and **Vendor Wise Stock Statement**
- [ ] Both links are clickable

### 4.2 Global Stock Statement — Basic Load
- [ ] Click **Global Stock Statement**
- [ ] Page loads without error (check Network tab for `/reports/global-stock`)
- [ ] If challans exist: rows appear for BJ-001 and BJ-002
- [ ] KPI cards at top show correct totals (procured = sum of challan qty)
- [ ] **Customer Demand column** shows `0` if no CustomerOrder exists yet (correct — not a bug)

### 4.3 Global Stock Statement — OEM Filter
- [ ] Dropdown "All OEM Customers" → select `Bajaj Auto`
- [ ] Only BJ-001 and BJ-002 remain (parts linked to Bajaj)
- [ ] Clear filter → all parts return

### 4.4 Global Stock Statement — Vendor Breakdown (Expand Row)
- [ ] Click any row → row expands
- [ ] Vendor breakdown cards appear: Vendor Alpha with balance qty
- [ ] `vendorCode: balance pcs` format is correct
- [ ] If a JobProcess exists, current stage shows (e.g. "CNC Turning")

### 4.5 Global Stock Statement — Search
- [ ] Type `BJ-001` in search → only that row shows
- [ ] Type `Bajaj` → both BJ-001 and BJ-002 show (matched via endCustomer)
- [ ] Type something random → no results + empty state

### 4.6 Global Stock Statement — CSV Export
- [ ] Click **Export CSV**
- [ ] File downloads as `global-stock-YYYY-MM-DD.csv`
- [ ] Open in Excel/Sheets: columns match (Part Number, OEM Customer, Customer Demand, etc.)
- [ ] Vendor breakdown column shows `VEND-A: 100 pcs [CNC Turning]` style values

### 4.7 Vendor Wise Stock Statement — Basic Load
- [ ] Go back → click **Vendor Wise Stock Statement**
- [ ] `GET /reports/vendor-wise-stock` returns 200
- [ ] Vendor Alpha group header appears with challan count badge
- [ ] Summary KPI cards at top: Challan Qty, Dispatched Back, Balance, etc.

### 4.8 Vendor Wise — Row Details
- [ ] Under Vendor Alpha, rows show:
  - [ ] Challan No (e.g. `CH/ORGA/2026/001`)
  - [ ] Challan Date in `dd Mon YY` format
  - [ ] Part Number + description
  - [ ] Challan Qty matches what was issued
  - [ ] Dispatch Qty = 0 (if no vendor invoice raised yet)
  - [ ] Balance Qty = Challan Qty (amber highlight)
  - [ ] WIP = Challan Qty (sky blue) if job processes active, else 0
  - [ ] Casting/Forging Defects = 0 (unless quality rejection logged)

### 4.9 Vendor Wise — Collapse / Expand Vendor Groups
- [ ] Click Vendor Alpha header → group collapses ✓
- [ ] Click again → expands ✓

### 4.10 Vendor Wise — Filter by Vendor
- [ ] Select `Vendor Alpha` in the vendor dropdown
- [ ] Only Vendor Alpha group shows
- [ ] Clear → all vendors return

### 4.11 Vendor Wise — CSV Export
- [ ] Click **Export CSV**
- [ ] File downloads correctly
- [ ] Totals rows included for each vendor group

### 4.12 Stock — Post Invoice: Balance Updates
*(Requires a VendorInvoice to be raised and approved for a challan item)*
- [ ] Raise a vendor invoice for Vendor Alpha, part BJ-001, qty 50 of 100
- [ ] Approve the invoice
- [ ] Reload Global Stock → `totalDispatchedBack` increases by 50
- [ ] Reload Vendor Wise → `dispatchQty` = 50, `balanceQty` = 50 for that challan row

---

## Cross-Cutting Checks

### Session & Token
- [ ] Login → close browser → reopen → still logged in (JWT persists in localStorage/cookie)
- [ ] Log out → navigating to `/dashboard` redirects to login

### Error Handling
- [ ] Submit vendor creation form with empty required fields → inline validation messages appear
- [ ] Submit login with wrong password → "Invalid credentials" toast, NOT a 500 stack trace

### Responsive / Mobile
- [ ] Open Stock Statement pages at 375px width → table scrolls horizontally, header stays readable
- [ ] Sidebar collapses on mobile (if implemented)

---

## Known Gaps / Out of Scope for this Cycle

| Feature | Status |
|---|---|
| Vendor Readiness (Feature 1) | Not yet built |
| Executive War Room (Feature 3) | Not yet built |
| WhatsApp / MSG91 notifications | Not yet built |
| Vendor portal "My Jobs" page | Not yet built |
| Automated Jest tests | Not yet written |

---

## Bug Report Template

When you find an issue, log it like this:

```
Module: Stock Statements / Global
Step: 4.3 OEM Filter
Expected: Only parts linked to Bajaj Auto show
Actual: All parts still showing after filter applied
Network: GET /reports/global-stock?endCustomerId=xxx → 200 but rows not filtered
```
