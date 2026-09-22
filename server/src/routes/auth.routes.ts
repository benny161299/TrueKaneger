import { Router } from 'express';
import { registerSchema, loginSchema } from 'shared';
import { validateRequest } from '../middlewares/validateRequest.js';
import { register, login, logout, refresh, googleAuthRedirect, googleAuthCallback, getMe } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// הראוט מקושר ל-Middleware של הולידציה שבנינו בשלב 2.6 וללוגיקת הקונטרולר
router.post('/register', validateRequest({ body: registerSchema }), register);
router.post('/login', validateRequest({ body: loginSchema }), login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.get('/google', googleAuthRedirect);
router.get('/google/callback', googleAuthCallback);
router.get('/me', requireAuth, getMe);

export default router;
