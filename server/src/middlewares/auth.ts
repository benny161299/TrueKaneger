import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type TokenPayload } from '../utils/jwt.js';

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

