const axios = require('axios');
async function test() {
  try {
    const loginRes = await axios.post('http://localhost:3001/auth/login', { email: 'ppc@aaniry.com', password: 'password123' });
    const token = loginRes.data.access_token;
    console.log('Login successful');
    try {
      const custRes = await axios.get('http://localhost:3001/customers', { headers: { Authorization: `Bearer ${token}` } });
      console.log('Customers GET status:', custRes.status);
    } catch(e) {
      console.log('Customers GET error status:', e.response?.status);
    }
    try {
      const vRes = await axios.get('http://localhost:3001/vendors', { headers: { Authorization: `Bearer ${token}` } });
      console.log('Vendors GET status:', vRes.status);
    } catch(e) {
      console.log('Vendors GET error status:', e.response?.status);
    }
    try {
        const cRes = await axios.get('http://localhost:3001/challans', { headers: { Authorization: `Bearer ${token}` } });
        console.log('Challans GET status:', cRes.status);
    } catch(e) {
        console.log('Challans GET error status:', e.response?.status);
    }
  } catch(e) {
    console.error('Login failed', e.message);
  }
}
test();
