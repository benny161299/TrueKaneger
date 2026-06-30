import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser'; // ⚡ תוספת חובה לקריאת עוגיות בשלבי ה-JWT הבאים
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.routes.js';

// טעינת משתני סביבה
dotenv.config();

// חיבור למסד הנתונים MongoDB Atlas
await connectDB();

const app = express();

// Middlewares מרכזיים להגנה ופענוח בקשות
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(cookieParser()); // ⚡ מפעיל את היכולת לקרוא cookies מהדפדפן

// חיבור הראוטים של ה-Authentication
app.use('/api/auth', authRoutes);

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
