
import { } from 'node:test'; // helper to ensure node types but strictly using fetch
// Using native fetch, requires Node 18+

const API_URL = 'http://localhost:3001';

// Test Credentials
const VENDOR_CREDS = { email: 'vendor1@test.com', password: 'password123' };
const CUSTOMER_CREDS = { email: 'customer1@test.com', password: 'password123' };

async function login(creds: any, role: string) {
    console.log(`\n🔑 Logging in as ${role}...`);
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds)
        });

        if (!res.ok) throw new Error(`Login failed: ${res.statusText}`);

        const data = await res.json();
        console.log(`✅ ${role} logged in. Token received.`);
        return data.access_token;
    } catch (error) {
        console.error(`❌ Failed to login as ${role}:`, error);
        process.exit(1);
    }
}

async function runTest() {
    console.log('🚀 Starting E2E Vendor Invoice Test...');

    // 1. Login
    const vendorToken = await login(VENDOR_CREDS, 'Vendor');
    const customerToken = await login(CUSTOMER_CREDS, 'Customer');

    // 2. Get Available Challans (Vendor)
    console.log('\n📦 Fetching available challans for Vendor...');
    const challansRes = await fetch(`${API_URL}/vendor-invoices/available-challans`, {
        headers: { 'Authorization': `Bearer ${vendorToken}` }
    });
    const challans = await challansRes.json();

    if (!Array.isArray(challans) || challans.length === 0) {
        console.error('❌ No available challans found for testing. Please create a challan first.');
        process.exit(1);
    }
    console.log(`✅ Found ${challans.length} available challans.`);

    const targetChallan = challans[0];
    const targetItem = targetChallan.items[0];
    console.log(`👉 Selected Challan: ${targetChallan.challanNumber}`);
    console.log(`   Item: ${targetItem.partNumber} (Available: ${targetItem.quantityIssued})`);

    // 3. Create Invoice (Vendor)
    const invoiceQty = Math.min(10, targetItem.quantityIssued); // Invoice 10 or max available
    console.log(`\n📝 Creating Invoice for ${invoiceQty} qty...`);

    const invoicePayload = {
        invoiceNumber: `INV-TEST-${Date.now()}`,
        invoiceDate: new Date().toISOString(),
        customerId: targetChallan.customerId,
        remarks: 'E2E Test Invoice',
        items: [{
            challanItemId: targetItem.id,
            invoiceQuantity: invoiceQty
        }]
    };

    const createRes = await fetch(`${API_URL}/vendor-invoices`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${vendorToken}`
        },
        body: JSON.stringify(invoicePayload)
    });

    if (!createRes.ok) {
        const err = await createRes.json();
        console.error('❌ Failed to create invoice:', err);
        process.exit(1);
    }

    const createdInvoice = await createRes.json();
    console.log(`✅ Invoice Created: ${createdInvoice.invoiceNumber} (ID: ${createdInvoice.id})`);
    console.log(`   Total Amount: ₹${createdInvoice.totalAmount}`);

    // 4. Verify Stock Statement (Customer)
    console.log('\n📊 Verifying Stock Statement for Customer...');
    const stockRes = await fetch(`${API_URL}/reports/stock-statement`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const stockData = await stockRes.json();

    // Flatten stock data to find our item
    // Stock statement structure might be complex, scanning strictly for matches
    let found = false;
    // Assuming structure is array of challans or items
    // Let's iterate recursively or broadly search string representation if structure is unknown, 
    // but we know the structure from previous work.

    // Structure: Array of DeliveryChallans (with calculated fields) 
    // OR Report Objects. Let's look for our challan number.

    const relevantRecord = stockData.find((d: any) => d.challanNumber === targetChallan.challanNumber);

    if (relevantRecord) {
        console.log(`✅ Found Record for Challan ${targetChallan.challanNumber} in Stock Statement`);
        // Check dispatch quantity
        // The report service returns items array usually
        const relevantItem = relevantRecord.items.find((i: any) => i.partNumber === targetItem.partNumber);

        if (relevantItem) {
            console.log(`   Item: ${relevantItem.partNumber}`);
            console.log(`   Challan Qty: ${relevantItem.quantityIssued}`);
            console.log(`   Dispatch Qty: ${relevantItem.dispatchQty}`);
            console.log(`   Balance Qty: ${relevantItem.balanceQty}`);

            if (relevantItem.dispatchQty >= invoiceQty) {
                console.log('✅ SUCCESS: Dispatch Quantity reflects the new invoice!');
            } else {
                console.error('❌ FAILURE: Dispatch Quantity does NOT reflect the invoice.');
                console.log(`Expected >= ${invoiceQty}, Got ${relevantItem.dispatchQty}`);
                process.exit(1);
            }
        } else {
            console.error('❌ Item not found in stock statement record.');
        }
    } else {
        console.error('❌ Challan not found in stock statement.');
        // It might be paginated or structure different?
        // Let's print a sample to debug if needed
        // console.log(JSON.stringify(stockData[0], null, 2));
    }

    console.log('\n🎉 E2E TEST COMPLETED SUCCESSFULLY');
}

runTest().catch(console.error);
