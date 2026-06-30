import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/User.js'; // ⚡ תוקן ליבוא מסולסל תואם למודל שלך
import type { RegisterInput } from 'shared'; // ודא שבשאר המונורפו השם הוא 'shared' ולא '@truekaneger/shared'

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as RegisterInput;

    // בדיקה אם המשתמש כבר קיים במערכת
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'כתובת האימייל כבר קיימת במערכת',
      });
      return;
    }

    // הצפנת הסיסמה באמצעות bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // יצירת המשתמש החדש
    const newUser = new User({
      email,
      passwordHash,
    });

    await newUser.save();

    // החזרת תשובה במבנה ה-ApiResponse האחיד שלך
    res.status(201).json({
      success: true,
      message: 'המשתמש נוצר בהצלחה',
    });
  } catch (error) {
    next(error); // העברה ל-Error Handler המרכזי
  }
};
