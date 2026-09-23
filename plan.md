# תכנית עבודה — אלפון הישיבה (v1.2)
> מבוסס על מסמך אפיון פונקציונלי גרסה 1.2 | עדכון: 25.6.2026

---

## שלב 0 — הכנת סביבת עבודה

- [x] **0.1** יצירת תיקיית מונורפו עם מבנה `/client`, `/server`, `/packages/shared`
- [x] **0.2** אתחול `package.json` ראשי עם `workspaces`
- [x] **0.3** התקנת Biome והגדרת `biome.json` (לinting ו-formatting)
- [x] **0.4** הגדרת `tsconfig.json` בסיסי לכל חבילה (base, client, server)
- [x] **0.5** יצירת `.gitignore` מקיף (node_modules, dist, .env)
- [x] **0.6** הגדרת משתני סביבה: יצירת `.env.example` עם כל המשתנים הנדרשים
- [x] **0.7** הגדרת `.env` מקומי לפיתוח (MONGO_URI, JWT_SECRET, GOOGLE_CLIENT_ID, וכו׳)

---

## שלב 1 — מסד נתונים וסכמות Mongoose

- [x] **1.1** חיבור ל-MongoDB Atlas Free Tier — הגדרת connection string ובדיקת חיבור
- [x] **1.2** יצירת סכמת `User` עם כל השדות: email, passwordHash, googleId, role (enum), isBanned, createdAt
- [x] **1.3** יצירת סכמת `Contact` עם כל השדות: name, phone, email, reportCount, reportedBy, createdBy, createdAt/updatedAt
- [x] **1.4** יצירת סכמת `Report` עם שדות: contactId, reportedBy, reason (enum), suggestedCorrection, freeTextComment, createdAt
- [x] **1.5** יצירת סכמת `RevealLog` עם שדות: userId, contactId, timestamp (מוגדר עם TTL למחיקה אוטומטית לאחר 30 יום)
- [x] **1.6** הוספת indexes מתאימים (email unique על User, contactId על RevealLog לביצועי Rate Limit)
- [x] **1.7** כתיבת seed script להכנסת נתוני דמו לפיתוח

---

## שלב 2 — Zod Schemas ו-Shared Types

- [x] **2.1** הגדרת Zod schemas ל-`User` (register, login)
- [x] **2.2** הגדרת Zod schemas ל-`Contact` (create, update fields — name/phone/email בנפרד)
- [x] **2.3** הגדרת Zod schema ל-`Report` כולל enum של 4 הסיבות
- [x] **2.4** הגדרת Zod schema לתגובות API (response types)
- [x] **2.5** ייצוא טיפוסי TypeScript מוסקים מ-Zod לשימוש משותף client/server
- [x] **2.6** הגדרת middleware של `validateRequest` בשרת שמשתמש ב-Zod

---

## שלב 3 — Authentication Backend

- [x] **3.1** הגדרת אסטרטגיית JWT: Access Token (1h) + Refresh Token (30d) ב-httpOnly Cookie
- [x] **3.2** `POST /api/auth/register` — הרשמה עם bcrypt לסיסמה
- [x] **3.3** `POST /api/auth/login` — התחברות, בדיקת isBanned, החזרת tokens
- [x] **3.4** `POST /api/auth/logout` — מחיקת cookies
- [x] **3.5** Middleware לאימות JWT על נקודות קצה מוגנות
- [x] **3.6** Route לרענון Access Token באמצעות Refresh Token
- [x] **3.7** Google OAuth 2.0 — הגדרת credentials ב-Google Console
- [x] **3.8** `GET /api/auth/google` — הפניה ל-Google OAuth
- [x] **3.9** `GET /api/auth/google/callback` — קבלת קוד, יצירת/עדכון משתמש, החזרת tokens
- [x] **3.10** בדיקה: רישום, התחברות, login עם Google, logout — תרחישים מלאים

---

## שלב 4 — Contacts Backend

- [x] **4.1** `GET /api/contacts` — החזרת רשימת כל אנשי הקשר (שמות ו-IDs בלבד, ללא טלפון/מייל), מוגן JWT
- [x] **4.2** `POST /api/contacts` — הוספת איש קשר חדש (משתמש מחובר), עם validation Zod
- [x] **4.3** `DELETE /api/contacts/:id` — מחיקת איש קשר (admin בלבד)
- [x] **4.4** בדיקה: ודא שטלפון ומייל לא נחשפים ב-GET /api/contacts בשום מקרה

---

## שלב 5 — Rate Limiting ו-Reveal Endpoint

