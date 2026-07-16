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
const BASE_URL = `http://localhost:${TEST_PORT}/api`;
const USER_EMAIL = 'user@kaneger.com';
const ADMIN_EMAIL = 'admin@kaneger.com';
const TEST_PASSWORD = 'password123';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  let serverProcess: any;
  let exitCode = 0;

  try {
    console.log('--- Starting Contacts Integration Test Setup ---');
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

    console.log('\n--- Running Contacts API Scenarios ---');

    // תרחיש א': ניסיון שליפה ללא התחברות (חסימת אורחים)
    console.log('📝 Scenario 1: Fetch contacts without logging in (GET /contacts)');
    const guestRes = await fetch(`${BASE_URL}/contacts`);
    const guestData = await guestRes.json() as any;
    if (guestRes.status !== 401 || guestData.success) {
      throw new Error(`Should reject guest request: Status ${guestRes.status}`);
    }
    console.log('✅ Scenario 1 Passed (Guest fetch blocked with 401).');

    // הכנת משתמשים לבדיקות
    console.log('📝 Registering and logging in test users...');
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

    // תרחיש ב': הוספת איש קשר חדש על ידי משתמש רגיל (POST /contacts)
    console.log('📝 Scenario 2: Create a contact (POST /contacts)');
    const createRes = await fetch(`${BASE_URL}/contacts`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({
        name: 'ישראל ישראלי',
        phone: '050-1234567',
        email: 'israel@example.com'
      }),
    });
    const createData = await createRes.json() as any;
    if (createRes.status !== 201 || !createData.success || !createData.data) {
      throw new Error(`Failed creating contact: Status ${createRes.status}, ${JSON.stringify(createData)}`);
    }
    const createdContactId = createData.data._id;
    console.log('✅ Scenario 2 Passed (Contact created successfully).');

    // תרחיש ב2: ניסיון יצירת איש קשר כפול (שם ומספר זהים)
    console.log('📝 Scenario 2b: Try to create duplicate contact (same name and phone)');
    const duplicateRes = await fetch(`${BASE_URL}/contacts`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({
        name: 'ישראל ישראלי',
        phone: '050-1234567',
        email: 'another@example.com'
      }),
    });
    const duplicateData = await duplicateRes.json() as any;
    if (duplicateRes.status !== 409 || duplicateData.success) {
      throw new Error(`Should fail creating duplicate contact: Status ${duplicateRes.status}, expected 409`);
    }
    console.log('✅ Scenario 2b Passed (Duplicate contact blocked with 409).');

    // תרחיש ג': שליפת אנשי קשר ואימות ששדות חסויים לא נחשפים (GET /contacts - בדיקה לשלב 4.4)
    console.log('📝 Scenario 3: Fetch contacts list & verify phone/email are NOT exposed (GET /contacts)');
    const fetchRes = await fetch(`${BASE_URL}/contacts`, {
      headers: { 'Cookie': userCookie }
    });
    const fetchData = await fetchRes.json() as any;
    if (fetchRes.status !== 200 || !fetchData.success || !Array.isArray(fetchData.data)) {
      throw new Error(`Failed fetching contacts: Status ${fetchRes.status}`);
    }

    const fetchedContact = fetchData.data.find((c: any) => c._id === createdContactId);
    if (!fetchedContact) {
      throw new Error('Created contact was not found in the list!');
    }

    // בדיקה קריטית לשלב 4.4: הטלפון והמייל אינם קיימים באובייקט
    if (fetchedContact.phone !== undefined || fetchedContact.email !== undefined) {
      throw new Error('CRITICAL SECURITY BREACH: phone or email fields were exposed in GET /api/contacts!');
    }
    console.log('✅ Scenario 3 Passed (Exposure check: phone and email are completely hidden!).');

    // תרחיש ד': ניסיון מחיקת איש קשר על ידי משתמש רגיל (חסימה)
    console.log('📝 Scenario 4: Delete contact by normal user (DELETE /contacts/:id)');
    const deleteFailRes = await fetch(`${BASE_URL}/contacts/${createdContactId}`, {
      method: 'DELETE',
      headers: { 'Cookie': userCookie }
    });
    const deleteFailData = await deleteFailRes.json() as any;
    if (deleteFailRes.status !== 403 || deleteFailData.success) {
      throw new Error(`Should fail delete contact for normal user: Status ${deleteFailRes.status}`);
    }
    console.log('✅ Scenario 4 Passed (Successfully blocked deletion by non-admin).');

    // תרחיש ה': מחיקת איש קשר על ידי מנהל מערכת (הצלחה)
    console.log('📝 Scenario 5: Delete contact by admin user (DELETE /contacts/:id)');
    const deleteRes = await fetch(`${BASE_URL}/contacts/${createdContactId}`, {
      method: 'DELETE',
      headers: { 'Cookie': adminCookie }
    });
    const deleteData = await deleteRes.json() as any;
    if (deleteRes.status !== 200 || !deleteData.success) {
      throw new Error(`Failed delete contact: Status ${deleteRes.status}`);
    }
    console.log('✅ Scenario 5 Passed (Successfully deleted contact by admin user).');

    console.log('\n🌟 ALL CONTACT SCENARIOS PASSED SUCCESSFULLY! 🌟');
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
