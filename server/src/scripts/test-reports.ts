import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// פתרון עבור __dirname בסביבת ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// טעינת משתני סביבה
dotenv.config({ path: path.join(__dirname, '../../.env') });

const TEST_PORT = '5003';
const BASE_URL = `http://localhost:${TEST_PORT}/api`;
const TEST_EMAIL = 'reporter@kaneger.com';
const TEST_PASSWORD = 'password123';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  let serverProcess: any;
  let exitCode = 0;

  try {
    console.log('--- Starting Reports Integration Test Setup ---');
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
      // console.log(`[Server]: ${data}`);
    });
    serverProcess.stderr.on('data', (data: any) => {
      console.error(`[Server Error]: ${data}`);
    });

    await sleep(3000);

    console.log('\n--- Running Reports API Scenarios ---');

    // הרשמה והתחברות של המשתמש המדווח
    console.log('📝 Registering and logging in test user...');
    await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });

    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    const setCookies = loginRes.headers.getSetCookie();
    let userCookie = '';
    for (const cookie of setCookies) {
      if (cookie.startsWith('accessToken=')) {
        userCookie = cookie.split(';')[0];
      }
    }

    // יצירת איש קשר
    console.log('📝 Creating a new contact...');
    const createContactRes = await fetch(`${BASE_URL}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie,
      },
      body: JSON.stringify({
        name: 'ישראל ישראלי',
        phone: '050-1234567',
        email: 'israel@example.com',
      }),
    });
    const createContactData = await createContactRes.json() as any;
    const contactId = createContactData.data._id;
    console.log(`Created Contact: ID = ${contactId}`);

    // שליחת דיווח ראשון (הצלחה)
    console.log('📝 Scenario 1: Submit first report on contact (POST /contacts/:id/report)');
    const report1Res = await fetch(`${BASE_URL}/contacts/${contactId}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie,
      },
      body: JSON.stringify({
        reason: 'WRONG_NUMBER',
        suggestedCorrection: '050-7654321',
        freeTextComment: 'המספר אינו נכון',
      }),
    });
    const report1Data = await report1Res.json() as any;
    console.log(`Status: ${report1Res.status}, Message: "${report1Data.message}"`);
    
    if (report1Res.status !== 201 || !report1Data.success) {
      throw new Error(`Report submission failed: Status ${report1Res.status}`);
    }
    console.log('✅ Scenario 1 Passed (Report created successfully).');

    // שליחת דיווח שני מאותו משתמש על אותו איש קשר (חסימה)
    console.log('📝 Scenario 2: Submit duplicate report on same contact (POST /contacts/:id/report)');
    const report2Res = await fetch(`${BASE_URL}/contacts/${contactId}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie,
      },
      body: JSON.stringify({
        reason: 'WRONG_NAME',
        freeTextComment: 'שם שגוי',
      }),
    });
    const report2Data = await report2Res.json() as any;
    console.log(`Status: ${report2Res.status}, Message: "${report2Data.message}"`);
    
    if (report2Res.status !== 409 || report2Data.success) {
      throw new Error(`Duplicate report check failed: expected 409, got ${report2Res.status}`);
    }
    if (!report2Data.message.includes('כבר דיווחת על איש קשר זה בעבר')) {
      throw new Error(`Expected specific error message, got: "${report2Data.message}"`);
    }
    console.log('✅ Scenario 2 Passed (Duplicate report blocked with 409 Conflict).');

    // אימות עדכון ה-reportCount של איש הקשר
    console.log('📝 Scenario 3: Verify reportCount has updated (GET /contacts)');
    const fetchRes = await fetch(`${BASE_URL}/contacts`, {
      headers: { 'Cookie': userCookie },
    });
    const fetchData = await fetchRes.json() as any;
    const contact = fetchData.data.find((c: any) => c._id === contactId);
    
    if (!contact) {
      throw new Error('Contact not found in list!');
    }
    console.log(`Contact reportCount is: ${contact.reportCount}`);
    if (contact.reportCount !== 1) {
      throw new Error(`Expected reportCount to be 1, got: ${contact.reportCount}`);
    }
    console.log('✅ Scenario 3 Passed (reportCount updated to 1).');

    console.log('\n🌟 ALL REPORT SCENARIOS PASSED SUCCESSFULLY! 🌟');
  } catch (error: any) {
    console.error('\n❌ Test execution failed:', error.message);
    exitCode = 1;
  } finally {
    console.log('\n--- Cleanup ---');
    if (serverProcess) {
      console.log('🛑 Killing test server process...');
      serverProcess.kill();
    }
    process.exit(exitCode);
  }
}

runTests();