- [x] **5.1** בחירה והתקנת חבילת Rate Limiting (כגון `express-rate-limit` + Redis או MongoDB store)
- [x] **5.2** הגדרת 3 שכבות Rate Limit per user: 10/5min, 30/hour, 100/day
- [x] **5.3** `GET /api/contacts/:id/reveal` — בדיקת rate limit, אימות JWT, החזרת טלפון ומייל (בהתאם להערה)
- [x] **5.4** שמירת `RevealLog` לאחר כל חשיפה מוצלחת (userId, contactId, timestamp)
- [x] **5.5** החזרת שגיאת 429 עם הודעה עברית בפורמט: "הגעת למגבלת הגילויים. נסה שוב בעוד X דקות"
- [x] **5.6** בדיקה: סימולציה של חריגת rate limit בכל אחת מ-3 השכבות

---

## שלב 6 — Reports Backend

- [x] **6.1** `POST /api/contacts/:id/report` — שליחת דיווח עם reason (enum), suggestedCorrection (אופציונלי), freeTextComment (אופציונלי)
- [x] **6.2** Validation: וידוא שהמשתמש לא דיווח כבר על אותו איש קשר (בדיקת reportedBy)
- [x] **6.3** עדכון `reportCount` ו-`reportedBy` על ה-Contact לאחר דיווח
- [x] **6.4** בדיקה: תרחיש דיווח כפול — ודא שמוחזרת שגיאה מתאימה

---

## שלב 7 — Admin Endpoints Backend

- [x] **7.1** Middleware לאימות תפקיד admin
- [x] **7.2** `GET /api/admin/reports` — רשימת דיווחים פתוחים מלאים (כולל suggestedCorrection ו-freeTextComment)
- [x] **7.3** `POST /api/admin/reports/:id/dismiss` — סגירת דיווח
- [x] **7.4** `PATCH /api/admin/users/:id/ban` — חסימה/ביטול חסימה של משתמש
- [x] **7.5** `PATCH /api/admin/contacts/:id/name` — עדכון שם איש קשר
- [x] **7.6** `PATCH /api/admin/contacts/:id/phone` — עדכון מספר טלפון
- [x] **7.7** `PATCH /api/admin/contacts/:id/email` — עדכון מייל
- [x] **7.8** בדיקה: ודא שמשתמש רגיל לא יכול לגשת לאף endpoint של admin

---

## שלב 8 — Frontend: הכנה ותשתית

- [x] **8.1** אתחול פרויקט React + TypeScript עם Vite
- [x] **8.2** התקנת MUI והגדרת Theme עם RTL, עברית, ו-`styled()` בלבד (ללא sx prop)
- [x] **8.3** הגדרת RTL עם `CacheProvider` ו-`createCache` של emotion
- [x] **8.4** הגדרת React Router עם Protected Routes (הפניה ל-Login אם לא מחובר)
- [x] **8.5** הגדרת axios instance מרכזי עם interceptors (צירוף טוקן, טיפול בשגיאות 401)
- [x] **8.6** הגדרת Context / Zustand לניהול מצב authentication
- [x] **8.7** הגדרת Context לניהול רשימת אנשי קשר (cache בפרונטנד)

---

## שלב 9 — Frontend: עמודי Auth

- [x] **9.1** עמוד Register — טופס עם validation (Zod client-side), שדות: email, password
- [x] **9.2** עמוד Login — טופס עם שדות email/password
- [x] **9.3** כפתור "התחבר עם Google" בעמוד Login
- [x] **9.4** הפניה אוטומטית לאחר התחברות מוצלחת לעמוד הבית
- [x] **9.5** הפניה אוטומטית של אורח לעמוד Login בניסיון גישה לנתיב מוגן
- [x] **9.6** כפתור Logout בנווט עם ניקוי state מקומי

---

## שלב 10 — Frontend: עמוד הבית (רשימת אנשי קשר)

- [x] **10.1** שליפת רשימת אנשי קשר (שמות + IDs) עם הטוקן בעת טעינה ראשונה
- [x] **10.2** הצגת רשימה עם שם + כפתור "גלה מספר" לצד כל שם
- [x] **10.3** אינדיקטור ויזואלי (אייקון אזהרה) לאנשי קשר עם דיווחים פתוחים
- [x] **10.4** תיבת חיפוש עם Debounce של 300ms — חיפוש מקומי על המערך
- [x] **10.5** Pagination בפרונטנד — ברירת מחדל 20 אנשי קשר לעמוד
- [x] **10.6** כפתור "הוסף איש קשר" — פתיחת Dialog עם טופס הוספה

---

## שלב 11 — Frontend: כרטיס איש קשר (Overlay / Bottom Drawer)

- [x] **11.1** בלחיצה על "גלה מספר" — שליחת בקשה ל-`/api/contacts/:id/reveal`
- [x] **11.2** פתיחת Overlay (דסקטופ) או Bottom Drawer (מובייל) עם המידע שהתקבל
- [x] **11.3** הצגת שם מלא ומספר טלפון שנחשף
- [x] **11.4** הצגת מייל אם קיים (עם כפתור mailto)
- [x] **11.5** כפתורי פעולה מהירים: חיוג (`tel:`), וואטסאפ (`wa.me`), מייל (`mailto:`)
- [x] **11.6** טיפול בשגיאת 429 — הצגת הודעה עברית עם הזמן שנותר
- [x] **11.7** כפתור "דווח על בעיה" — מושבת ומציג "דווחת" אם המשתמש דיווח כבר

