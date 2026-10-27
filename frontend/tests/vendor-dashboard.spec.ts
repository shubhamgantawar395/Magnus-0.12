import { test, expect } from '@playwright/test';

test('vendor dashboard loads correctly', async ({ page }) => {
    console.log('Navigating to vendor dashboard...');
    await page.goto('/dashboard/vendor');

    console.log('Waiting for load state...');
    await page.waitForLoadState('networkidle');

    console.log('Current URL:', page.url());

    // Take screenshot for debugging
    // await page.screenshot({ path: 'test-results/vendor-dashboard.png' });

    // Verify we are on the vendor dashboard
    // This might fail if auth state is not picked up correctly
    await expect(page).toHaveURL(/.*\/dashboard\/vendor/);

    // Check for common dashboard elements (adjust based on actual UI)
    // await expect(page.locator('h1')).not.toBeEmpty();
});
