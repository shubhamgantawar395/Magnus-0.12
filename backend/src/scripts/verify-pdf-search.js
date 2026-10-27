
const API_URL = 'http://localhost:3001';

// Mock credentials
const CREDENTIALS = {
    email: 'admin@aaniry.com',
    password: 'admin123'
};

async function verify() {
    console.log('Starting Backend Verification (JS/Fetch)...');

    try {
        // 1. Login
        console.log('1. Logging in...');
        let token = '';
        try {
            const loginRes = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(CREDENTIALS)
            });

            if (!loginRes.ok) {
                throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
            }

            const loginData = await loginRes.json();
            token = loginData.access_token;
            console.log('   Login successful.');
        } catch (error) {
            console.error('   Login failed. Please ensure the server is running and admin@aaniry.com exists.');
            console.error('   Error:', error.message);
            return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // 2. Test Vendor Search (General)
        console.log('\n2. Testing Vendor Search (by name)...');
        const searchRes = await fetch(`${API_URL}/vendors?search=Precision`, { headers });
        console.log(`   Vendor Search Status: ${searchRes.status}`);
        const searchData = await searchRes.json();

        if (!searchRes.ok) {
            console.log('   Error Response:', JSON.stringify(searchData));
        }

        console.log(`   Found ${searchData.data ? searchData.data.length : 0} vendors matching "Precision".`);
        if (searchData.data && searchData.data.length > 0) {
            console.log('   Vendor[0]:', searchData.data[0].companyName);
        }

        // 3. Test Challan PDF
        console.log('\n3. Testing Challan PDF Generation...');
        // First get a challan ID
        const challansRes = await fetch(`${API_URL}/challans?limit=1`, { headers });
        console.log(`   Challan List Status: ${challansRes.status}`);
        const challansData = await challansRes.json();

        if (!challansRes.ok) {
            console.log('   Error Response:', JSON.stringify(challansData));
        }

        if (challansData.data && challansData.data.length > 0) {
            const challan = challansData.data[0];
            const challanId = challan.id;
            console.log(`   Found Challan ID: ${challanId}`);

            try {
                const pdfRes = await fetch(`${API_URL}/challans/${challanId}/pdf`, { headers });
                console.log(`   PDF Status: ${pdfRes.status}`);

                if (pdfRes.headers.get('content-type') === 'application/pdf') {
                    const blob = await pdfRes.arrayBuffer();
                    console.log(`   SUCCESS: Received PDF (${blob.byteLength} bytes).`);
                } else {
                    console.error(`   FAILURE: Content-Type is ${pdfRes.headers.get('content-type')}`);
                    console.log('   Body:', await pdfRes.text());
                }
            } catch (err) {
                console.error(`   FAILURE: Could not download PDF. ${err.message}`);
            }

            // Test Part Search using this challan's items
            if (challan.items && challan.items.length > 0) {
                const partNo = challan.items[0].partNumber;
                console.log(`\n4. Testing Vendor Search by Part Number: ${partNo}`);
                const partSearchRes = await fetch(`${API_URL}/vendors?search=${partNo}`, { headers });
                const partSearchData = await partSearchRes.json();
                console.log(`   Part Search Found: ${partSearchData.data ? partSearchData.data.length : 0}`);

                if (partSearchData.data && partSearchData.data.length > 0) {
                    console.log(`   SUCCESS: Found vendor via Part Number.`);
                } else {
                    console.warn(`   WARNING: No vendor found for part number.`);
                }
            }

        } else {
            console.log('   Skipping PDF test: No challans found (or access denied).');
        }

        // 5. Test Invoice PDF (Try to find one)
        console.log('\n5. Testing Invoice PDF Generation...');
        try {
            // Admin listing vendor invoices
            const invoicesRes = await fetch(`${API_URL}/vendor-invoices?limit=1`, { headers });
            console.log(`   Invoice List Status: ${invoicesRes.status}`);

            if (invoicesRes.ok) {
                const invoicesData = await invoicesRes.json();
                // Check format (might be array or { data: [] } or paginated)
                // VendorInvoiceController usually returns array or paginated object?
                // Checking controller: returns `this.vendorInvoiceService.getInvoices(...)` which returns `prisma.findMany`. So it is an ARRAY.

                const invoices = Array.isArray(invoicesData) ? invoicesData : (invoicesData.data || []);

                if (invoices.length > 0) {
                    const invoice = invoices[0];
                    const invoiceId = invoice.id;
                    console.log(`   Found Invoice ID: ${invoiceId}`);
                    const pdfRes = await fetch(`${API_URL}/vendor-invoices/${invoiceId}/pdf`, { headers });
                    console.log(`   Invoice PDF Status: ${pdfRes.status}`);

                    if (pdfRes.headers.get('content-type') === 'application/pdf') {
                        const blob = await pdfRes.arrayBuffer();
                        console.log(`   SUCCESS: Received Invoice PDF (${blob.byteLength} bytes).`);
                    } else {
                        console.error(`   FAILURE: Invoice PDF Content-Type is ${pdfRes.headers.get('content-type')}`);
                        console.log('   Body:', await pdfRes.text());
                    }
                } else {
                    console.log('   No invoices found.');
                }
            } else {
                console.log(`   Skipping Invoice PDF test: Status ${invoicesRes.status}`);
                console.log('   Response:', await invoicesRes.text());
            }
        } catch (e) {
            console.log('   Skipping Invoice PDF test: Error fetching invoices.', e.message);
        }

    } catch (error) {
        console.error('Verification failed:', error.message);
    }
}

verify();
