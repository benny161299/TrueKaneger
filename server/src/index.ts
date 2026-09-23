import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser'; // ⚡ תוספת חובה לקריאת עוגיות בשלבי ה-JWT הבאים
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import contactRoutes from './routes/contact.routes.js';
import adminRoutes from './routes/admin.routes.js';


// הפעלת מסד נתונים מדמה במידה והוגדר משתנה סביבה (לצרכי בדיקות בסביבה מנותקת)
if (process.env.MOCK_DB === 'true') {
  const { setupMockDb } = await import('./utils/mockDb.js');
  setupMockDb();
}

// חיבור למסד הנתונים MongoDB Atlas
await connectDB();

const app = express();
app.disable('x-powered-by');

// Middlewares מרכזיים להגנה ופענוח בקשות
app.use(helmet());

// הגדרת CORS מאובטחת לדומיין ספציפי בלבד (ללא wildcard *) עם תמיכה ב-credentials (עוגיות)
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url: string) => url.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // בקשות ללא כותרת Origin (כמו כלי בדיקה פנימיים, Curl או Server-to-Server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
import { mongoSanitizeMiddleware } from './utils/sanitize.js';

app.use(express.json());
app.use(cookieParser()); // ⚡ מפעיל את היכולת לקרוא cookies מהדפדפן
app.use(mongoSanitizeMiddleware); // 🛡️ חיטוי NoSQL Injection גלובלי לכל סוגי הבקשות

// 💓 Ping & Health check endpoints for keep-alive monitoring (UptimeRobot, cron-job.org, Render)
app.get(['/health', '/api/health', '/ping', '/api/ping'], (_req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    service: 'true-kaneger-api'
  });
});

import mongoose from 'mongoose';
import { RevealLog } from './models/RevealLog.js';

// חיבור הראוטים של ה-Authentication
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/admin', adminRoutes);

// נתיב בדיקות מיוחד לזריעת לוגים של חשיפה (מופעל רק במצב MOCK_DB)
if (process.env.MOCK_DB === 'true') {
  app.post('/api/test/seed-reveal-logs', async (req: express.Request, res: express.Response) => {
    try {
      const { userId, count, ageMs } = req.body;
      const logs = [];
      for (let i = 0; i < count; i++) {
        const log = new RevealLog({
          userId: new mongoose.Types.ObjectId(userId),
          contactId: new mongoose.Types.ObjectId(),
          timestamp: new Date(Date.now() - (ageMs || 0)),
        });
        await log.save();
        logs.push(log);
      }
      res.json({ success: true, seeded: logs.length });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

// Error Handling Middleware המרכזי של האפליקציה
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'שגיאת שרת פנימית',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
