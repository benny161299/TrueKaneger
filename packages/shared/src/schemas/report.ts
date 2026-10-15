import { z } from 'zod';

export const ReportReasonEnum = z.enum([
  'WRONG_NUMBER',
  'WRONG_NON_KOSHER_PHONE',
  'WRONG_KOSHER_PHONE',
  'ADD_NON_KOSHER_PHONE',
  'ADD_KOSHER_PHONE',
  'DOES_NOT_EXIST',
  'WRONG_NAME',
  'WRONG_EMAIL',
  'ADD_EMAIL',
  'OTHER',
]);

const phoneRegex = /^05\d-?\d{7}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_REASONS = [
  'WRONG_NUMBER',
  'WRONG_NON_KOSHER_PHONE',
  'WRONG_KOSHER_PHONE',
  'ADD_NON_KOSHER_PHONE',
  'ADD_KOSHER_PHONE',
];

const EMAIL_REASONS = [
  'WRONG_EMAIL',
  'ADD_EMAIL',
];

export const createReportSchema = z
  .object({
    reason: ReportReasonEnum,
    suggestedCorrection: z.string().trim().optional().or(z.literal('')),
    freeTextComment: z.string().trim().optional().or(z.literal('')),
  })
  .superRefine((val, ctx) => {
    const isAdd = val.reason.startsWith('ADD_');
    const correction = val.suggestedCorrection?.trim();

    if (isAdd && (!correction || correction.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: val.reason === 'ADD_EMAIL' ? 'יש להזין כתובת מייל להוספה' : 'יש להזין מספר טלפון להוספה',
        path: ['suggestedCorrection'],
      });
      return;
    }

    if (correction && correction.length > 0) {
      if (PHONE_REASONS.includes(val.reason)) {
        if (!phoneRegex.test(correction)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'מספר טלפון אינו תקין (לדוגמה: 050-1234567)',
            path: ['suggestedCorrection'],
          });
        }
      } else if (EMAIL_REASONS.includes(val.reason)) {
        if (!emailRegex.test(correction)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'כתובת אימייל אינה תקינה (לדוגמה: name@example.com)',
            path: ['suggestedCorrection'],
          });
        }
      }
    }
  });

export type CreateReportInput = z.infer<typeof createReportSchema>;
