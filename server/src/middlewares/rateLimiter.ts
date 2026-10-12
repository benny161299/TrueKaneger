import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.js';
import { RevealLog } from '../models/RevealLog.js';
import { Contact } from '../models/Contact.js';
import { PendingContact } from '../models/PendingContact.js';

export const CONTACT_CREATION_LIMITS = {
  WINDOW_5M: { windowMs: 5 * 60 * 1000, maxContacts: 5, label: '5 דקות' },
  WINDOW_1H: { windowMs: 60 * 60 * 1000, maxContacts: 20, label: 'שעה' },
} as const;

export const formatContactRateLimitMessage = (waitTimeMinutes: number): string => {
  return `הגעת למגבלת הוספת אנשי קשר. נסה שוב בעוד ${waitTimeMinutes} דקות`;
};

export const RATE_LIMIT_TIERS = {
  TIER_5M: { windowMs: 5 * 60 * 1000, maxReveals: 10, label: '5 דקות' },
  TIER_1H: { windowMs: 60 * 60 * 1000, maxReveals: 30, label: 'שעה' },
  TIER_24H: { windowMs: 24 * 60 * 60 * 1000, maxReveals: 100, label: '24 שעות' },
} as const;

/**
 * מחשב את מספר הדקות שנותרו להמתנה עד לפקיעת חלון ה-Rate Limit
 */
export const calculateWaitTimeMinutes = (
  oldestLogTimestamp: Date | number,
  windowMs: number,
  currentTimeMs: number = Date.now()
): number => {
  const time = typeof oldestLogTimestamp === 'number' ? oldestLogTimestamp : oldestLogTimestamp.getTime();
  const nextAvailableTime = time + windowMs;
  return Math.max(1, Math.ceil((nextAvailableTime - currentTimeMs) / (60 * 1000)));
};

/**
 * מעצב הודעת שגיאה אחידה וברורה בעברית עבור חריגת קצב חשיפות
 */
export const formatRateLimitMessage = (waitTimeMinutes: number): string => {
  return `הגעת למגבלת הגילויים. נסה שוב בעוד ${waitTimeMinutes} דקות`;
};

/**
 * בדיקת ספים עבור 3 שכבות ה-Rate Limiting
 */
export const checkRateLimitThresholds = (counts: {
  count5m: number;
  count1h: number;
  count1d: number;
}): {
  isExceeded: boolean;
  tier?: '5m' | '1h' | '24h';
  windowMs?: number;
} => {
  if (counts.count5m >= RATE_LIMIT_TIERS.TIER_5M.maxReveals) {
    return { isExceeded: true, tier: '5m', windowMs: RATE_LIMIT_TIERS.TIER_5M.windowMs };
  }
  if (counts.count1h >= RATE_LIMIT_TIERS.TIER_1H.maxReveals) {
    return { isExceeded: true, tier: '1h', windowMs: RATE_LIMIT_TIERS.TIER_1H.windowMs };
  }
  if (counts.count1d >= RATE_LIMIT_TIERS.TIER_24H.maxReveals) {
    return { isExceeded: true, tier: '24h', windowMs: RATE_LIMIT_TIERS.TIER_24H.windowMs };
  }
  return { isExceeded: false };
};

