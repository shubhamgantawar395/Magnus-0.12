/**
 * Executive Dashboard Visual Review
 * Run: npx playwright test tests/executive-visual.spec.ts --project chromium --headed
 * (targets port 3001 since that's where the dev server is running)
 */

import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'playwright', 'screenshots', 'executive');

// Confirmed working credentials from DB
const CREDENTIALS = [
    { email: 'admin@aaniry.com',           password: 'password123' },  // admin role
    { email: 'director2244@seinumero.com', password: 'password123' },  // director role
    { email: 'director1213@seinumero.com', password: 'password123' },  // director role (backup)
];

test.describe('Executive Dashboard Visual Review', () => {
    test.use({ baseURL: BASE_URL, actionTimeout: 30000, navigationTimeout: 60000 });
    test.setTimeout(120000);

    async function login(page: any) {
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'load', timeout: 60000 });

        for (const cred of CREDENTIALS) {
            try {
                await page.waitForSelector('label:has-text("Email Address")', { timeout: 30000 });
                await page.getByLabel('Email Address').fill(cred.email);
                await page.getByLabel('Password').fill(cred.password);
                await page.getByRole('button', { name: 'Sign In' }).click();
                
                // Wait for URL to change to dashboard, meaning login succeeded
                await page.waitForURL('**/dashboard/**', { timeout: 45000 }).catch(() => {});

                const url = page.url();
                if (url.includes('/dashboard')) {
                    console.log(`✅ Logged in as ${cred.email}`);
                    return true;
                }
                // Try next credential
                await page.goto(`${BASE_URL}/login`);
                await page.waitForLoadState('networkidle');
            } catch (e) {
                console.log(`❌ Failed with ${cred.email}: ${e}`);
            }
        }
        return false;
    }

    test('War Room — screenshot and verify KPIs', async ({ page }) => {
        fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

        const loggedIn = await login(page);
        expect(loggedIn, 'Should be able to log in').toBeTruthy();

        // Navigate to executive dashboard
        await page.goto(`${BASE_URL}/dashboard/executive`);
        await page.waitForLoadState('networkidle');
        // Wait for loading spinner to disappear
        await page.waitForSelector('text=War Room', { timeout: 10000 }).catch(() => {});

        // Screenshot the full page
        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, '01-war-room-full.png'),
            fullPage: true
        });

        // Log what's visible
        const pageText = await page.textContent('body');
        console.log('Page contains "War Room":', pageText?.includes('War Room'));
        console.log('Page contains "Customer Health":', pageText?.includes('Customer Health'));
        console.log('Page contains "Urgent Attention":', pageText?.includes('Urgent Attention'));
        console.log('Page contains "Part Tracker":', pageText?.includes('Part Tracker'));

        // Check for errors
        const errorElements = await page.locator('text=Error').count();
        console.log('Error elements on War Room:', errorElements);

        // Screenshot KPI strip area
        const kpiSection = page.locator('.grid').first();
        if (await kpiSection.isVisible()) {
            await kpiSection.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-war-room-kpis.png') });
        }

        console.log('Current URL:', page.url());
    });

    test('Part Tracker — screenshot and verify search/filters', async ({ page }) => {
        fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

        const loggedIn = await login(page);
        expect(loggedIn, 'Should be able to log in').toBeTruthy();

        await page.goto(`${BASE_URL}/dashboard/executive/parts`);
        await page.waitForLoadState('networkidle');
        // Wait up to 8s for Part Tracker heading
        await page.waitForSelector('text=Part Tracker', { timeout: 8000 }).catch(() => {});

        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, '03-part-tracker-full.png'),
            fullPage: true
        });

        const pageText = await page.textContent('body');
        console.log('Page contains "Part Tracker":', pageText?.includes('Part Tracker'));
        console.log('Page contains "Search by part":', pageText?.includes('Search by part'));
        console.log('Page contains "Raw Material":', pageText?.includes('Raw Material'));

        console.log('Current URL:', page.url());
    });

    test('Part Tracker — expand a part card to see pipeline', async ({ page }) => {
        fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

        const loggedIn = await login(page);
        expect(loggedIn).toBeTruthy();

        await page.goto(`${BASE_URL}/dashboard/executive/parts`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000); // Let data load

        // Click first expandable card if it exists
        const firstCard = page.locator('[class*="cursor-pointer"]').first();
        if (await firstCard.isVisible()) {
            await firstCard.click();
            await page.waitForTimeout(500);
            await page.screenshot({
                path: path.join(SCREENSHOTS_DIR, '04-part-card-expanded.png'),
                fullPage: true
            });
            console.log('Expanded first part card');

            const pageText = await page.textContent('body');
            console.log('Shows "Process Pipeline":', pageText?.includes('Process Pipeline'));
            console.log('Shows "Delivery Deadline":', pageText?.includes('Delivery Deadline'));
            console.log('Shows "Set Deadline":', pageText?.includes('Set Deadline'));
        } else {
            console.log('No expandable cards found — no parts in DB yet');
            await page.screenshot({
                path: path.join(SCREENSHOTS_DIR, '04-part-tracker-empty.png'),
                fullPage: true
            });
        }
    });

    test('War Room — click customer card for drill-down', async ({ page }) => {
        fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

        const loggedIn = await login(page);
        expect(loggedIn).toBeTruthy();

        await page.goto(`${BASE_URL}/dashboard/executive`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Try clicking a customer card if any exist
        const customerCards = page.locator('button').filter({ hasText: /parts total/ });
        const count = await customerCards.count();
        console.log('Customer health cards found:', count);

        if (count > 0) {
            await customerCards.first().click();
            await page.waitForTimeout(1000);
            await page.screenshot({
                path: path.join(SCREENSHOTS_DIR, '05-customer-drilldown.png'),
                fullPage: true
            });
            console.log('Customer drill-down panel opened');
        } else {
            await page.screenshot({
                path: path.join(SCREENSHOTS_DIR, '05-war-room-no-customers.png'),
                fullPage: true
            });
            console.log('No customer cards yet (no challan data)');
        }
    });
});
