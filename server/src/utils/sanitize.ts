import type { Request, Response, NextFunction } from 'express';

/**
 * מנקה ומבצע Escape לכל תווי ה-Regex המיוחדים
 * מונע מתקפות NoSQL Injection ו-Regular Expression Denial of Service (ReDoS)
 */
export const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * מנקה אובייקטים מקוננים ומסיר מפתחות המתחילים ב-$ (אופרטורים של MongoDB)
 * או מפתחות המכילים נקודה (.) למניעת הזרקת NoSQL
 */
export const sanitizeNoSql = (target: any): any => {
  if (!target || typeof target !== 'object') {
    return target;
  }

  if (Array.isArray(target)) {
    return target.map(sanitizeNoSql);
  }

  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(target)) {
    // שלילת מפתחות המכילים אופרטורים כמו $gt, $where, $regex, $ne
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    cleaned[key] = sanitizeNoSql(target[key]);
  }
  return cleaned;
};

/**
 * Express Middleware להגנה גלובלית מפני NoSQL Injection בכל סוגי הבקשות
 */
export const mongoSanitizeMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeNoSql(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeNoSql(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeNoSql(req.params);
  }
  next();
};
