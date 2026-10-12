import { z } from 'zod';

// חוקי שמות
const nameRule = z.string().trim().min(2, 'שם חייב להכיל לפחות 2 תווים');
const firstNameRule = z.string().trim().min(2, 'שם פרטי חייב להכיל לפחות 2 תווים');
const lastNameRule = z.string().trim().min(2, 'שם משפחה חייב להכיל לפחות 2 תווים');
const phoneRule = z.string().trim().regex(/^05\d-?\d{7}$/, 'מספר טלפון לא חוקי');
const emailRule = z.string().trim().email('כתובת אימייל לא חוקית').optional().or(z.literal(''));

export const optionalPhoneRule = phoneRule.optional().or(z.literal(''));
export const machzorRule = z.string().trim().max(30, 'מספר מחזור ארוך מדי').optional().or(z.literal(''));

export const createContactSchema = z.object({
  firstName: firstNameRule.optional(),
  lastName: lastNameRule.optional(),
  name: nameRule.optional(),
  phone: optionalPhoneRule,
  kosherPhone: optionalPhoneRule,
  nonKosherPhone: optionalPhoneRule,
  machzor: machzorRule,
  email: emailRule,
}).refine((data) => (data.firstName && data.lastName) || data.name, {
  message: 'יש להזין שם פרטי ושם משפחה (או שם מלא)',
  path: ['firstName'],
}).refine((data) => (Boolean(data.kosherPhone) || Boolean(data.nonKosherPhone) || Boolean(data.phone)), {
  message: 'יש להזין לפחות מספר טלפון אחד (כשר או לא כשר)',
  path: ['kosherPhone'],
});

export const updateContactNameSchema = z.object({
  firstName: firstNameRule.optional(),
  lastName: lastNameRule.optional(),
  name: nameRule.optional(),
});

export const updateContactPhoneSchema = z.object({
  phone: optionalPhoneRule,
  kosherPhone: optionalPhoneRule,
  nonKosherPhone: optionalPhoneRule,
}).refine((data) => Boolean(data.phone) || Boolean(data.kosherPhone) || Boolean(data.nonKosherPhone), {
  message: 'יש להזין לפחות מספר טלפון אחד',
  path: ['phone'],
});

export const updateContactMachzorSchema = z.object({
  machzor: machzorRule,
});

export const updateContactEmailSchema = z.object({
  email: emailRule,
});

export const mongoIdParamSchema = z.object({
  id: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'מזהה (ID) אינו תקין'),
});

export const contactsQuerySchema = z.object({
  search: z.string().trim().max(100, 'מחרוזת חיפוש ארוכה מדי').optional(),
  letter: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactNameInput = z.infer<typeof updateContactNameSchema>;
export type UpdateContactPhoneInput = z.infer<typeof updateContactPhoneSchema>;
export type UpdateContactMachzorInput = z.infer<typeof updateContactMachzorSchema>;
export type UpdateContactEmailInput = z.infer<typeof updateContactEmailSchema>;
export type MongoIdParamInput = z.infer<typeof mongoIdParamSchema>;
export type ContactsQueryInput = z.infer<typeof contactsQuerySchema>;