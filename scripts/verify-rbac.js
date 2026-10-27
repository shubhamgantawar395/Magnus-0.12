const axios = require('axios');

const API_URL = 'http://localhost:3001';
let adminToken = '';
let executiveToken = '';
let ppcToken = '';

async function request(endpoint, method = 'GET', data = null, token = null) {
    try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios({
            method,
            url: `${API_URL}${endpoint}`,
            data,
            headers
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            return { error: error.response.data, status: error.response.status };
        }
        throw error;
    }
}

async function main() {
    console.log('🚀 Starting RBAC Verification...');

    // 1. Login as Executive
    console.log('\n--- 1. Login as Executive ---');
    const execLogin = await request('/auth/login', 'POST', {
        email: 'executive@seinumero.com',
        password: 'password123'
    });

    if (execLogin.error) {
        console.error('❌ Executive Login Failed:', execLogin.error);

        // Fallback: Login as Admin to create Executive if missing
        console.log('⚠️ Attempting fallback: Login as Admin to check/create Executive...');
        const adminLogin = await request('/auth/login', 'POST', {
            email: 'admin@aaniry.com',
            password: 'password123' // Assuming default
        });

        if (adminLogin.error) {
            console.error('❌ Admin Login Failed too. Cannot proceed.', adminLogin.error);
            return;
        }
        adminToken = adminLogin.access_token;
        console.log('✅ Admin Logged In. Creating Executive...');

        // Create Executive
        const createExec = await request('/users', 'POST', {
            email: 'executive@seinumero.com',
            password: 'password123',
            firstName: 'Exec',
            lastName: 'User',
            role: 'executive',
            organizationId: adminLogin.user.organizationId // Admin's org
        }, adminToken);

        if (createExec.error && createExec.status !== 409) {
            console.error('❌ Failed to create executive:', createExec.error);
            return;
        }
        console.log('✅ Executive Created/Exists. Retrying Executive Login...');

        const retryExecLogin = await request('/auth/login', 'POST', {
            email: 'executive@seinumero.com',
            password: 'password123'
        });

        if (retryExecLogin.error) {
            console.error('❌ Retry Executive Login Failed:', retryExecLogin.error);
            return;
        }
        executiveToken = retryExecLogin.access_token;
    } else {
        executiveToken = execLogin.access_token;
    }
    console.log('✅ Executive Logged In');

    // 2. Executive Creates PPC Manager
    console.log('\n--- 2. Executive Creates PPC Manager ---');
    const ppcEmail = `ppc.${Date.now()}@seinumero.com`;
    const createPpc = await request('/users', 'POST', {
        email: ppcEmail,
        password: 'password123',
        firstName: 'PPC',
        lastName: 'Manager',
        role: 'ppc_manager'
        // organizationId should be inferred from Executive
    }, executiveToken);

    if (createPpc.error) {
        console.error('❌ Failed to create PPC Manager:', createPpc.error);
        return;
    }
    console.log('✅ PPC Manager Created:', createPpc.email);

    // 3. Executive Tries to Create Vendor Owner (Should Fail)
    console.log('\n--- 3. Executive Tries to Create Vendor Owner (Negative Test) ---');
    const failVendorUser = await request('/users', 'POST', {
        email: `fake.vendor.${Date.now()}@test.com`,
        password: 'password123',
        firstName: 'Fake',
        lastName: 'Vendor',
        role: 'vendor_owner'
    }, executiveToken);

    if (failVendorUser.error && failVendorUser.status === 409) {
        console.log('✅ Correctly blocked Executive from creating Vendor Owner:', failVendorUser.error.message);
    } else {
        console.error('❌ Failed Negative Test! Executive WAS able to create Vendor Owner or got wrong error:', failVendorUser);
    }

    // 4. Login as PPC Manager
    console.log('\n--- 4. Login as PPC Manager ---');
    const ppcLogin = await request('/auth/login', 'POST', {
        email: ppcEmail,
        password: 'password123'
    });

    if (ppcLogin.error) {
        console.error('❌ PPC Login Failed:', ppcLogin.error);
        return;
    }
    ppcToken = ppcLogin.access_token;
    console.log('✅ PPC Manager Logged In');

    // 5. PPC Manager Creates Vendor (Should Success)
    console.log('\n--- 5. PPC Manager Creates Vendor (User Request) ---');
    const vendorCode = `V${Date.now().toString().slice(-6)}`;
    const createVendor = await request('/vendors', 'POST', {
        companyName: `Dynamic Vendor ${vendorCode}`,
        gstin: `27ABCDE${Date.now().toString().slice(-4)}P1Z5`,
        contactPerson: 'Vendor Contact',
        contactEmail: `vendor.${vendorCode}@test.com`,
        contactPhone: '9876543210',
        address: '123 Vendor St',
        city: 'Pune',
        state: 'MH',
        pincode: '411001',
        paymentTerms: 'payment_on_delivery',
        customerId: createPpc.organizationId ? createPpc.organizationId : undefined // Hacky: assumes Customer ID is Org ID for now, or existing logic handles it. 
        // Actually, createVendorDto needs 'customerId' to link to a Customer entity. 
        // If PPC is part of Organization (Customer), we might need to fetch the Customer entity first.
        // Let's see if the backend handles it or if I need to fetch customers first.
    }, ppcToken);

    // The backend VendorsService.create expects `customerId`. 
    // Wait, the VendorsController.create passes existing DTO.
    // However, usually `customerId` in DTO refers to the *Customer Entity ID*, not the User ID.
    // If the PPC Manager belongs to an Organization, that Organization likely IS the Customer entity (or linked to it).
    // Let's try fetching customers first to find self.

    // Actually, let's try to fetch /customers list first.
    const customersList = await request('/customers', 'GET', null, ppcToken);
    let targetCustomerId;
    if (!customersList.error && (customersList.data || customersList).length > 0) {
        const custs = customersList.data || customersList;
        targetCustomerId = custs[0].id; // Just pick the first one this user has access to
        console.log(`ℹ️ Found Customer Entity: ${custs[0].companyName} (${targetCustomerId})`);
    }

    if (!targetCustomerId) {
        // If no customer entity found, maybe this user can create one? 
        // Or maybe we can't create a vendor without a customer entity.
        // Let's try creating with just the required fields and see if my previous fix handles 'customerId' injection?
        // No, my previous fix was for cross-tenant.
        // If I am PPC manager of "Seinumero", I should create a vendor for "Seinumero".
        // I need the ID of Seinumero *Customer Entity* in the database.
        console.log('⚠️ No Customer Entity found for this user. Cannot strictly verify Vendor Creation linkage without it.');
        // Try creating anyway, usually there's validation.
    }

    // Retrying vendor creation with found customerId
    const createVendorRetry = await request('/vendors', 'POST', {
        companyName: `Dynamic Vendor ${vendorCode} - 2`,
        code: vendorCode,
        gstin: `29ABCDE${Date.now().toString().slice(-4)}P1Z5`,
        contactPerson: 'Vendor Contact',
        contactEmail: `vendor.real.${vendorCode}@test.com`,
        contactPhone: '9876543210',
        address: '123 Vendor St',
        city: 'Pune',
        state: 'MH',
        pincode: '411001',
        paymentTerms: 'payment_on_delivery',
        customerId: targetCustomerId // Required field
    }, ppcToken);

    if (createVendorRetry.error) {
        console.error('❌ Failed to create Vendor as PPC:', createVendorRetry.error);
    } else {
        console.log('✅ Vendor Created Successfully by PPC Manager:', createVendorRetry.companyName);
    }

    // 6. PPC Manager Tries to Create User (Should Fail)
    console.log('\n--- 6. PPC Manager Tries to Create User (Negative Test) ---');
    const failPpcUser = await request('/users', 'POST', {
        email: `sub.ppc.${Date.now()}@test.com`,
        password: 'password123',
        firstName: 'Sub',
        lastName: 'User',
        role: 'vendor_user' // Any role
    }, ppcToken);

    if (failPpcUser.error && failPpcUser.status === 409) {
        console.log('✅ Correctly blocked PPC from creating Users:', failPpcUser.error.message);
    } else {
        console.error('❌ Failed Negative Test! PPC WAS able to create User or got wrong error:', failPpcUser);
    }

}

main();
