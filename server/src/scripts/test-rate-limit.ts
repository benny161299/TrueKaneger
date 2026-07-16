import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// פתרון עבור __dirname בסביבת ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// טעינת משתני סביבה
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { verifyAccessToken } = await import('../utils/jwt.js');

const TEST_PORT = '5002';
const BASE_URL = `http://localhost:${TEST_PORT}/api`;
const TEST_PASSWORD = 'password123';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getAuthAndUserId(email: string) {
  // רישום
  await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });

  // התחברות
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });

  const setCookies = loginRes.headers.getSetCookie();
  let cookieHeader = '';
  let token = '';
  for (const cookie of setCookies) {
    if (cookie.startsWith('accessToken=')) {
      cookieHeader = cookie.split(';')[0];
      token = cookieHeader.split('=')[1];
    }
  }

  // פענוח ה-userId מתוך הטוקן
  const decoded = verifyAccessToken(token);
  return { cookie: cookieHeader, userId: decoded.userId };
}

async function runTests() {
  let serverProcess: any;
  let exitCode = 0;

  try {
    console.log('--- Starting Rate Limit Tiers Simulation ---');
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

    // יצירת איש קשר גלובלי לצורך חשיפה
    const userAuth = await getAuthAndUserId('contact-creator@kaneger.com');
    const createContactRes = await fetch(`${BASE_URL}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userAuth.cookie,
      },
      body: JSON.stringify({
        name: 'משה לוי',
        phone: '052-1234567',
        email: 'moshe@example.com',
      }),
    });
    const createContactData = await createContactRes.json() as any;
    const contactId = createContactData.data._id;
    console.log(`📝 Seeded contact for testing: ID = ${contactId}`);

    console.log('\n--- Simulation 1: Tier 1 (10 reveals / 5 min) ---');
    const userTier1 = await getAuthAndUserId('tier1@kaneger.com');
    
    // זריעת 10 לוגים לפני דקה אחת
    console.log('🌱 Seeding 10 reveal logs 1 minute ago...');
    const seedTier1Res = await fetch(`${BASE_URL}/test/seed-reveal-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userTier1.userId,
        count: 10,
        ageMs: 1 * 60 * 1000, // 1 minute ago
      }),
    });
    const seedTier1Data = await seedTier1Res.json() as any;
    console.log(`Seeded: ${seedTier1Data.seeded} logs.`);

    // קריאה לנתיב החשיפה
    console.log('🔍 Requesting reveal for Tier 1...');
    const revealTier1Res = await fetch(`${BASE_URL}/contacts/${contactId}/reveal`, {
      headers: { 'Cookie': userTier1.cookie },
    });
    const revealTier1Data = await revealTier1Res.json() as any;
    console.log(`Response Status: ${revealTier1Res.status}`);
    console.log(`Response Message: "${revealTier1Data.message}"`);
    
    if (revealTier1Res.status !== 429 || !revealTier1Data.message.includes('הגעת למגבלת הגילויים. נסה שוב בעוד 4 דקות')) {
      throw new Error(`Tier 1 rate limiting failed: expected 429 and "בעוד 4 דקות", got: Status ${revealTier1Res.status}, Message: "${revealTier1Data.message}"`);
    }
    console.log('✅ Tier 1 Simulation Passed successfully!');


    console.log('\n--- Simulation 2: Tier 2 (30 reveals / 1 hour) ---');
    const userTier2 = await getAuthAndUserId('tier2@kaneger.com');
    
    // זריעת 30 לוגים לפני 15 דקות
    console.log('🌱 Seeding 30 reveal logs 15 minutes ago...');
    const seedTier2Res = await fetch(`${BASE_URL}/test/seed-reveal-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userTier2.userId,
        count: 30,
        ageMs: 15 * 60 * 1000, // 15 minutes ago
      }),
    });
    const seedTier2Data = await seedTier2Res.json() as any;
    console.log(`Seeded: ${seedTier2Data.seeded} logs.`);

    // קריאה לנתיב החשיפה
    console.log('🔍 Requesting reveal for Tier 2...');
    const revealTier2Res = await fetch(`${BASE_URL}/contacts/${contactId}/reveal`, {
      headers: { 'Cookie': userTier2.cookie },
    });
    const revealTier2Data = await revealTier2Res.json() as any;
    console.log(`Response Status: ${revealTier2Res.status}`);
    console.log(`Response Message: "${revealTier2Data.message}"`);
    
    if (revealTier2Res.status !== 429 || !revealTier2Data.message.includes('הגעת למגבלת הגילויים. נסה שוב בעוד 45 דקות')) {
      throw new Error(`Tier 2 rate limiting failed: expected 429 and "בעוד 45 דקות", got: Status ${revealTier2Res.status}, Message: "${revealTier2Data.message}"`);
    }
    console.log('✅ Tier 2 Simulation Passed successfully!');


    console.log('\n--- Simulation 3: Tier 3 (100 reveals / 24 hours) ---');
    const userTier3 = await getAuthAndUserId('tier3@kaneger.com');
    
    // זריעת 100 לוגים לפני 4 שעות
    console.log('🌱 Seeding 100 reveal logs 4 hours ago...');
    const seedTier3Res = await fetch(`${BASE_URL}/test/seed-reveal-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userTier3.userId,
        count: 100,
        ageMs: 4 * 60 * 60 * 1000, // 4 hours ago
      }),
    });
    const seedTier3Data = await seedTier3Res.json() as any;
    console.log(`Seeded: ${seedTier3Data.seeded} logs.`);

    // קריאה לנתיב החשיפה
    console.log('🔍 Requesting reveal for Tier 3...');
    const revealTier3Res = await fetch(`${BASE_URL}/contacts/${contactId}/reveal`, {
      headers: { 'Cookie': userTier3.cookie },
    });
    const revealTier3Data = await revealTier3Res.json() as any;
    console.log(`Response Status: ${revealTier3Res.status}`);
    console.log(`Response Message: "${revealTier3Data.message}"`);
    
    if (revealTier3Res.status !== 429 || !revealTier3Data.message.includes('הגעת למגבלת הגילויים. נסה שוב בעוד 1200 דקות')) {
      throw new Error(`Tier 3 rate limiting failed: expected 429 and "בעוד 1200 דקות", got: Status ${revealTier3Res.status}, Message: "${revealTier3Data.message}"`);
    }
    console.log('✅ Tier 3 Simulation Passed successfully!');

    console.log('\n🌟 ALL 3 RATE LIMITING TIERS SIMULATIONS PASSED SUCCESSFULLY! 🌟');
  } catch (error: any) {
    console.error('\n❌ Simulation execution failed:', error.message);
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
