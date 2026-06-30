import type { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

// הגדרת ממשק המאפשר לבדוק את ה-body, ה-query או ה-params — כולם אופציונליים!
interface RequestValidationSchemas {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}

export const validateRequest = (schemas: RequestValidationSchemas) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. ולידציה ל-Body (אם הוגדרה סכמה)
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      
      // 2. ולידציה ל-Query parameters (אם הוגדרה סכמה)
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      
      // 3. ולידציה ל-URL Params (אם הוגדרה סכמה)
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // התאמה מושלמת למבנה ה-ApiResponse האחיד שבנינו בשלב 2.4
        res.status(400).json({
          success: false,
          message: 'שגיאת ולידציה בנתונים שנשלחו',
          // הפיכת מערך השגיאות המורכב של Zod למערך קריא וקל לפרונטנד
          errors: error.errors.map((err) => ({
            field: err.path.join('.'), // יחזיר למשל "email" או "password"
            message: err.message,       // יחזיר את ההודעה בעברית שהגדרת בסכמה
          })),
        });
        return;
      }
      
      // אם זו שגיאה לא צפויה, נעביר אותה ל-Error Handler המרכזי של אקספרס
      next(error);
    }
  };
};
