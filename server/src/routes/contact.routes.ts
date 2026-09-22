import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { createContactSchema, createReportSchema, mongoIdParamSchema, contactsQuerySchema } from 'shared';
import { validateRequest } from '../middlewares/validateRequest.js';
import { checkRevealRateLimit, checkContactCreationRateLimit } from '../middlewares/rateLimiter.js';
import { getContacts, createContact, deleteContact, revealContact, reportContact } from '../controllers/contact.controller.js';

const router = Router();

// נתיב לקבלת רשימת אנשי קשר (שמות ו-IDs בלבד, מוגן JWT וולידציית query)
router.get('/', requireAuth, validateRequest({ query: contactsQuerySchema }), getContacts);

// נתיב להוספת איש קשר חדש (משתמש מחובר, מוגן JWT, ולידציית Zod והגבלת קצב הוספה)
router.post('/', requireAuth, validateRequest({ body: createContactSchema }), checkContactCreationRateLimit, createContact);

// נתיב לחשיפת פרטי קשר (טלפון ומייל, מוגן JWT, ולידציית מזהה Zod ו-Rate Limiting)
router.get('/:id/reveal', requireAuth, validateRequest({ params: mongoIdParamSchema }), checkRevealRateLimit, revealContact);

// נתיב לשליחת דיווח על איש קשר (משתמש מחובר, מוגן JWT, ולידציית מזהה וגוף דיווח ב-Zod)
router.post('/:id/report', requireAuth, validateRequest({ params: mongoIdParamSchema, body: createReportSchema }), reportContact);

// נתיב למחיקת איש קשר (מנהל בלבד, מוגן JWT וולידציית מזהה ב-Zod)
router.delete('/:id', requireAuth, requireAdmin, validateRequest({ params: mongoIdParamSchema }), deleteContact);

export default router;
