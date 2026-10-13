import { Router } from 'express';
import { requireAuth, requireAdmin, requireApprovedUser } from '../middlewares/auth.js';
import { createContactSchema, createReportSchema, mongoIdParamSchema, contactsQuerySchema } from 'shared';
import { validateRequest } from '../middlewares/validateRequest.js';
import { checkRevealRateLimit, checkContactCreationRateLimit } from '../middlewares/rateLimiter.js';
import { getContacts, createContact, deleteContact, revealContact, reportContact } from '../controllers/contact.controller.js';

const router = Router();

// נתיב לקבלת רשימת אנשי קשר (שמות ו-IDs בלבד, מוגן JWT, אישור משתמש וולידציית query)
router.get('/', requireAuth, requireApprovedUser, validateRequest({ query: contactsQuerySchema }), getContacts);

// נתיב להוספת איש קשר חדש (משתמש מחובר ומאושר, מוגן JWT, ולידציית Zod והגבלת קצב הוספה)
router.post('/', requireAuth, requireApprovedUser, validateRequest({ body: createContactSchema }), checkContactCreationRateLimit, createContact);

// נתיב לחשיפת פרטי קשר (טלפון ומייל, מוגן JWT, אישור משתמש, ולידציית מזהה Zod ו-Rate Limiting)
router.get('/:id/reveal', requireAuth, requireApprovedUser, validateRequest({ params: mongoIdParamSchema }), checkRevealRateLimit, revealContact);

// נתיב לשליחת דיווח על איש קשר (משתמש מחובר ומאושר, מוגן JWT, ולידציית מזהה וגוף דיווח ב-Zod)
router.post('/:id/report', requireAuth, requireApprovedUser, validateRequest({ params: mongoIdParamSchema, body: createReportSchema }), reportContact);

// נתיב למחיקת איש קשר (מנהל בלבד, מוגן JWT וולידציית מזהה ב-Zod)
router.delete('/:id', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema }), deleteContact);

export default router;
