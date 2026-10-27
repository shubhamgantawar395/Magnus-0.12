const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // Test 1: PPC Manager
  console.log('--- Testing PPC Manager ---');
  let context = await browser.newContext();
  let page = await context.newPage();
  
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'ppc@seinumero.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/**', { timeout: 10000 });
  console.log('PPC logged in, URL is:', page.url());

  try {
    const customersLink = page.locator('a:has-text("Customers")').first();
    await customersLink.click();
    await page.waitForTimeout(3000); // give it time to redirect if it's gonna
    console.log('After clicking Customers, PPC URL is:', page.url());
  } catch(e) { console.log('Could not find Customers link for PPC') }
  await context.close();

  // Test 2: Director/Executive part creation
  console.log('\\n--- Testing Director ---');
  context = await browser.newContext();
  page = await context.newPage();

  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'director@seinumero.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/**', { timeout: 10000 });
  console.log('Director logged in, URL is:', page.url());

  try {
    const customersLink2 = page.locator('a:has-text("Customers")').first();
    await customersLink2.click();
    await page.waitForURL('**/dashboard/admin/customers', { timeout: 10000 });
    console.log('Director reached customers page.');

    const firstCustomer = page.locator('.bg-slate-900', { hasText: 'Customer' }).first();
    if(await firstCustomer.isVisible()) {
      await firstCustomer.click();
      console.log('Clicked first customer.');
    }

    const addPartBtn = page.locator('button:has-text("Add Part")').first();
    if (await addPartBtn.isVisible()) {
        await addPartBtn.click();
        console.log('Clicked Add Part modal.');
        
        await page.waitForTimeout(1000);
        await page.fill('input:below(:text("Part Number"))', 'PART-1');
        await page.fill('input:below(:text("Part Description"))', 'DESC-1');

        let requestUrl = '';
        page.on('request', request => {
          if (request.url().includes('trays')) {
            console.log(`Sending API request: ${request.method()} ${request.url()}`);
            requestUrl = request.url();
          }
        });
        
        page.on('response', response => {
          if (response.url().includes('trays')) {
            console.log(`Received API response: ${response.status()} ${response.url()}`);
          }
        });

        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
    } else {
        console.log('Add Part button not visible');
    }
  } catch(e) { console.log('Error during director flow:', e.message) }
  
  await browser.close();
})();
