import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
    console.log('Navigating to login page...');
    await page.goto('/login');

    console.log('Filling credentials...');
    await page.getByLabel('Email Address').fill('vendor@supplier.com');
    await page.getByLabel('Password').fill('password123');

    console.log('Clicking Sign In...');
    await page.getByRole('button', { name: 'Sign In' }).click();

    console.log('Waiting for navigation...');
    // Wait for any navigation instead of specific URL first to debug
    await page.waitForLoadState('networkidle');

    console.log('Current URL:', page.url());

    // Save storage state
    await page.context().storageState({ path: authFile });
});
