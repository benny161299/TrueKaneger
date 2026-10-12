import { Router } from 'express';
import { registerSchema, loginSchema } from 'shared';
import { validateRequest } from '../middlewares/validateRequest.js';
import { register, login, logout, refresh, googleAuthRedirect, googleAuthCallback, getMe } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { authRateLimiter, googleAuthRateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// נתיבי אימות מוגנים באמצעות Rate Limiting, ולידציה ו-JWT
router.post('/register', authRateLimiter, validateRequest({ body: registerSchema }), register);
router.post('/login', authRateLimiter, validateRequest({ body: loginSchema }), login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.get('/google', googleAuthRedirect);
router.get('/google/callback', googleAuthRateLimiter, googleAuthCallback);
router.get('/me', requireAuth, getMe);

export default router;
