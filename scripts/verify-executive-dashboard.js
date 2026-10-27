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
            console.error(`❌ API Error ${endpoint}:`, error.response.status, error.response.data);
            return { error: error.response.data, status: error.response.status };
        }
        console.error(`❌ Network Error ${endpoint}:`, error.message);
        throw error;
    }
}

async function main() {
    console.log('🚀 Starting Executive Dashboard Verification...');

    // 1. Login as Executive
    console.log('\n--- 1. Login as Executive ---');
    const execLogin = await request('/auth/login', 'POST', {
        email: 'executive@seinumero.com',
        password: 'password123'
    });

    if (execLogin.error) {
        console.error('❌ Executive Login Failed. Ensure user exists (run verify-rbac.js first if needed).');
        return;
    }
    const token = execLogin.access_token;
    console.log('✅ Executive Logged In');

    // 2. Fetch Executive Stats
    console.log('\n--- 2. Fetching /executive/stats ---');
    const stats = await request('/executive/stats', 'GET', null, token);

    if (stats.error) {
        console.error('❌ Failed to fetch stats:', stats.error);
        return;
    }

    console.log('✅ Stats received:', stats);

    if (stats.activeVendors > 0) {
        console.log('✅ PASS: Active Vendors found. Data visibility fix works.');
    } else {
        console.log('⚠️ WARNING: activeVendors is 0. This might be correct if no approved vendors exist, or the fix failed.');
        console.log('ℹ️ Suggestion: Check if the Vendor created in `verify-rbac.js` is APPROVED. It is likely PENDING.');
    }

    // 3. Fetch Stock Statement
    console.log('\n--- 3. Fetching /executive/stock-statement ---');
    const stock = await request('/executive/stock-statement', 'GET', null, token);

    if (stock.error) {
        console.error('❌ Failed to fetch stock statement:', stock.error);
    } else {
        console.log('✅ Stock Statement received:', stock);
    }
}

main();
