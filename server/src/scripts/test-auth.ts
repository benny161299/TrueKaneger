import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// פתרון עבור __dirname בסביבת ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// טעינת משתני סביבה
dotenv.config({ path: path.join(__dirname, '../../.env') });

const TEST_PORT = '5001';
const BASE_URL = `http://localhost:${TEST_PORT}/api/auth`;
const TEST_EMAIL = 'test-auth-random123@kaneger.com';
const TEST_PASSWORD = 'password123';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  let serverProcess: any;
  let exitCode = 0;

  try {
    console.log('--- Starting Integration Test Setup ---');
    console.log('💡 Running in OFFLINE mock DB mode.');

    // הפעלת שרת הבדיקות כתת-תהליך עם MOCK_DB=true
    console.log(`🚀 Starting test server on port ${TEST_PORT}...`);
    serverProcess = spawn('npx', ['tsx', 'src/index.ts'], {
      cwd: path.join(__dirname, '../..'),
      env: {
        ...process.env,
        PORT: TEST_PORT,
        MOCK_DB: 'true', // הפעלת מסד נתונים מדמה בשרת
      },
      shell: true,
    });

    serverProcess.stdout.on('data', (data: any) => {
      console.log(`[Server]: ${data}`);
    });
    serverProcess.stderr.on('data', (data: any) => {
      console.error(`[Server Error]: ${data}`);
    });

    // המלצה להמתין 3 שניות לעליית השרת והחיבור ל-DB
    await sleep(3000);

    // הרצת תרחישי הבדיקה
    console.log('\n--- Running API Scenarios ---');

    let cookieHeader = '';
    let refreshTokenOnlyCookie = '';

    // תרחיש א': רישום משתמש תקין
    console.log('📝 Scenario 1: User Registration (POST /register)');
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    const regData = await regRes.json() as any;
    if (regRes.status !== 201 || !regData.success) {
      throw new Error(`Failed registration: Status ${regRes.status}, ${JSON.stringify(regData)}`);
    }
    console.log('✅ Scenario 1 Passed.');

    // תרחיש ב': רישום משתמש כפול (שגיאה 409)
    console.log('📝 Scenario 2: Duplicate Registration (POST /register)');
    const dupRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    const dupData = await dupRes.json() as any;
    if (dupRes.status !== 409 || dupData.success) {
      throw new Error(`Should fail duplicate registration: Status ${dupRes.status}`);
    }
    console.log('✅ Scenario 2 Passed (Correctly rejected duplicate email).');

    // תרחיש ג': התחברות תקינה (POST /login)
    console.log('📝 Scenario 3: Login Success (POST /login)');
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    const loginData = await loginRes.json() as any;
    if (loginRes.status !== 200 || !loginData.success || !loginData.data?.user) {
      throw new Error(`Failed login: Status ${loginRes.status}, ${JSON.stringify(loginData)}`);
    }
    
    // שליפת עוגיות
    const setCookies = loginRes.headers.getSetCookie();
    let accessTokenCookie = '';
    let refreshTokenCookie = '';
    for (const cookie of setCookies) {
      if (cookie.startsWith('accessToken=')) {
        accessTokenCookie = cookie.split(';')[0];
      } else if (cookie.startsWith('refreshToken=')) {
        refreshTokenCookie = cookie.split(';')[0];
      }
    }
    if (!accessTokenCookie || !refreshTokenCookie) {
      throw new Error('Cookies were not returned properly upon login!');
    }
    cookieHeader = [accessTokenCookie, refreshTokenCookie].join('; ');
    refreshTokenOnlyCookie = refreshTokenCookie;
    console.log('✅ Scenario 3 Passed (Successful login & cookies captured).');

    // תרחיש ד': התחברות שגויה (POST /login)
    console.log('📝 Scenario 4: Login Failure (POST /login with wrong password)');
    const failRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: 'wrongpassword' }),
    });
    const failData = await failRes.json() as any;
    if (failRes.status !== 401 || failData.success) {
      throw new Error(`Should fail login with wrong password: Status ${failRes.status}`);
    }
    console.log('✅ Scenario 4 Passed (Correctly rejected invalid credentials).');

    // תרחיש ה': רענון אסימון (POST /refresh)
    console.log('📝 Scenario 5: Token Refresh (POST /refresh)');
    const refreshRes = await fetch(`${BASE_URL}/refresh`, {
      method: 'POST',
      headers: { 
        'Cookie': refreshTokenOnlyCookie 
      },
    });
    const refreshData = await refreshRes.json() as any;
    if (refreshRes.status !== 200 || !refreshData.success) {
      throw new Error(`Failed refresh: Status ${refreshRes.status}, ${JSON.stringify(refreshData)}`);
    }
    const newCookies = refreshRes.headers.getSetCookie();
    let newAccessTokenCookie = '';
    for (const cookie of newCookies) {
      if (cookie.startsWith('accessToken=')) {
        newAccessTokenCookie = cookie.split(';')[0];
      }
    }
    if (!newAccessTokenCookie) {
      throw new Error('New accessToken cookie was not returned upon refresh!');
    }
    console.log('✅ Scenario 5 Passed (Token successfully refreshed).');

    // תרחיש ו': התנתקות (POST /logout)
    console.log('📝 Scenario 6: Logout (POST /logout)');
    const logoutRes = await fetch(`${BASE_URL}/logout`, {
      method: 'POST',
      headers: { 'Cookie': cookieHeader },
    });
    const logoutData = await logoutRes.json() as any;
    if (logoutRes.status !== 200 || !logoutData.success) {
      throw new Error(`Failed logout: Status ${logoutRes.status}`);
    }
    const logoutCookies = logoutRes.headers.getSetCookie();
    if (logoutCookies.length === 0) {
      throw new Error('Logout did not return cleared cookie headers!');
    }
    console.log('✅ Scenario 6 Passed (Successfully logged out & cookies cleared).');

    console.log('\n🌟 ALL SCENARIOS PASSED SUCCESSFULLY! 🌟');
  } catch (error: any) {
    console.error('\n❌ Test execution failed:', error.message);
    exitCode = 1;
  } finally {
    console.log('\n--- Cleanup ---');
    // סגירת שרת הבדיקות
    if (serverProcess) {
      console.log('🛑 Killing test server process...');
      serverProcess.kill();
    }
    
    process.exit(exitCode);
  }
}

runTests();
