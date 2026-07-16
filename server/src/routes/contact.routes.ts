import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { createContactSchema, createReportSchema } from 'shared';
import { validateRequest } from '../middlewares/validateRequest.js';
import { checkRevealRateLimit } from '../middlewares/rateLimiter.js';
import { getContacts, createContact, deleteContact, revealContact, reportContact } from '../controllers/contact.controller.js';

const router = Router();

// נתיב לקבלת רשימת אנשי קשר (שמות ו-IDs בלבד, מוגן JWT)
router.get('/', requireAuth, getContacts);

// נתיב להוספת איש קשר חדש (משתמש מחובר, מוגן JWT וולידציית Zod)
router.post('/', requireAuth, validateRequest({ body: createContactSchema }), createContact);

// נתיב לחשיפת פרטי קשר (טלפון ומייל, מוגן JWT ו-Rate Limiting)
router.get('/:id/reveal', requireAuth, checkRevealRateLimit, revealContact);

// נתיב לשליחת דיווח על איש קשר (משתמש מחובר, מוגן JWT וולידציית Zod)
router.post('/:id/report', requireAuth, validateRequest({ body: createReportSchema }), reportContact);

// נתיב למחיקת איש קשר (מנהל בלבד, מוגן JWT)
router.delete('/:id', requireAuth, requireAdmin, deleteContact);

export default router;
