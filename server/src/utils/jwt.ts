import jwt from 'jsonwebtoken';
import type { Response } from 'express';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// חסימת אבטחה קריטית: אם המפתחות לא מוגדרים ב-.env, השרת לא יעלה
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error('CRITICAL ERROR: JWT secrets are not defined in environment variables.');
  process.exit(1);
}

export interface TokenPayload {
  userId: string;
  role: 'user' | 'admin';
}

/**
 * Generate Access Token (valid for 1h)
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

/**
 * Generate Refresh Token (valid for 30d)
 * ⬇️ שונה מ-7d ל-30d לבקשתך
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '30d' });
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
};

// --- Cookie Utilities ---

const isProduction = process.env.NODE_ENV === 'production';

export const setTokenCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000, // שעה אחת במילי-שניות
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    // ⬇️ שונה ל-30 יום במילי-שניות (30 יום * 24 שעות * 60 דקות * 60 שניות * 1000 מילי-שניות)
    maxAge: 30 * 24 * 60 * 60 * 1000, 
  });
};

export const clearTokenCookies = (res: Response) => {
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
  });
};