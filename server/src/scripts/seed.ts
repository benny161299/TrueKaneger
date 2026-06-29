import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// פתרון עבור __dirname בסביבת ES Modules (type: "module")
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// טעינת משתני הסביבה מקובץ ה-env. של השרת
dotenv.config({ path: path.join(__dirname, '../../.env') });

// תוקנו הייבואים עם סיומת .js בהתאם להגדרות ה-NodeNext שלך
import { User } from '../models/User.js';
import { Contact } from '../models/Contact.js';
import { Report, ReportReason } from '../models/Report.js';
import { RevealLog } from '../models/RevealLog.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/truekaneger';

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully.');

    console.log('Clearing existing data from all collections...');
    // המחיקה מבוצעת בסדר נכון כדי למנוע בעיות של שלמות נתונים
    await RevealLog.deleteMany({});
    await Report.deleteMany({});
    await Contact.deleteMany({});
    await User.deleteMany({});

    console.log('Inserting mock data...');

    // 1. יצירת משתמשי דמו (כולל האדמין והיוזר הרגיל לבדיקות)
    const adminUser = await User.create({
      email: 'admin@kaneger.com',
      passwordHash: 'hashed_password_placeholder', // בשלב 3.2 תחליף את זה ב-Hash אמיתי של bcrypt
      role: 'admin',
    });

    const regularUser = await User.create({
      email: 'user@kaneger.com',
      passwordHash: 'hashed_password_placeholder',
      role: 'user',
    });

    // 2. יצירת אנשי קשר (שיוך המשתמשים שיצרנו כיוצרים)
    const contact1 = await Contact.create({
      name: 'ישראל ישראלי',
      phone: '050-1234567',
      email: 'israel@example.com',
      createdBy: adminUser._id,
      reportCount: 0,
      reportedBy: [],
    });

    const contact2 = await Contact.create({
      name: 'משה כהן',
      phone: '052-9876543',
      createdBy: regularUser._id,
      reportCount: 1,
      reportedBy: [regularUser._id],
    });

    // 3. יצירת דיווח דמו על איש קשר
    await Report.create({
      contactId: contact2._id,
      reportedBy: regularUser._id,
      reason: ReportReason.WRONG_NUMBER,
      suggestedCorrection: '052-1111111',
      freeTextComment: 'המספר הזה שייך למישהו אחר',
    });

    // 4. יצירת תיעוד חשיפת מספר (Reveal Log)
    await RevealLog.create({
      userId: regularUser._id,
      contactId: contact1._id,
    });

    console.log('Database seeded successfully with initial data!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    // התנתקות מסודרת ממסד הנתונים בסיום הפעולה (בין אם הצליח ובין אם נכשל)
    console.log('Disconnecting from MongoDB...');
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedDatabase();