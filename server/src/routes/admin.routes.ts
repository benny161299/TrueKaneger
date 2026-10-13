import { Router } from 'express';
import { z } from 'zod';
import {
  mongoIdParamSchema,
  banUserSchema,
  updateContactNameSchema as updateNameSchema,
  updateContactPhoneSchema as updatePhoneSchema,
  updateContactEmailSchema as updateEmailSchema,
  updateContactFullSchema,
} from 'shared';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  getReports,
  dismissReport,
  toggleUserBan,
  getUsers,
  updateContactName,
  updateContactPhone,
  updateContactEmail,
  updateContactFull,
  getPendingContacts,
  approveContact,
  rejectContact,
  getPendingUsers,
  approveUser,
  rejectUser,
} from '../controllers/admin.controller.js';
import { deleteContact } from '../controllers/contact.controller.js';

const router = Router();

// נתיב לקבלת רשימת הדיווחים המלאה (מנהל בלבד, מוגן JWT)
router.get('/reports', requireAuth, requireAdmin, getReports);

// נתיב לסגירת/ביטול דיווח (מנהל בלבד, מוגן JWT, ולידציית מזהה Zod)
router.post('/reports/:id/dismiss', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema }), dismissReport);

// נתיב לקבלת רשימת כל המשתמשים (מנהל בלבד, מוגן JWT)
router.get('/users', requireAuth, requireAdmin, getUsers);

// נתיב לשליפת רשימת משתמשים ממתינים לאישור (מנהל בלבד, מוגן JWT)
router.get('/pending-users', requireAuth, requireAdmin, getPendingUsers);

// נתיב לאישור משתמש (מנהל בלבד, מוגן JWT)
router.patch('/users/:id/approve', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema }), approveUser);

// נתיב לדחיית משתמש (מנהל בלבד, מוגן JWT)
router.patch('/users/:id/reject', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema }), rejectUser);

// נתיב לחסימה/ביטול חסימה של משתמש (מנהל בלבד, מוגן JWT, ולידציית מזהה וגוף ב-Zod)
router.patch('/users/:id/ban', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema, body: banUserSchema }), toggleUserBan);

// נתיב לעדכון שם איש קשר (מנהל בלבד, מוגן JWT, ולידציית מזהה וגוף ב-Zod)
router.patch('/contacts/:id/name', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema, body: updateNameSchema }), updateContactName);

// נתיב לעדכון מספר טלפון (מנהל בלבד, מוגן JWT, ולידציית מזהה וגוף ב-Zod)
router.patch('/contacts/:id/phone', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema, body: updatePhoneSchema }), updateContactPhone);

// נתיב לעדכון מייל (מנהל בלבד, מוגן JWT, ולידציית מזהה וגוף ב-Zod)
router.patch('/contacts/:id/email', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema, body: updateEmailSchema }), updateContactEmail);

// נתיב לעדכון מלא של כל פרטי איש הקשר ואפשרות לסגירת דיווח (מנהל בלבד, מוגן JWT, ולידציית מזהה וגוף ב-Zod)
router.put('/contacts/:id', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema, body: updateContactFullSchema }), updateContactFull);
router.patch('/contacts/:id', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema, body: updateContactFullSchema }), updateContactFull);

// נתיב למחיקת איש קשר (מנהל בלבד, מוגן JWT, ולידציית מזהה ב-Zod)
router.delete('/contacts/:id', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema }), deleteContact);

// --- Pending Contacts ---

// שליפת כל אנשי הקשר הממתינים לאישור
router.get('/pending-contacts', requireAuth, requireAdmin, getPendingContacts);

// אישור איש קשר ממתין
router.post('/pending-contacts/:id/approve', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema }), approveContact);

// דחיית איש קשר ממתין
router.delete('/pending-contacts/:id/reject', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema }), rejectContact);

export default router;
