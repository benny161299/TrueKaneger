import { Router } from 'express';
import { registerSchema } from 'shared';
import { validateRequest } from '../middlewares/validateRequest.js';
import { register } from '../controllers/auth.controller.js';

const router = Router();

// הראוט מקושר ל-Middleware של הולידציה שבנינו בשלב 2.6 וללוגיקת הקונטרולר
router.post('/register', validateRequest({ body: registerSchema }), register);

export default router;
