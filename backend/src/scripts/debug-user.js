
const API_URL = 'http://localhost:3001';

const CREDENTIALS = {
    email: 'admin@aaniry.com',
    password: 'admin123'
};

async function debugUser() {
    console.log('Debugging User...');

    // 1. Login
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(CREDENTIALS)
    });

    if (loginRes.ok) {
        const data = await loginRes.json();
        console.log('Login Response User Object:', data.user);
        console.log('Token:', data.access_token ? 'Present' : 'Missing');
        // Decode token payload (basic)
        if (data.access_token) {
            const parts = data.access_token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                console.log('Token Payload:', payload);
            }

            console.log('Testing Protected Route (GET /customers)...');
            const custRes = await fetch(`${API_URL}/customers?limit=1`, {
                headers: { 'Authorization': `Bearer ${data.access_token}` }
            });
            console.log(`GET /customers Status: ${custRes.status} ${custRes.statusText}`);
            if (!custRes.ok) {
                console.log('Response:', await custRes.text());
                console.log('Headers:', [...custRes.headers.entries()]);
            } else {
                console.log('Success!');
            }
        }
    } else {
        console.error('Login Failed:', await loginRes.text());
    }
}

debugUser();
