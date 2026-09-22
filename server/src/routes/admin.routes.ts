import { Router } from 'express';
import { z } from 'zod';
import {
  mongoIdParamSchema,
  banUserSchema,
  updateContactNameSchema as updateNameSchema,
  updateContactPhoneSchema as updatePhoneSchema,
  updateContactEmailSchema as updateEmailSchema,
} from 'shared';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { getReports, dismissReport, toggleUserBan, getUsers, updateContactName, updateContactPhone, updateContactEmail } from '../controllers/admin.controller.js';
import { deleteContact } from '../controllers/contact.controller.js';

const router = Router();

// נתיב לקבלת רשימת הדיווחים המלאה (מנהל בלבד, מוגן JWT)
router.get('/reports', requireAuth, requireAdmin, getReports);

// נתיב לסגירת/ביטול דיווח (מנהל בלבד, מוגן JWT, ולידציית מזהה Zod)
router.post('/reports/:id/dismiss', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema }), dismissReport);

// נתיב לקבלת רשימת כל המשתמשים (מנהל בלבד, מוגן JWT)
router.get('/users', requireAuth, requireAdmin, getUsers);

// נתיב לחסימה/ביטול חסימה של משתמש (מנהל בלבד, מוגן JWT, ולידציית מזהה וגוף ב-Zod)
router.patch('/users/:id/ban', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema, body: banUserSchema }), toggleUserBan);

// נתיב לעדכון שם איש קשר (מנהל בלבד, מוגן JWT, ולידציית מזהה וגוף ב-Zod)
router.patch('/contacts/:id/name', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema, body: updateNameSchema }), updateContactName);

// נתיב לעדכון מספר טלפון (מנהל בלבד, מוגן JWT, ולידציית מזהה וגוף ב-Zod)
router.patch('/contacts/:id/phone', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema, body: updatePhoneSchema }), updateContactPhone);

// נתיב לעדכון מייל (מנהל בלבד, מוגן JWT, ולידציית מזהה וגוף ב-Zod)
router.patch('/contacts/:id/email', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema, body: updateEmailSchema }), updateContactEmail);

// נתיב למחיקת איש קשר (מנהל בלבד, מוגן JWT, ולידציית מזהה ב-Zod)
router.delete('/contacts/:id', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema }), deleteContact);

export default router;
