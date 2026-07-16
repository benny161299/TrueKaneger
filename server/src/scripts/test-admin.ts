import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// פתרון עבור __dirname בסביבת ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// טעינת משתני סביבה
dotenv.config({ path: path.join(__dirname, '../../.env') });

const TEST_PORT = '5004';
const BASE_URL = `http://localhost:${TEST_PORT}/api`;
const USER_EMAIL = 'regular-user@kaneger.com';
const ADMIN_EMAIL = 'admin@kaneger.com';
const TEST_PASSWORD = 'password123';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  let serverProcess: any;
  let exitCode = 0;

  try {
    console.log('--- Starting Admin Integration Test Setup ---');
    console.log('💡 Running in OFFLINE mock DB mode.');

    // 1. הפעלת שרת הבדיקות כתת-תהליך עם MOCK_DB=true
    console.log(`🚀 Starting test server on port ${TEST_PORT}...`);
    serverProcess = spawn('npx', ['tsx', 'src/index.ts'], {
      cwd: path.join(__dirname, '../..'),
      env: {
        ...process.env,
        PORT: TEST_PORT,
        MOCK_DB: 'true',
      },
      shell: true,
    });

    serverProcess.stdout.on('data', (data: any) => {
      console.log(`[Server]: ${data}`);
    });
    serverProcess.stderr.on('data', (data: any) => {
      console.error(`[Server Error]: ${data}`);
    });

    await sleep(3000);

    console.log('\n--- Registering and logging in users ---');

    // רישום משתמש רגיל
    await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: USER_EMAIL, password: TEST_PASSWORD }),
    });

    // רישום אדמין
    await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: TEST_PASSWORD }),
    });

    // התחברות משתמש רגיל
    const userLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: USER_EMAIL, password: TEST_PASSWORD }),
    });
    const userSetCookies = userLoginRes.headers.getSetCookie();
    let userCookie = '';
    for (const cookie of userSetCookies) {
      if (cookie.startsWith('accessToken=')) {
        userCookie = cookie.split(';')[0];
      }
    }

    // התחברות משתמש אדמין
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: TEST_PASSWORD }),
    });
    const adminSetCookies = adminLoginRes.headers.getSetCookie();
    let adminCookie = '';
    for (const cookie of adminSetCookies) {
      if (cookie.startsWith('accessToken=')) {
        adminCookie = cookie.split(';')[0];
      }
    }

    // יצירת איש קשר לבדיקות
    console.log('📝 Creating a test contact...');
    const createContactRes = await fetch(`${BASE_URL}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
      },
      body: JSON.stringify({
        name: 'משה כהן',
        phone: '052-1111111',
        email: 'moshe@example.com',
      }),
    });
    const createContactData = await createContactRes.json() as any;
    const contactId = createContactData.data._id;
    console.log(`Created Contact: ID = ${contactId}`);

    // יצירת דיווח לבדיקות
    console.log('📝 Creating a test report...');
    const createReportRes = await fetch(`${BASE_URL}/contacts/${contactId}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie,
      },
      body: JSON.stringify({
        reason: 'WRONG_NAME',
        suggestedCorrection: 'משה לוי',
      }),
    });
    const createReportData = await createReportRes.json() as any;
    // נשלוף את הדיווחים כדי למצוא את ה-ID של הדיווח שנוצר
    const getReportsRes = await fetch(`${BASE_URL}/admin/reports`, {
      headers: { 'Cookie': adminCookie },
    });
    const getReportsData = await getReportsRes.json() as any;
    const reportId = getReportsData.data[0]?._id;
    console.log(`Test Report: ID = ${reportId}`);

    console.log('\n--- Scenario 1: Verify Normal User is Blocked (403 Forbidden) ---');

    // 1. GET /api/admin/reports
    console.log('Testing GET /api/admin/reports with regular user...');
    const res1 = await fetch(`${BASE_URL}/admin/reports`, {
      headers: { 'Cookie': userCookie },
    });
    if (res1.status !== 403) {
      throw new Error(`Regular user should be blocked from reports: status ${res1.status}`);
    }
    console.log('✅ GET /admin/reports blocked successfully.');

    // 2. POST /api/admin/reports/:id/dismiss
    console.log('Testing POST /api/admin/reports/:id/dismiss with regular user...');
    const res2 = await fetch(`${BASE_URL}/admin/reports/${reportId}/dismiss`, {
      method: 'POST',
      headers: { 'Cookie': userCookie },
    });
    if (res2.status !== 403) {
      throw new Error(`Regular user should be blocked from dismiss: status ${res2.status}`);
    }
    console.log('✅ POST /admin/reports/:id/dismiss blocked successfully.');

    // 3. PATCH /api/admin/users/:id/ban
    console.log('Testing PATCH /api/admin/users/:id/ban with regular user...');
    const res3 = await fetch(`${BASE_URL}/admin/users/some-user-id/ban`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie,
      },
      body: JSON.stringify({ isBanned: true }),
    });
    if (res3.status !== 403) {
      throw new Error(`Regular user should be blocked from ban: status ${res3.status}`);
    }
    console.log('✅ PATCH /admin/users/:id/ban blocked successfully.');

    // 4. PATCH /api/admin/contacts/:id/name
    console.log('Testing PATCH /api/admin/contacts/:id/name with regular user...');
    const res4 = await fetch(`${BASE_URL}/admin/contacts/${contactId}/name`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie,
      },
      body: JSON.stringify({ name: 'שם מעודכן' }),
    });
    if (res4.status !== 403) {
      throw new Error(`Regular user should be blocked from updating contact name: status ${res4.status}`);
    }
    console.log('✅ PATCH /admin/contacts/:id/name blocked successfully.');

    // 5. PATCH /api/admin/contacts/:id/phone
    console.log('Testing PATCH /api/admin/contacts/:id/phone with regular user...');
    const res5 = await fetch(`${BASE_URL}/admin/contacts/${contactId}/phone`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie,
      },
      body: JSON.stringify({ phone: '052-2222222' }),
    });
    if (res5.status !== 403) {
      throw new Error(`Regular user should be blocked from updating contact phone: status ${res5.status}`);
    }
    console.log('✅ PATCH /admin/contacts/:id/phone blocked successfully.');

    // 6. PATCH /api/admin/contacts/:id/email
    console.log('Testing PATCH /api/admin/contacts/:id/email with regular user...');
    const res6 = await fetch(`${BASE_URL}/admin/contacts/${contactId}/email`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie,
      },
      body: JSON.stringify({ email: 'new@example.com' }),
    });
    if (res6.status !== 403) {
      throw new Error(`Regular user should be blocked from updating contact email: status ${res6.status}`);
    }
    console.log('✅ PATCH /admin/contacts/:id/email blocked successfully.');

    console.log('\n--- Scenario 2: Verify Admin is Allowed (200 OK) ---');

    // 1. GET /api/admin/reports
    console.log('Testing GET /api/admin/reports with admin...');
    const adminRes1 = await fetch(`${BASE_URL}/admin/reports`, {
      headers: { 'Cookie': adminCookie },
    });
    if (adminRes1.status !== 200) {
      throw new Error(`Admin should access reports: status ${adminRes1.status}`);
    }
    console.log('✅ GET /admin/reports allowed.');

    // 2. PATCH /api/admin/contacts/:id/name
    console.log('Testing PATCH /api/admin/contacts/:id/name with admin...');
    const adminRes4 = await fetch(`${BASE_URL}/admin/contacts/${contactId}/name`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
      },
      body: JSON.stringify({ name: 'שם חדש ומעודכן' }),
    });
    const adminRes4Data = await adminRes4.json() as any;
    if (adminRes4.status !== 200 || adminRes4Data.data.name !== 'שם חדש ומעודכן') {
      throw new Error(`Admin failed to update contact name: status ${adminRes4.status}`);
    }
    console.log('✅ PATCH /admin/contacts/:id/name allowed & updated correctly.');

    // 3. PATCH /api/admin/contacts/:id/phone
    console.log('Testing PATCH /api/admin/contacts/:id/phone with admin...');
    const adminRes5 = await fetch(`${BASE_URL}/admin/contacts/${contactId}/phone`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
      },
      body: JSON.stringify({ phone: '052-2222222' }),
    });
    const adminRes5Data = await adminRes5.json() as any;
    if (adminRes5.status !== 200 || adminRes5Data.data.phone !== '052-2222222') {
      throw new Error(`Admin failed to update contact phone: status ${adminRes5.status}`);
    }
    console.log('✅ PATCH /admin/contacts/:id/phone allowed & updated correctly.');

    // 4. PATCH /api/admin/contacts/:id/email
    console.log('Testing PATCH /api/admin/contacts/:id/email with admin...');
    const adminRes6 = await fetch(`${BASE_URL}/admin/contacts/${contactId}/email`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
      },
      body: JSON.stringify({ email: 'new@example.com' }),
    });
    const adminRes6Data = await adminRes6.json() as any;
    if (adminRes6.status !== 200 || adminRes6Data.data.email !== 'new@example.com') {
      throw new Error(`Admin failed to update contact email: status ${adminRes6.status}`);
    }
    console.log('✅ PATCH /admin/contacts/:id/email allowed & updated correctly.');

    // 5. POST /api/admin/reports/:id/dismiss
    console.log('Testing POST /api/admin/reports/:id/dismiss with admin...');
    const adminRes2 = await fetch(`${BASE_URL}/admin/reports/${reportId}/dismiss`, {
      method: 'POST',
      headers: { 'Cookie': adminCookie },
    });
    if (adminRes2.status !== 200) {
      throw new Error(`Admin failed to dismiss report: status ${adminRes2.status}`);
    }
    console.log('✅ POST /admin/reports/:id/dismiss allowed & dismissed.');

    console.log('\n🌟 All Admin Integration Tests Passed Successfully! 🌟');
  } catch (error: any) {
    console.error('❌ Test failed with error:', error.message);
    exitCode = 1;
  } finally {
    if (serverProcess) {
      console.log('🛑 Shutting down test server...');
      serverProcess.kill('SIGINT');
    }
    await sleep(1000);
    process.exit(exitCode);
  }
}

runTests();
