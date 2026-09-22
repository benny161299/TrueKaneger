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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type BanUserInput = z.infer<typeof banUserSchema>;
