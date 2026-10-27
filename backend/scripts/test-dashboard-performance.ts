
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3001';

// Configuration
const CONCURRENT_USERS = 20; // Number of simulated concurrent users
const TOTAL_REQUESTS = 100; // Total requests to fire
const TEST_DURATION_MS = 10000; // Max duration to run tests

interface TestResult {
    endpoint: string;
    success: boolean;
    duration: number;
    status: number;
    error?: string;
}

import * as jwt from 'jsonwebtoken';

async function generateToken(user: any): Promise<string> {
    const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        department: user.department,
        vendorId: user.vendorId
    };
    return jwt.sign(payload, 'your-super-secret-jwt-key-change-in-production', { expiresIn: '1h' });
}

async function measureRequest(url: string, token: string): Promise<TestResult> {
    const start = performance.now();
    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const duration = performance.now() - start;
        return {
            endpoint: url,
            success: true,
            duration,
            status: response.status
        };
    } catch (error: any) {
        const duration = performance.now() - start;
        return {
            endpoint: url,
            success: false,
            duration,
            status: error.response?.status || 0,
            error: error.message
        };
    }
}

async function runLoadTest() {
    console.log('Starting Dashboard Performance Test...');
    console.log(`Concurrent Users: ${CONCURRENT_USERS}`);

    // 1. Setup - Get Tokens
    // We need an Executive and a Vendor
    // We need an Executive and a Vendor
    // Use the emails we seeded in seed-test-users.ts
    const directorEmail = 'director@aaniry.com';
    const vendorEmail = 'vendor@supplier.com';

    const director = await prisma.user.findUnique({ where: { email: directorEmail } });
    const vendorUser = await prisma.user.findUnique({ where: { email: vendorEmail } });
    console.log('Vendor User:', JSON.stringify(vendorUser, null, 2));

    if (!director || !vendorUser) {
        console.error('Test Data Missing: Ensure Director and Vendor users exist.');
        return;
    }

    const directorToken = await generateToken(director);
    const vendorToken = await generateToken(vendorUser);

    if (!directorToken || !vendorToken) {
        console.error('Authentication Failed: Could not get tokens.');
        return;
    }

    console.log('Authentication successful. Starting load tests...');

    // 2. Define Scenarios
    const scenarios = [
        {
            name: 'Executive Sourcing Dashboard',
            url: `${BASE_URL}/executive/vendor-comparison`,
            token: directorToken
        },
        {
            name: 'Executive Cost Analysis',
            url: `${BASE_URL}/executive/cost-analysis`,
            token: directorToken
        },
        {
            name: 'Vendor Analytics (Self)',
            url: `${BASE_URL}/vendors/me/analytics`,
            token: vendorToken
        },
        {
            name: 'Vendor Jobs',
            url: `${BASE_URL}/vendors/jobs`,
            token: vendorToken
        }
    ];

    const results: TestResult[] = [];

    // 3. Execute Concurrent Requests
    const promises: Promise<TestResult>[] = [];

    for (let i = 0; i < TOTAL_REQUESTS; i++) {
        const scenario = scenarios[i % scenarios.length];
        // Add artificial delay to simulate realistic arrival rates if needed, 
        // but for "concurrent" testing we want to batch them.

        // We batch them in chunks of CONCURRENT_USERS
        if (promises.length >= CONCURRENT_USERS) {
            const batchResults = await Promise.all(promises);
            results.push(...batchResults);
            promises.length = 0; // Clear batch
        }

        promises.push(measureRequest(scenario.url, scenario.token));
    }

    // Process remaining
    if (promises.length > 0) {
        results.push(...await Promise.all(promises));
    }

    // 4. Analyze Results
    analyzeResults(results);
}

function analyzeResults(results: TestResult[]) {
    console.log('\n--- Performance Test Results ---');
    console.log(`Total Requests: ${results.length}`);
    const successful = results.filter(r => r.success);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${results.length - successful.length}`);

    if (successful.length === 0) return;

    // Group by endpoint
    const byEndpoint: Record<string, number[]> = {};
    successful.forEach(r => {
        const key = r.endpoint.replace(BASE_URL, '');
        if (!byEndpoint[key]) byEndpoint[key] = [];
        byEndpoint[key].push(r.duration);
    });

    console.log('\nResponse Times (ms):');
    Object.entries(byEndpoint).forEach(([endpoint, durations]) => {
        const min = Math.min(...durations).toFixed(2);
        const max = Math.max(...durations).toFixed(2);
        const avg = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2);

        console.log(`\nEndpoint: ${endpoint}`);
        console.log(`  Count: ${durations.length}`);
        console.log(`  Min: ${min} ms`);
        console.log(`  Max: ${max} ms`);
        console.log(`  Avg: ${avg} ms`);

        if (Number(avg) > 500) {
            console.warn(`  WARNING: Average response time exceeds 500ms`);
        }
    });

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
        console.log('\nErrors:');
        const errors = [...new Set(failed.map(r => `${r.status}: ${r.error} (${r.endpoint})`))];
        errors.forEach(e => console.error(`  ${e}`));
    }
}

runLoadTest()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
