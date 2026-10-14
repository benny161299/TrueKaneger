import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('כתובת אימייל לא חוקית'),
  password: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים'),
});

export const loginSchema = z.object({
  email: z.string().email('כתובת אימייל לא חוקית'),
  password: z.string().nonempty('חובה להזין סיסמה'),
});

export const banUserSchema = z.object({
  isBanned: z.boolean({ required_error: 'חובה לציין את מצב החסימה' }),
});

export const completeProfileSchema = z.object({
  firstName: z.string().trim().min(2, 'שם פרטי חייב להכיל לפחות 2 תווים'),
  lastName: z.string().trim().min(2, 'שם משפחה חייב להכיל לפחות 2 תווים'),
  phone: z.string().trim().regex(/^05\d-?\d{7}$/, 'מספר טלפון סלולרי לא חוקי'),
  machzor: z.string().trim().max(30, 'מחזור ארוך מדי').optional().or(z.literal('')),
});

export const approveUserSchema = z.object({
  approved: z.boolean().default(true),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type BanUserInput = z.infer<typeof banUserSchema>;
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
export type ApproveUserInput = z.infer<typeof approveUserSchema>;
