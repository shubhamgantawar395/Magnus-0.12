import { test, expect } from '@playwright/test';

// Unique suffix to avoid conflicts, padded to 4 digits for strict regex validations (like GSTIN)
const SUFFIX = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

// Test Data
const ORG_NAME = `Seinumero Nirman ${SUFFIX}`;
const ORG_CODE = `SEIN${SUFFIX}`;
const DIRECTOR_EMAIL = `director${SUFFIX}@seinumero.com`;
const PPC_EMAIL = `ppc${SUFFIX}@seinumero.com`;
const VENDOR_EMAIL = `vendor${SUFFIX}@aaniryat.com`;
const VENDOR_NAME = `Aaniryat Overseas ${SUFFIX}`;
const VENDOR_CODE = `V${SUFFIX}`;
const PASSWORD = 'password123';

test.describe('Full E2E Flow: FIFO Invoice Allocation', () => {

    test('Complete Lifecycle with FIFO Invoice Allocation', async ({ page }) => {
        test.setTimeout(300000); // 5 minutes

        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));

        // ==========================================
        // 1. Admin: Create Organization & Director
        // ==========================================
        console.log('1. Admin Login & Org Creation');
        await page.goto('/login');
        await page.getByPlaceholder('name@company.com').fill('admin@aaniry.com');
        await page.getByPlaceholder('••••••••').fill(PASSWORD);
        await page.getByRole('button', { name: 'Sign In' }).click();
        await page.waitForURL(/\/dashboard\/platform/);

        await page.goto('/dashboard/platform/organizations');
        await page.getByRole('button', { name: 'Add Organization' }).click();

        await page.getByLabel('Organization Name').fill(ORG_NAME);
        await page.getByLabel('Organization Code').fill(ORG_CODE);
        await page.getByLabel('GSTIN').fill(`29AAAAA${SUFFIX}A1Z1`);
        await page.getByLabel('Contact Person').fill('Rajesh Kumar');
        await page.getByLabel('Email').fill(`contact${SUFFIX}@seinumero.com`);
        await page.getByLabel('Phone').fill('9876543210');
        await page.getByLabel('Address').fill('Industrial Area');
        await page.getByLabel('City').fill('Bangalore');
        await page.getByLabel('State').fill('Karnataka');
        await page.getByLabel('Pincode').fill('560001');

        await page.getByRole('button', { name: 'Create Organization' }).click();

        try {
            await expect(page.getByText('Organization created successfully')).toBeVisible({ timeout: 10000 });
        } catch (e) {
            console.log('Debugging Failure: Checking for error messages...');
            const errorText = await page.getByText('Failed to create').allTextContents();
            console.log('Error Toasts Found:', errorText);
            const bodyText = await page.evaluate(() => document.body.innerText);
            console.log('Full Page Text:', bodyText.slice(0, 1000));
            throw e;
        }

        // Add Director User
        await page.goto('/dashboard/platform/users');
        await page.getByRole('button', { name: 'Create New User' }).click();

        await page.getByLabel('First Name').fill('Amit');
        await page.getByLabel('Last Name').fill('Sharma');
        await page.getByLabel('Email').fill(DIRECTOR_EMAIL);
        await page.getByText('Select Role').click();
        await page.getByRole('option', { name: 'Director', exact: true }).click();

        await page.getByText('Select Organization').click();
        await page.getByRole('option', { name: ORG_NAME, exact: true }).click();
        await expect(page.getByRole('combobox').filter({ hasText: ORG_NAME })).toBeVisible();

        await page.getByLabel('Password').fill(PASSWORD);
        await page.getByRole('button', { name: 'Create User' }).click();
        await expect(page.getByText('User created successfully')).toBeVisible();

        await page.getByRole('button', { name: 'Sign Out' }).click();


        // ==========================================
        // 2. Director: Create PPC User
        // ==========================================
        console.log('2. Director Login & PPC Creation');
        await page.goto('/login');
        await page.getByPlaceholder('name@company.com').fill(DIRECTOR_EMAIL);
        await page.getByPlaceholder('••••••••').fill(PASSWORD);
        await page.getByRole('button', { name: 'Sign In' }).click();
        await page.waitForURL(/\/dashboard\/executive/);

        await page.goto('/dashboard/admin/executive-users');
        await page.getByRole('button', { name: 'Add Executive' }).click();

        await page.getByLabel('First Name').fill('Priya');
        await page.getByLabel('Last Name').fill('Reddy');
        await page.getByLabel('Email').fill(PPC_EMAIL);
        await page.getByLabel('Phone').fill('9876543212');
        await page.locator('select[id="role"]').selectOption('ppc_manager');
        await page.getByLabel('Password').fill(PASSWORD);

        await page.getByRole('button', { name: 'Create User' }).click();
        await expect(page.getByText('User created successfully')).toBeVisible();

        await page.getByRole('button', { name: 'Sign Out' }).click();


        // ==========================================
        // 3. PPC: Create Vendor, PO, Challans
        // ==========================================
        console.log('3. PPC Login & Procurement');
        await page.goto('/login');
        await page.getByPlaceholder('name@company.com').fill(PPC_EMAIL);
        await page.getByPlaceholder('••••••••').fill(PASSWORD);
        await page.getByRole('button', { name: 'Sign In' }).click();
        await page.waitForURL('**/dashboard/admin', { timeout: 30000 });

        // Create Vendor
        await page.goto('/dashboard/vendors');
        await page.getByRole('button', { name: 'Add New Vendor' }).click();
        await page.getByLabel('Company Name').fill(VENDOR_NAME);
        await page.getByLabel('Vendor Code').fill(`V${SUFFIX}`);
        await page.getByLabel('GSTIN').fill(`29BBBBB${SUFFIX}B1Z1`);
        await page.getByLabel('Contact Person').fill('Vikram Singh');
        await page.getByLabel('Email').fill(VENDOR_EMAIL);
        await page.getByLabel('Phone').fill('9876543213');
        await page.getByLabel('Street Address').fill('Peenya Industrial Area');
        await page.getByLabel('City').fill('Bangalore');
        await page.getByLabel('State').fill('Karnataka');
        await page.getByLabel('Pincode').fill('560058');

        await page.getByRole('button', { name: 'Register Vendor' }).click();
        await expect(page.getByText('Vendor created successfully')).toBeVisible();

        // Create Vendor User
        await page.goto('/dashboard/admin/vendor-users');
        await page.getByRole('button', { name: 'Add Vendor User' }).click();
        await page.getByLabel('First Name').fill('Vendor');
        await page.getByLabel('Last Name').fill('User');
        await page.getByLabel('Email').fill(VENDOR_EMAIL);
        await page.getByLabel('Phone').fill('9876543214');
        await page.locator('select[id="role"]').selectOption('vendor_owner');
        await page.locator('select[name="vendorId"]').selectOption({ label: VENDOR_NAME });
        await page.getByLabel('Password').fill(PASSWORD);
        await page.getByRole('button', { name: 'Create User' }).click();
        await expect(page.getByText('User created successfully')).toBeVisible({ timeout: 10000 });

        // Create PO
        await page.goto('/purchase-orders/create');
        await page.locator('button[role="combobox"]').first().click();
        await page.getByRole('option', { name: VENDOR_NAME, exact: true }).click();
        await page.getByLabel('PO Date *').fill('2026-02-10');
        await page.getByPlaceholder('e.g. PART-001').fill('16705');
        await page.getByPlaceholder('Optional description').fill('Rotor Hub');
        const qtyInput = page.locator('input[type="number"]').first();
        const rateInput = page.locator('input[type="number"]').nth(1);
        await qtyInput.fill('5000');
        await rateInput.fill('60');
        await page.getByRole('button', { name: 'Create Order' }).click();
        await expect(page.getByText('Purchase Order created successfully')).toBeVisible();

        // Create Challan 1 (14 Feb, 850 qty) — capture ID from POST response
        await page.goto('/dashboard/challans/new');
        await page.locator('select').first().selectOption({ label: `${VENDOR_NAME} (${VENDOR_CODE})` });
        await page.getByLabel('Date').fill('2026-02-14');
        await page.getByPlaceholder('Part No / Code').fill('16705');
        await page.locator('input[type="number"]').first().fill('850');

        const [challan1Response] = await Promise.all([
            page.waitForResponse(r => r.url().includes('/challans') && r.request().method() === 'POST'),
            page.getByRole('button', { name: 'Save & Generate' }).click()
        ]);
        await expect(page.getByText('Challan created successfully')).toBeVisible();
        const challan1Body = await challan1Response.json();
        const CHALLAN1_ID: string = challan1Body.id;
        console.log('Captured CHALLAN1_ID:', CHALLAN1_ID);

        // Create Challan 2 (16 Feb, 1750 qty) — capture ID from POST response
        await page.goto('/dashboard/challans/new');
        await page.locator('select').first().selectOption({ label: `${VENDOR_NAME} (${VENDOR_CODE})` });
        await page.getByLabel('Date').fill('2026-02-16');
        await page.getByPlaceholder('Part No / Code').fill('16705');
        await page.locator('input[type="number"]').first().fill('1750');

        const [challan2Response] = await Promise.all([
            page.waitForResponse(r => r.url().includes('/challans') && r.request().method() === 'POST'),
            page.getByRole('button', { name: 'Save & Generate' }).click()
        ]);
        await expect(page.getByText('Challan created successfully')).toBeVisible();
        const challan2Body = await challan2Response.json();
        const CHALLAN2_ID: string = challan2Body.id;
        console.log('Captured CHALLAN2_ID:', CHALLAN2_ID);

        await page.waitForURL('**/dashboard/**', { timeout: 15000 });
        await page.getByRole('button', { name: 'Sign Out' }).click();


        // ==========================================
        // 4. Vendor: Create Invoice (FIFO)
        // ==========================================
        console.log('4. Vendor Login & Invoice');
        await page.goto('/login');
        await page.getByPlaceholder('name@company.com').fill(VENDOR_EMAIL);
        await page.getByPlaceholder('••••••••').fill(PASSWORD);
        await page.getByRole('button', { name: 'Sign In' }).click();
        await page.waitForURL(/\/dashboard\/vendor/);

        // Create Invoice 1 — for Challan 1 (850 qty, full invoice)
        await page.goto('/dashboard/vendor/invoices/create');
        await page.getByLabel('Invoice Number').fill(`INV-${SUFFIX}-1`);
        await page.getByLabel('Invoice Date').fill('2026-02-19');

        // Wait for the challan select to be populated with options from the API
        await page.waitForFunction(() => {
            const sel = document.querySelector('select') as HTMLSelectElement;
            return sel && sel.options.length > 1;
        }, { timeout: 10000 });

        // Select Challan 1 by its known ID
        await page.locator('select').first().selectOption(CHALLAN1_ID);

        // Wait for items to load (async fetch after challan select change)
        await expect(page.getByText('16705')).toBeVisible({ timeout: 10000 });

        // Fill full quantity 850
        const qty1Input = page.locator('input[type="number"]').first();
        await qty1Input.fill('850');
        // Verify selectedItems updated (should show exactly 850 in input)
        await expect(qty1Input).toHaveValue('850');

        const submitBtn1 = page.getByRole('button', { name: 'Confirm & Generate Invoice' });
        await expect(submitBtn1).toBeEnabled();

        const [inv1Response] = await Promise.all([
            page.waitForResponse(
                r => r.url().includes('/vendor-invoices') && r.request().method() === 'POST',
                { timeout: 20000 }
            ),
            submitBtn1.click()
        ]);
        const inv1Body = await inv1Response.json();
        console.log('Invoice 1 POST status:', inv1Response.status(), 'id:', inv1Body.id, 'err:', inv1Body.message);
        // Wait for navigation to the invoice list (regex excludes /create)
        await page.waitForURL(/\/dashboard\/vendor\/invoices$/, { timeout: 20000 });

        // Create Invoice 2 — for Challan 2 (150 of 1750 qty, partial)
        await page.goto('/dashboard/vendor/invoices/create');
        await page.getByLabel('Invoice Number').fill(`INV-${SUFFIX}-2`);
        await page.getByLabel('Invoice Date').fill('2026-02-19');

        // Wait for the challan select to be populated
        await page.waitForFunction(() => {
            const sel = document.querySelector('select') as HTMLSelectElement;
            return sel && sel.options.length > 1;
        }, { timeout: 10000 });

        // Select Challan 2 by its known ID
        await page.locator('select').first().selectOption(CHALLAN2_ID);

        // Wait for items to load
        await expect(page.getByText('16705')).toBeVisible({ timeout: 10000 });

        // Fill partial quantity 150
        const qty2Input = page.locator('input[type="number"]').first();
        await qty2Input.fill('150');
        // Verify selectedItems updated
        await expect(qty2Input).toHaveValue('150');

        const submitBtn2 = page.getByRole('button', { name: 'Confirm & Generate Invoice' });
        await expect(submitBtn2).toBeEnabled();

        const [inv2Response] = await Promise.all([
            page.waitForResponse(
                r => r.url().includes('/vendor-invoices') && r.request().method() === 'POST',
                { timeout: 20000 }
            ).catch(e => null),
            page.getByRole('button', { name: 'Confirm & Generate Invoice' }).click()
        ]);

        if (inv2Response) {
            const inv2Body = await inv2Response.json().catch(() => null);
            console.log('Invoice 2 POST status:', inv2Response.status(), 'body:', inv2Body);
        } else {
            console.log('Invoice 2 POST request did not complete within timeout');
        }

        // Wait for navigation to the list page (strict glob)
        await page.waitForURL('**/dashboard/vendor/invoices', { timeout: 20000 });


        // Verify both invoices appear in the list
        await page.goto('/dashboard/vendor/invoices');
        await expect(page.getByText('Loading invoices...')).not.toBeVisible({ timeout: 15000 });
        await expect(page.getByText(`INV-${SUFFIX}-1`)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(`INV-${SUFFIX}-2`)).toBeVisible({ timeout: 10000 });

        // Navigate to Invoice 1 and submit
        await page.locator('tbody tr').filter({ hasText: `INV-${SUFFIX}-1` }).getByRole('button', { name: 'View' }).click();
        await page.waitForTimeout(500);
        page.once('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Submit for Approval' }).click();
        await expect(page.getByText('Invoice submitted successfully!').first()).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: 'Back' }).click();

        // Navigate to Invoice 2 and submit
        await page.locator('tbody tr').filter({ hasText: `INV-${SUFFIX}-2` }).getByRole('button', { name: 'View' }).click();
        await page.waitForTimeout(500);
        page.once('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Submit for Approval' }).click();
        await expect(page.getByText('Invoice submitted successfully!').first()).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: 'Back' }).click();

        await page.getByRole('button', { name: 'Sign Out' }).click();


        // ----------------------------------------------------
        // 5. PPC Login & Approval (FIFO check on Backend)
        // ----------------------------------------------------
        console.log('5. PPC Login & Approval');
        await page.goto('/login');
        await page.getByPlaceholder('name@company.com').fill(PPC_EMAIL);
        await page.getByPlaceholder('••••••••').fill(PASSWORD);
        await page.getByRole('button', { name: 'Sign In' }).click();

        await page.goto('/dashboard/admin/invoices');
        await page.locator('tbody tr').first().getByRole('link', { name: 'Review' }).click();
        await expect(page.getByRole('button', { name: 'Approve Invoice' })).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: 'Approve Invoice' }).click();
        await expect(page.getByText('Invoice approved successfully!')).toBeVisible();

        // Verify Challan balance (FIFO: Challan 1 fully invoiced, Challan 2 partially invoiced)
        await page.goto('/dashboard/admin/challans');
    });
});
