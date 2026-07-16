import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.js';
import { RevealLog } from '../models/RevealLog.js';

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
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // שליפת כמות החשיפות שבוצעו בכל חלון זמן עבור משתמש זה
    const [count5m, count1h, count1d] = await Promise.all([
      RevealLog.countDocuments({ userId, timestamp: { $gte: fiveMinAgo } }),
      RevealLog.countDocuments({ userId, timestamp: { $gte: oneHourAgo } }),
      RevealLog.countDocuments({ userId, timestamp: { $gte: oneDayAgo } }),
    ]);

    // 1. בדיקת חריגה של 10 חשיפות ב-5 דקות
    if (count5m >= 10) {
      const oldestLog = await RevealLog.findOne({ userId, timestamp: { $gte: fiveMinAgo } })
        .sort({ timestamp: 1 });
      if (oldestLog) {
        const nextAvailableTime = oldestLog.timestamp.getTime() + 5 * 60 * 1000;
        const waitTimeMinutes = Math.max(1, Math.ceil((nextAvailableTime - Date.now()) / (60 * 1000)));
        res.status(429).json({
          success: false,
          message: `הגעת למגבלת הגילויים. נסה שוב בעוד ${waitTimeMinutes} דקות`,
        });
        return;
      }
    }

    // 2. בדיקת חריגה של 30 חשיפות בשעה
    if (count1h >= 30) {
      const oldestLog = await RevealLog.findOne({ userId, timestamp: { $gte: oneHourAgo } })
        .sort({ timestamp: 1 });
      if (oldestLog) {
        const nextAvailableTime = oldestLog.timestamp.getTime() + 60 * 60 * 1000;
        const waitTimeMinutes = Math.max(1, Math.ceil((nextAvailableTime - Date.now()) / (60 * 1000)));
        res.status(429).json({
          success: false,
          message: `הגעת למגבלת הגילויים. נסה שוב בעוד ${waitTimeMinutes} דקות`,
        });
        return;
      }
    }

    // 3. בדיקת חריגה של 100 חשיפות ביממה (24 שעות)
    if (count1d >= 100) {
      const oldestLog = await RevealLog.findOne({ userId, timestamp: { $gte: oneDayAgo } })
        .sort({ timestamp: 1 });
      if (oldestLog) {
        const nextAvailableTime = oldestLog.timestamp.getTime() + 24 * 60 * 60 * 1000;
        const waitTimeMinutes = Math.max(1, Math.ceil((nextAvailableTime - Date.now()) / (60 * 1000)));
        res.status(429).json({
          success: false,
          message: `הגעת למגבלת הגילויים. נסה שוב בעוד ${waitTimeMinutes} דקות`,
        });
        return;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
