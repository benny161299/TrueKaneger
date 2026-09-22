import { z } from 'zod';

export const ReportReasonEnum = z.enum([
  'WRONG_NUMBER',
  'DOES_NOT_EXIST',
  'WRONG_NAME',
  'WRONG_EMAIL',
  'OTHER',
]);

const phoneRegex = /^05\d-?\d{7}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const createReportSchema = z
  .object({
    reason: ReportReasonEnum,
    suggestedCorrection: z.string().trim().optional().or(z.literal('')),
    freeTextComment: z.string().trim().optional().or(z.literal('')),
  })
  .superRefine((val, ctx) => {
    const correction = val.suggestedCorrection?.trim();
    if (correction && correction.length > 0) {
      if (val.reason === 'WRONG_NUMBER') {
        if (!phoneRegex.test(correction)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'מספר טלפון מתוקן אינו תקין (לדוגמה: 050-1234567)',
            path: ['suggestedCorrection'],
          });
        }
      } else if (val.reason === 'WRONG_EMAIL') {
        if (!emailRegex.test(correction)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'כתובת אימייל מתוקנת אינה תקינה (לדוגמה: name@example.com)',
            path: ['suggestedCorrection'],
          });
        }
      }
    }
  });

export type CreateReportInput = z.infer<typeof createReportSchema>;
