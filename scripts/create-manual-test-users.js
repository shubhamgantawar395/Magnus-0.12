const axios = require('axios');

const API_URL = 'http://localhost:3001';

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
    console.log('🚀 Creating Manual Test Users...');

    // 1. Login as Admin
    console.log('\n--- Logging in as Admin ---');
    let adminToken;
    const adminLogin = await request('/auth/login', 'POST', {
        email: 'admin@aaniry.com',
        password: 'admin123'
    });

    if (adminLogin.error) {
        console.error('❌ Admin Login Failed.', adminLogin.error);
        return;
    }
    adminToken = adminLogin.access_token;
    const orgId = adminLogin.user.organizationId;
    console.log(`✅ Admin Logged In (Org: ${orgId})`);

    // 2. Define Users to Create
    const users = [
        {
            email: 'executive@seinumero.com',
            password: 'password123',
            firstName: 'Sarah',
            lastName: 'Executive',
            role: 'executive',
            organizationId: orgId
        },
        {
            email: 'ppc@seinumero.com',
            password: 'password123',
            firstName: 'Rahul',
            lastName: 'PPC',
            role: 'ppc_manager',
            organizationId: orgId
        },
        {
            email: 'quality@seinumero.com',
            password: 'password123',
            firstName: 'Priya',
            lastName: 'Quality',
            role: 'quality_head',
            organizationId: orgId
        },
        {
            email: 'production@seinumero.com',
            password: 'password123',
            firstName: 'Amit',
            lastName: 'Production',
            role: 'production_manager',
            organizationId: orgId
        }
    ];

    // 3. Create OEM Users
    for (const user of users) {
        console.log(`\nChecking/Creating ${user.role}: ${user.email}...`);
        const res = await request('/users', 'POST', user, adminToken);
        if (res.error) {
            if (res.status === 409) {
                console.log(`ℹ️ User ${user.email} already exists.`);
            } else {
                console.error(`❌ Failed to create ${user.email}:`, res.error.message);
            }
        } else {
            console.log(`✅ Created ${user.email}`);
        }
    }

    // 4. Create a Vendor and Vendor Owner
    console.log('\n--- ensuring Vendor Owner exists ---');

    // Find or Create Customer for this Org
    let customerId;
    try {
        const customersRes = await request('/customers', 'GET', null, adminToken);
        const customers = customersRes.data || customersRes;
        if (Array.isArray(customers)) {
            const myCustomer = customers.find(c => c.organizationId === orgId);
            if (myCustomer) {
                customerId = myCustomer.id;
                console.log(`✅ Found linked Customer: ${myCustomer.companyName}`);
            } else if (customers.length > 0) {
                customerId = customers[0].id;
                console.log(`ℹ️ Using existing customer: ${customers[0].companyName}`);
            }
        }
    } catch (e) {
        console.log('⚠️ Failed to fetch customers, trying to create one...');
    }

    if (!customerId) {
        console.log('Creating "Seinumero" Customer entity...');
        const custRes = await request('/customers', 'POST', {
            companyName: 'Seinumero Nirman Pvt Ltd',
            gstin: '27AAACS1234H1Z1',
            contactPerson: 'Director',
            email: 'director@seinumero.com',
            address: 'Pune, MH',
            organizationId: orgId
        }, adminToken);

        if (custRes.error) {
            console.error('❌ Failed to create Customer:', custRes.error);
        } else {
            customerId = custRes.id;
            console.log('✅ Created Seinumero Customer');
        }
    }

    if (customerId) {
        // Create Demo Vendor
        const vendorCode = 'VEN-DEMO-001';
        let vendorId;

        const allVendorsRes = await request('/vendors?limit=100', 'GET', null, adminToken);
        if (!allVendorsRes.error) {
            const vData = allVendorsRes.data || allVendorsRes;
            if (Array.isArray(vData)) {
                const existingVendor = vData.find(v => v.vendorCode === vendorCode);
                if (existingVendor) {
                    console.log('ℹ️ Demo Vendor (VEN-DEMO-001) already exists.');
                    vendorId = existingVendor.id;
                }
            }
        }

        if (!vendorId) {
            console.log('Creating New Demo Vendor...');
            const vendorRes = await request('/vendors', 'POST', {
                companyName: 'Demo Precision Utils',
                vendorCode: vendorCode,
                gstin: '27AABCU9603R1ZN',
                contactPerson: 'Vikram Vendor',
                contactEmail: 'vendor@demo.com',
                contactPhone: '9988776655',
                address: 'Plot 45, MIDC',
                city: 'Pune',
                state: 'MH',
                pincode: '411026',
                customerId: customerId
            }, adminToken);

            if (vendorRes.error) {
                console.error('❌ Failed to create Demo Vendor:', vendorRes.error);
            } else {
                console.log('✅ Created Demo Vendor');
                vendorId = vendorRes.id;
            }
        }

        if (vendorId) {
            // Create Vendor Owner User
            const vendorUser = {
                email: 'vendor@demo.com',
                password: 'password123',
                firstName: 'Vikram',
                lastName: 'Vendor',
                role: 'vendor_owner',
                organizationId: orgId, // Vendor Users belong to Tenant? Or should use vendorId logic?
                // Depending on schema, vendor users might need specific handling.
                // Assuming vendorId link is enough.
                vendorId: vendorId
            };

            console.log(`\nChecking/Creating Vendor Owner: ${vendorUser.email}...`);
            const vRes = await request('/users', 'POST', vendorUser, adminToken);
            if (vRes.error) {
                if (vRes.status === 409) {
                    console.log(`ℹ️ User ${vendorUser.email} already exists.`);
                } else {
                    console.error(`❌ Failed to create ${vendorUser.email}:`, vRes.error.message);
                }
            } else {
                console.log(`✅ Created ${vendorUser.email}`);
            }
        }
    } else {
        console.error('❌ Could not establish Customer ID context.');
    }

    console.log('\n🎉 Test User Setup Complete.');
}

main();
