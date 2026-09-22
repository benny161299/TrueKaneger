import { z } from 'zod';

// ה-trim הועבר לתחילת השרשרת כדי לנקות רווחים לפני הבדיקה
const nameRule = z.string().trim().min(2, 'שם חייב להכיל לפחות 2 תווים');
const phoneRule = z.string().trim().regex(/^05\d-?\d{7}$/, 'מספר טלפון לא חוקי');
const emailRule = z.string().trim().email('כתובת אימייל לא חוקית').optional().or(z.literal(''));

export const createContactSchema = z.object({
  name: nameRule,
  phone: phoneRule,
  email: emailRule,
});

export const updateContactNameSchema = z.object({
  name: nameRule,
});

export const updateContactPhoneSchema = z.object({
  phone: phoneRule,
});

export const updateContactEmailSchema = z.object({
  email: emailRule,
});

export const mongoIdParamSchema = z.object({
  id: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'מזהה (ID) אינו תקין'),
});

export const contactsQuerySchema = z.object({
  search: z.string().trim().max(100, 'מחרוזת חיפוש ארוכה מדי').optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactNameInput = z.infer<typeof updateContactNameSchema>;
export type UpdateContactPhoneInput = z.infer<typeof updateContactPhoneSchema>;
export type UpdateContactEmailInput = z.infer<typeof updateContactEmailSchema>;
export type MongoIdParamInput = z.infer<typeof mongoIdParamSchema>;
export type ContactsQueryInput = z.infer<typeof contactsQuerySchema>;