---

## שלב 12 — Frontend: מנגנון דיווח

- [x] **12.1** Dialog של דיווח עם 4 Radio Buttons: "מספר לא נכון", "איש קשר לא קיים", "שם לא נכון", "מייל לא נכון"
- [x] **12.2** שדה טקסט דינמי לפי הסיבה שנבחרה (placeholder מתאים לכל סיבה)
- [x] **12.3** שדה טקסט חופשי קבוע "הערות נוספות / פירוט חופשי" (מופיע בכל בחירה)
- [x] **12.4** שליחת הדיווח ל-`POST /api/contacts/:id/report`
- [x] **12.5** עדכון מצב מקומי לאחר דיווח מוצלח (השבתת כפתור + הצגת "דווחת")

---

## שלב 13 — Frontend: דשבורד Admin

- [x] **13.1** נתיב מוגן `/admin` — נגיש לתפקיד admin בלבד
- [x] **13.2** טאב / עמוד "דיווחים פתוחים" — רשימת כל הדיווחים עם פרטים מלאים
- [x] **13.3** כרטיס דיווח: הצגת reason, suggestedCorrection, freeTextComment
- [x] **13.4** כפתור "סגור דיווח" על כל כרטיס דיווח
- [x] **13.5** כפתורי עריכה ישירה מתוך כרטיס הדיווח: עדכון שם / טלפון / מייל
- [x] **13.6** טאב / עמוד "ניהול משתמשים" — רשימת משתמשים עם אפשרות חסימה/ביטול חסימה
- [x] **13.7** Confirmation dialog לפני כל פעולה הרסנית (מחיקה, חסימה)

---

## שלב 14 — אבטחה ו-Hardening

- [x] **14.1** בדיקה מלאה: אורח לא מקבל שום מידע — כולל שמות
- [x] **14.2** בדיקה: `GET /api/contacts` לא מחזיר שדות phone/email בשום תרחיש
- [x] **14.3** הוספת `helmet` לשרת להגנות HTTP headers
- [x] **14.4** הגדרת CORS לדומיין הספציפי בלבד (לא `*`)
- [x] **14.5** Validation עם Zod בצד שרת על כל input לפני גישה למסד נתונים
- [x] **14.6** בדיקת SQL/NoSQL injection (sanitization על שדות חיפוש)
- [x] **14.7** ודא ש-Refresh Token מבוטל בעת logout

---

## שלב 15 — בדיקות

- [x] **15.1** בדיקות integration לנקודות קצה של Auth (register, login, logout, refresh)
- [x] **15.2** בדיקות integration ל-`/api/contacts` (חסימת אורחים, תוכן תגובה)
- [x] **15.3** בדיקות integration ל-`/api/contacts/:id/reveal` (rate limit, JWT)
- [x] **15.4** בדיקות integration ל-`/api/contacts/:id/report` (דיווח כפול)
- [x] **15.5** בדיקות יחידה לפונקציות Rate Limiting
- [x] **15.6** בדיקות יחידה ל-Zod schemas
- [x] **15.7** בדיקות frontend: זרימת Login מקצה לקצה (Cypress / Playwright)
- [x] **15.8** בדיקת נגישות RTL על כל העמודים

---

## שלב 16 — Deploy

- [x] **16.1** הגדרת MongoDB Atlas — whitelist IP, יצירת DB user (חובר בהצלחה ל-Cluster0 ב-Atlas)
- [x] **16.2** Deploy שרת (Render / Railway / Fly.io) עם משתני סביבה (נפרס בהצלחה ב-Render: https://truekaneger.onrender.com)
- [ ] **16.3** Deploy פרונטנד (Vercel / Netlify) עם `VITE_API_URL`
- [ ] **16.4** עדכון Google OAuth Callback URL ל-URL הייצור
- [ ] **16.5** בדיקת smoke test בסביבת ייצור: register, login, reveal, report
- [ ] **16.6** הגדרת HTTPS ווידוא שה-httpOnly cookies עובדים בסביבת ייצור (Secure flag)

---

## סדר עדיפויות מומלץ לספרינטים

| ספרינט | שלבים | מה מתקבל |
|--------|--------|----------|
| 1 | 0, 1, 2 | תשתית, DB, types |
| 2 | 3, 4 | Auth מלא + contacts API בסיסי |
| 3 | 5, 6 | Reveal + Rate Limit + Reports |
| 4 | 7 | Admin endpoints |
| 5 | 8, 9, 10 | Frontend: תשתית + Auth + רשימה |
| 6 | 11, 12 | כרטיס איש קשר + דיווח |
| 7 | 13, 14 | דשבורד Admin + Hardening |
| 8 | 15, 16 | בדיקות + Deploy |
