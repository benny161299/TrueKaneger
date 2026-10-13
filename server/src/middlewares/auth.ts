import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type TokenPayload } from '../utils/jwt.js';
import { User } from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // 1. קבלת הטוקן מהעוגיות או מכותרת Authorization (כהגנה משנית ופיתוח קל)
    let token = req.cookies.accessToken;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'גישה נדחתה. לא נמצא אסימון אימות',
      });
      return;
    }

    // 2. אימות הטוקן ושמירת המידע באובייקט הבקשה
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'אסימון האימות אינו תקף או שפג תוקפו',
    });
  }
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'גישה נדחתה. פעולה זו מיועדת למנהלי מערכת בלבד',
    });
    return;
  }
  next();
};

/**
 * מגן על נתיבי האלפון: רק משתמש מאושר (isApproved === true) או מנהל מערכת (role === 'admin')
 * מקבל גישה למידע. משתמשים ממתינים מקבלים 403 USER_NOT_APPROVED
 */
export const requireApprovedUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'גישה נדחתה. לא נמצא אסימון אימות',
      });
      return;
    }

    // 👑 מנהלי מערכת פטורים ומאושרים תמיד
    if (req.user.role === 'admin') {
      return next();
    }

    const user = await User.findById(req.user.userId, 'isApproved approvalStatus isBanned role');
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'המשתמש לא נמצא במערכת',
      });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({
        success: false,
        code: 'USER_BANNED',
        message: 'גישת משתמש זה נחסמה על ידי מנהל המערכת',
      });
      return;
    }

    if (!user.isApproved) {
      res.status(403).json({
        success: false,
        code: 'USER_NOT_APPROVED',
        approvalStatus: user.approvalStatus || 'pending',
        message: 'החשבון ממתין לאישור מנהל המערכת',
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

