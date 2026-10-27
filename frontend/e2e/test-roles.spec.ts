import { test, expect } from '@playwright/test';

test.describe('Role-based Access Tests', () => {

  test('Test PPC Access to Customers Page', async ({ page }) => {
    console.log('Testing PPC Manager access...');
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'ppc@seinumero.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard/admin', { timeout: 10000 });
    console.log('Successfully logged in as PPC, at URL:', page.url());

    // Click on Customers grid link or sidebar link
    // Assuming there's a link to /dashboard/admin/customers
    const customersLink = page.getByRole('link', { name: /Customers/i }).first();
    await customersLink.click();
    
    // Check if it stays on customers page
    await page.waitForTimeout(2000); // Wait for potential redirect
    console.log('After clicking Customers, URL is:', page.url());
    
    // Check if redirect logic kicked us to login
    if (page.url().includes('/login')) {
      console.error('FAILED: PPC was redirected to login!');
    } else {
      console.log('SUCCESS: PPC stayed on Customers page.');
    }
  });

  test('Test Director/Executive Part Registration', async ({ page }) => {
    console.log('Testing Director part registration...');
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'director@seinumero.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard/admin', { timeout: 10000 });
    console.log('Successfully logged in as Director, at URL:', page.url());

    // Navigate to customers page
    const customersLink = page.getByRole('link', { name: /Customers/i }).first();
    await customersLink.click();
    
    await page.waitForURL('**/dashboard/admin/customers', { timeout: 10000 });
    console.log('Reached customers page. Checking part modal...');

    // Need a customer to expand to see 'Add Part'. Wait. 'Customers' list is displayed.
    // Let's see if we can just trigger a part addition.
    // The previous code had "Add Part" inside the expanded customer row.
    // Let's click the first customer to expand.
    const firstCustomer = page.locator('.flex.items-center.gap-4').first();
    await firstCustomer.click();

    // Now 'Add Part' button should be visible
    const addPartBtn = page.getByRole('button', { name: /Add Part/i });
    if (await addPartBtn.isVisible()) {
      await addPartBtn.click();
      
      // Fill the part modal
      await page.fill('input:has-text("Part Number"), input[value=""] >> nth=0', 'PART-TEST-123'); // Best effort fill
      // In page.tsx: the first empty input after opening modal
      // We know the modal has "Part Number", "Part Description", "Tray Capacity", "Unit"
      
      // Wait for toast if error happens
      page.on('response', response => {
        if (response.url().includes('/trays')) {
          console.log(`API response for trays: ${response.status()} ${response.url()}`);
        }
      });
      // But instead of testing the exact POST response, we can just log all console messages and failed network requests
    } else {
      console.log('Add Part button is not visible');
    }
  });
});
