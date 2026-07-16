import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { getReports, dismissReport, toggleUserBan, updateContactName, updateContactPhone, updateContactEmail } from '../controllers/admin.controller.js';
import { deleteContact } from '../controllers/contact.controller.js';

const router = Router();

// סכמת אימות לחסימת משתמש
const banUserSchema = z.object({
  isBanned: z.boolean({ required_error: 'חובה לציין את מצב החסימה' }),
});

// סכמת אימות לעדכון שם איש קשר
const updateNameSchema = z.object({
  name: z.string().trim().min(2, 'שם חייב להכיל לפחות 2 תווים'),
});

// סכמת אימות לעדכון מספר טלפון
const updatePhoneSchema = z.object({
  phone: z.string().trim().regex(/^05\d-?\d{7}$/, 'מספר טלפון לא חוקי'),
});

// סכמת אימות לעדכון מייל
const updateEmailSchema = z.object({
  email: z.string().trim().email('כתובת אימייל לא חוקית').optional().or(z.literal('')),
});

// נתיב לקבלת רשימת הדיווחים המלאה (מנהל בלבד, מוגן JWT)
router.get('/reports', requireAuth, requireAdmin, getReports);

// נתיב לסגירת/ביטול דיווח (מנהל בלבד, מוגן JWT)
router.post('/reports/:id/dismiss', requireAuth, requireAdmin, dismissReport);

// נתיב לחסימה/ביטול חסימה של משתמש (מנהל בלבד, מוגן JWT)
router.patch('/users/:id/ban', requireAuth, requireAdmin, validateRequest({ body: banUserSchema }), toggleUserBan);

// נתיב לעדכון שם איש קשר (מנהל בלבד, מוגן JWT)
router.patch('/contacts/:id/name', requireAuth, requireAdmin, validateRequest({ body: updateNameSchema }), updateContactName);

// נתיב לעדכון מספר טלפון (מנהל בלבד, מוגן JWT)
router.patch('/contacts/:id/phone', requireAuth, requireAdmin, validateRequest({ body: updatePhoneSchema }), updateContactPhone);

// נתיב לעדכון מייל (מנהל בלבד, מוגן JWT)
router.patch('/contacts/:id/email', requireAuth, requireAdmin, validateRequest({ body: updateEmailSchema }), updateContactEmail);

// נתיב למחיקת איש קשר (מנהל בלבד, מוגן JWT)
router.delete('/contacts/:id', requireAuth, requireAdmin, deleteContact);

export default router;
