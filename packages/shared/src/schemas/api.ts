import { z } from 'zod';

// 1. סכמת שגיאה קבועה
export const apiErrorSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.array(z.any()).optional(),
});

export const apiSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
  data: z.any().optional(),
});

export const apiResponseSchema = z.discriminatedUnion('success', [
  apiSuccessSchema,
  apiErrorSchema,
]);

export type ApiError = z.infer<typeof apiErrorSchema>;

export type ApiSuccess<T = any> = {
  success: true;
  message?: string;
  data?: T;
};

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;