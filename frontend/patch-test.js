const fs = require('fs');
const testFile = 'tests/full-flow.spec.ts';

let code = fs.readFileSync(testFile, 'utf8');

const targetStr = `        // Verify both invoices appear in the list
        await page.goto('/dashboard/vendor/invoices');
        await expect(page.getByText('Loading invoices...')).not.toBeVisible({ timeout: 15000 });
        await expect(page.getByText(\`INV-\${SUFFIX}-1\`)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(\`INV-\${SUFFIX}-2\`)).toBeVisible({ timeout: 10000 });

        await page.getByRole('button', { name: 'Sign Out' }).click();`;

const newStr = `        // Verify both invoices appear in the list
        await page.goto('/dashboard/vendor/invoices');
        await expect(page.getByText('Loading invoices...')).not.toBeVisible({ timeout: 15000 });
        await expect(page.getByText(\`INV-\${SUFFIX}-1\`)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(\`INV-\${SUFFIX}-2\`)).toBeVisible({ timeout: 10000 });

        // Navigate to Invoice 1 and submit
        await page.locator('tbody tr').filter({ hasText: \`INV-\${SUFFIX}-1\` }).getByRole('button', { name: 'View' }).click();
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: 'Submit for Approval' }).click();
        page.on('dialog', dialog => dialog.accept());
        await expect(page.getByText('Invoice submitted successfully!')).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: 'Back' }).click();

        // Navigate to Invoice 2 and submit
        await page.locator('tbody tr').filter({ hasText: \`INV-\${SUFFIX}-2\` }).getByRole('button', { name: 'View' }).click();
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: 'Submit for Approval' }).click();
        page.on('dialog', dialog => dialog.accept());
        await expect(page.getByText('Invoice submitted successfully!')).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: 'Back' }).click();

        await page.getByRole('button', { name: 'Sign Out' }).click();`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, newStr);
    fs.writeFileSync(testFile, code);
    console.log('Successfully patched tests/full-flow.spec.ts');
} else {
    console.log('Could not find target string in tests/full-flow.spec.ts');
}