export const checkRevealRateLimit = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'גישה נדחתה. משתמש אינו מחובר',
      });
      return;
    }

    const userId = req.user.userId;
    const now = new Date();

    // הגדרת חלונות הזמן
    const fiveMinAgo = new Date(now.getTime() - RATE_LIMIT_TIERS.TIER_5M.windowMs);
    const oneHourAgo = new Date(now.getTime() - RATE_LIMIT_TIERS.TIER_1H.windowMs);
    const oneDayAgo = new Date(now.getTime() - RATE_LIMIT_TIERS.TIER_24H.windowMs);

    // שליפת כמות החשיפות שבוצעו בכל חלון זמן עבור משתמש זה
    const [count5m, count1h, count1d] = await Promise.all([
      RevealLog.countDocuments({ userId, timestamp: { $gte: fiveMinAgo } }),
      RevealLog.countDocuments({ userId, timestamp: { $gte: oneHourAgo } }),
      RevealLog.countDocuments({ userId, timestamp: { $gte: oneDayAgo } }),
    ]);

    const thresholdCheck = checkRateLimitThresholds({ count5m, count1h, count1d });

    if (thresholdCheck.isExceeded && thresholdCheck.windowMs) {
      // דרגה ראשונה (5 דקות): מציגים למשתמש את זמן ההמתנה בדקות
      if (thresholdCheck.tier === '5m') {
        const windowStart = new Date(now.getTime() - thresholdCheck.windowMs);
        const oldestLog = await RevealLog.findOne({ userId, timestamp: { $gte: windowStart } })
          .sort({ timestamp: 1 });

        if (oldestLog) {
          const waitTimeMinutes = calculateWaitTimeMinutes(oldestLog.timestamp, thresholdCheck.windowMs, now.getTime());
          res.status(429).json({
            success: false,
            message: formatRateLimitMessage(waitTimeMinutes),
            waitTimeMinutes,
          });
          return;
        }
      }

      // דרגות גבוהות (שעה ו-24 שעות): לא חושפים זמן מדויק כדי למנוע תזמון סקריפטים וקצירת מידע
      res.status(429).json({
        success: false,
        message: 'הגעת למגבלת הגילויים. אנא נסה שוב מאוחר יותר',
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const checkContactCreationRateLimit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'גישה נדחתה. משתמש אינו מחובר',
      });
      return;
    }

    // מנהלי מערכת פטורים מהגבלת קצב הוספת אנשי קשר
    if (req.user.role === 'admin') {
      return next();
    }

    const userId = req.user.userId;
    const now = Date.now();

    // 1. בדיקת חלון 5 דקות (דרגה ראשונה — מציגים זמן המתנה)
    const [approved5m, pending5m] = await Promise.all([
      Contact.countDocuments({
        createdBy: userId,
        createdAt: { $gte: new Date(now - CONTACT_CREATION_LIMITS.WINDOW_5M.windowMs) },
      }),
      PendingContact.countDocuments({
        createdBy: userId,
        createdAt: { $gte: new Date(now - CONTACT_CREATION_LIMITS.WINDOW_5M.windowMs) },
      }),
    ]);
    const count5m = approved5m + pending5m;

    if (count5m >= CONTACT_CREATION_LIMITS.WINDOW_5M.maxContacts) {
      const [oldestApproved, oldestPending] = await Promise.all([
        Contact.findOne(
          { createdBy: userId, createdAt: { $gte: new Date(now - CONTACT_CREATION_LIMITS.WINDOW_5M.windowMs) } },
          'createdAt',
          { sort: { createdAt: 1 } }
        ),
        PendingContact.findOne(
          { createdBy: userId, createdAt: { $gte: new Date(now - CONTACT_CREATION_LIMITS.WINDOW_5M.windowMs) } },
          'createdAt',
          { sort: { createdAt: 1 } }
        ),
      ]);

      const candidates = [oldestApproved?.createdAt, oldestPending?.createdAt].filter(Boolean) as (Date | number)[];
      const oldestDate = candidates.length > 0
        ? candidates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0]
        : null;

      const waitMinutes = oldestDate
        ? calculateWaitTimeMinutes(oldestDate, CONTACT_CREATION_LIMITS.WINDOW_5M.windowMs, now)
        : 5;

      res.status(429).json({
        success: false,
        message: formatContactRateLimitMessage(waitMinutes),
      });
      return;
    }

    // 2. בדיקת חלון 1 שעה (דרגה שנייה — הודעה כללית ללא חשיפת תזמון)
    const [approved1h, pending1h] = await Promise.all([
      Contact.countDocuments({
        createdBy: userId,
        createdAt: { $gte: new Date(now - CONTACT_CREATION_LIMITS.WINDOW_1H.windowMs) },
      }),
      PendingContact.countDocuments({
        createdBy: userId,
        createdAt: { $gte: new Date(now - CONTACT_CREATION_LIMITS.WINDOW_1H.windowMs) },
      }),
    ]);
    const count1h = approved1h + pending1h;

    if (count1h >= CONTACT_CREATION_LIMITS.WINDOW_1H.maxContacts) {
      res.status(429).json({
        success: false,
        message: 'הגעת למגבלת הוספת אנשי קשר. אנא נסה שוב מאוחר יותר',
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * מנגנון Rate Limit כללי מבוסס כתובת IP בזיכרון (In-Memory IP Rate Limiter)
 * מתאים לנתיבי אימות (Auth), הרשמה ו-OAuth Callbacks למניעת התקפות מניעת שירות ו-Brute Force
 */
export interface IpRateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

export const createIpRateLimiter = (options: IpRateLimitOptions) => {
  const ipRequests = new Map<string, { count: number; resetTime: number }>();

  // ניקוי תקופתי של רשומות שפג תוקפן כל 2 דקות
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of ipRequests.entries()) {
      if (now > data.resetTime) {
        ipRequests.delete(ip);
      }
    }
  }, Math.min(options.windowMs, 2 * 60 * 1000));

  // מאפשר לסיום התהליך לקרות ללא תלות ב-Timer
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    // זיהוי כתובת IP של הלקוח (תמיכה ב-trust proxy מול Render/Vercel)
    const clientIp = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString();
    const now = Date.now();

    const record = ipRequests.get(clientIp);

    if (!record || now > record.resetTime) {
      ipRequests.set(clientIp, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return next();
    }

    if (record.count >= options.maxRequests) {
      const waitTimeSec = Math.ceil((record.resetTime - now) / 1000);
      res.status(429).json({
        success: false,
        message: options.message || `הגעת למגבלת הבקשות. נסה שוב בעוד ${waitTimeSec} שניות`,
        retryAfter: waitTimeSec,
      });
      return;
    }

    record.count++;
    next();
  };
};

/**
 * הגבלת קצב עבור Google OAuth Callback:
 * עד 10 בקשות לדקה לכתובת IP (מגן מפני הצפת שרתי Google והפצצת קודים מזויפים)
 */
export const googleAuthRateLimiter = createIpRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'יותר מדי ניסיונות אימות Google. נסה שוב בעוד דקה',
});

/**
 * הגבלת קצב עבור Login ו-Register:
 * עד 15 בקשות לדקה לכתובת IP (מגן מפני Brute Force וניסיונות ניחוש סיסמה)
 */
export const authRateLimiter = createIpRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15,
  message: 'יותר מדי ניסיונות כניסה/הרשמה. נסה שוב בעוד דקה',
});

