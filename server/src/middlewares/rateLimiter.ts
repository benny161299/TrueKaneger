import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.js';
import { RevealLog } from '../models/RevealLog.js';
import { Contact } from '../models/Contact.js';

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

    // 1. בדיקת חלון 5 דקות (חסימת בוטים / סקריפט ספאם מהיר)
    const count5m = await Contact.countDocuments({
      createdBy: userId,
      createdAt: { $gte: new Date(now - CONTACT_CREATION_LIMITS.WINDOW_5M.windowMs) },
    });

    if (count5m >= CONTACT_CREATION_LIMITS.WINDOW_5M.maxContacts) {
      const oldestIn5m = await Contact.findOne(
        { createdBy: userId, createdAt: { $gte: new Date(now - CONTACT_CREATION_LIMITS.WINDOW_5M.windowMs) } },
        'createdAt',
        { sort: { createdAt: 1 } }
      );
      const waitMinutes = oldestIn5m
        ? calculateWaitTimeMinutes(oldestIn5m.createdAt, CONTACT_CREATION_LIMITS.WINDOW_5M.windowMs, now)
        : 5;

      res.status(429).json({
        success: false,
        message: formatContactRateLimitMessage(waitMinutes),
      });
      return;
    }

    // 2. בדיקת חלון 1 שעה (חסימת הצפה איטית מתמשכת)
    const count1h = await Contact.countDocuments({
      createdBy: userId,
      createdAt: { $gte: new Date(now - CONTACT_CREATION_LIMITS.WINDOW_1H.windowMs) },
    });

    if (count1h >= CONTACT_CREATION_LIMITS.WINDOW_1H.maxContacts) {
      const oldestIn1h = await Contact.findOne(
        { createdBy: userId, createdAt: { $gte: new Date(now - CONTACT_CREATION_LIMITS.WINDOW_1H.windowMs) } },
        'createdAt',
        { sort: { createdAt: 1 } }
      );
      const waitMinutes = oldestIn1h
        ? calculateWaitTimeMinutes(oldestIn1h.createdAt, CONTACT_CREATION_LIMITS.WINDOW_1H.windowMs, now)
        : 60;

      res.status(429).json({
        success: false,
        message: formatContactRateLimitMessage(waitMinutes),
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

