
const API_URL = 'http://localhost:3001';

const CREDENTIALS = {
    email: 'admin@aaniry.com',
    password: 'admin123'
};

async function seed() {
    console.log('Seeding verification data...');

    // 1. Login
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(CREDENTIALS)
    });
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // 2. Get Customer (CUST001)
    console.log('Fetching customer...');
    const customersRes = await fetch(`${API_URL}/customers?limit=1`, { headers });
    const customersData = await customersRes.json();
    let customerId = customersData.data?.[0]?.id;

    if (!customerId) {
        console.log('Creating customer...');
        const createCustRes = await fetch(`${API_URL}/customers`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                companyName: 'Aaniry Overseas Pvt. Ltd.',
                code: 'CUST001',
                gstin: '27AAAAA0000A1Z5',
                email: 'rajesh@aaniry.com'
            })
        });

        if (!createCustRes.ok) {
            console.error('Failed to create customer', await createCustRes.text());
            return;
        }
        const newCust = await createCustRes.json();
        customerId = newCust.id;
    }
    console.log('Customer ID:', customerId);

    // 3. Get Vendor (VEN001)
    console.log('Fetching vendor...');
    const vendorsRes = await fetch(`${API_URL}/vendors?search=VEN001`, { headers });
    const vendorsData = await vendorsRes.json();
    let vendorId = vendorsData.data?.[0]?.id;
    let vendorName = vendorsData.data?.[0]?.companyName;

    if (!vendorId) {
        console.log('Creating vendor...');
        const createVenRes = await fetch(`${API_URL}/vendors`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                companyName: 'Precision CNC Works',
                vendorCode: 'VEN001',
                gstin: '27BBBBB1111B1Z6',
                email: 'suresh@precisioncnc.com',
                customerId: customerId,
                status: 'approved' // Ensure status is approved
            })
        });
        if (!createVenRes.ok) {
            console.error('Failed to create vendor', await createVenRes.text());
            return;
        }
        const newVen = await createVenRes.json();
        vendorId = newVen.id;
        vendorName = newVen.companyName;
    }
    console.log(`Vendor: ${vendorName} (${vendorId})`);

    // 4. Create Part (if not exists)
    // We create a challan with a new item directly as the backend usually supports this or we ignore part creation if handled implicitly.
    // However, backend ChallansService.create expects items with valid data.
    // If backend requires existing part ID, this will fail.
    // Challan DTO usually takes `items` array with `partNumber`, etc. 
    // Assuming backend creates part if not exists or just stores text.

    // Check if we already have challans to avoid duplicates
    const checkChallanRes = await fetch(`${API_URL}/challans?limit=1`, { headers });
    const checkChallanData = await checkChallanRes.json();
    if (checkChallanData.data && checkChallanData.data.length > 0) {
        console.log('Challan already exists. Skipping creation.');
        return;
    }

    const challanDate = new Date().toISOString();
    const challanNo = `CH-${Date.now()}`;

    const createChallanPayload = {
        challanNumber: challanNo,
        challanDate: challanDate,
        customerId: customerId,
        vendorId: vendorId,
        items: [
            {
                partNumber: "TEST-PART-001",
                partDescription: "Test Machined Part",
                quantityIssued: 100,
                unitOfMeasure: "NOS",
                unitPrice: 50.00
            }
        ]
    };

    console.log('Creating Challan...', challanNo);
    const createRes = await fetch(`${API_URL}/challans`, {
        method: 'POST',
        headers,
        body: JSON.stringify(createChallanPayload)
    });

    if (createRes.ok) {
        const challan = await createRes.json();
        console.log(`✅ Challan created: ${challan.id}`);
    } else {
        const err = await createRes.json();
        console.error('❌ Failed to create challan:', err);
    }
}

seed();
