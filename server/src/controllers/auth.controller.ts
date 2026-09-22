import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/User.js'; // ⚡ תוקן ליבוא מסולסל תואם למודל שלך
import type { RegisterInput, LoginInput } from 'shared'; // ודא שבשאר המונורפו השם הוא 'shared' ולא '@truekaneger/shared'
import { generateAccessToken, generateRefreshToken, setTokenCookies, clearTokenCookies, verifyRefreshToken } from '../utils/jwt.js';

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

    const isAdmin = email === 'admin@kaneger.com' || email.endsWith('@admin.com');

    // יצירת המשתמש החדש
    const newUser = new User({
      email,
      passwordHash,
      role: isAdmin ? 'admin' : 'user',
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

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as LoginInput;

    // 1. חיפוש המשתמש לפי אימייל
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'כתובת אימייל או סיסמה שגויים',
      });
      return;
    }

    // 2. השוואת סיסמה (בדיקה אם passwordHash קיים - עשוי להיות חסר אם נרשם דרך Google OAuth)
    if (!user.passwordHash) {
      res.status(401).json({
        success: false,
        message: 'כתובת אימייל או סיסמה שגויים',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'כתובת אימייל או סיסמה שגויים',
      });
      return;
    }

    // 3. בדיקה אם המשתמש חסום במערכת
    if (user.isBanned) {
      res.status(403).json({
        success: false,
        message: 'גישת משתמש זה נחסמה על ידי מנהל המערכת',
      });
      return;
    }

    // 4. יצירת Access Token ו-Refresh Token
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });
    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      role: user.role,
    });

    // שמירת ה-refreshToken ברשימת הטוקנים הפעילים של המשתמש
    if (!user.refreshTokens) user.refreshTokens = [];
    user.refreshTokens.push(refreshToken);
    if (user.refreshTokens.length > 10) {
      user.refreshTokens.shift();
    }
    await user.save();

    // 5. הגדרת עוגיות המזהה במענה
    setTokenCookies(res, accessToken, refreshToken);

    // 6. החזרת תשובה במבנה ה-ApiResponse האחיד
    res.status(200).json({
      success: true,
      message: 'התחברות בוצעה בהצלחה',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    // ביטול והסרת ה-refreshToken ממסד הנתונים בעת התנתקות (Revocation)
    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        if (decoded?.userId) {
          await User.findByIdAndUpdate(decoded.userId, {
            $pull: { refreshTokens: refreshToken },
          });
        }
      } catch {
        // טוקן שפג תוקפו או אינו תקין - אין צורך בפעולה נוספת
      }
    }

    // מחיקת העוגיות השמורות בדפדפן
    clearTokenCookies(res);

    res.status(200).json({
      success: true,
      message: 'התנתקות בוצעה בהצלחה',
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. קריאת ה-refreshToken מתוך עוגיות הבקשה או גוף הבקשה
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: 'גישה נדחתה. לא נמצא אסימון רענון',
      });
      return;
    }

    // 2. אימות אסימון הרענון
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'אסימון הרענון אינו תקף או שפג תוקפו',
      });
      return;
    }

    // 3. חיפוש המשתמש במסד הנתונים
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'משתמש לא נמצא במערכת',
      });
      return;
    }

    // 4. בדיקה אם המשתמש חסום במערכת
    if (user.isBanned) {
      res.status(403).json({
        success: false,
        message: 'גישת משתמש זה נחסמה על ידי מנהל המערכת',
      });
      return;
    }

    // 5. בדיקה קריטית: האם ה-refreshToken עדיין תקף או שבוטל בעת logout
    if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
      clearTokenCookies(res);
      res.status(401).json({
        success: false,
        message: 'אסימון הרענון בוטל או שאינו מורשה יותר (נדרשת התחברות מחדש)',
      });
      return;
    }

    // 6. הנפקת אסימונים חדשים (עם רוטציית Refresh Token מלאה)
    const newAccessToken = generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });
    const newRefreshToken = generateRefreshToken({
      userId: user._id.toString(),
      role: user.role,
    });

    // החלפת הטוקן הישן בחדש במסד הנתונים
    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    // 7. עדכון עוגיות המזהה במענה
    setTokenCookies(res, newAccessToken, newRefreshToken);

    // 8. החזרת תשובה במבנה ה-ApiResponse האחיד
    res.status(200).json({
      success: true,
      message: 'אסימון הגישה חודש בהצלחה',
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'אסימון הרענון אינו תקף או שפג תוקפו',
    });
  }
};

export const googleAuthRedirect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
    
    const options = {
      redirect_uri: redirectUri,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
    };

    const qs = new URLSearchParams(options).toString();
    res.redirect(`${rootUrl}?${qs}`);
  } catch (error) {
    next(error);
  }
};

export const googleAuthCallback = async (req: Request, res: Response, next: NextFunction) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  try {
    // 1. קבלת קוד האימות מגוגל
    const { code } = req.query;
    if (!code) {
      res.redirect(`${clientUrl}/login?error=no_code`);
      return;
    }

    // 2. החלפת הקוד ב-Access Token של Google
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Google Token Exchange Error:', errText);
      res.redirect(`${clientUrl}/login?error=google_auth_failed`);
      return;
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string };

    // 3. שליפת פרטי המשתמש מגוגל
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userinfoResponse.ok) {
      const errText = await userinfoResponse.text();
      console.error('Google Userinfo Fetch Error:', errText);
      res.redirect(`${clientUrl}/login?error=google_userinfo_failed`);
      return;
    }

    const userData = (await userinfoResponse.json()) as { id: string; email: string };
    const { id: googleId, email } = userData;

    // 4. חיפוש או יצירת המשתמש במסד הנתונים
    let user = await User.findOne({ googleId });
    
    if (!user) {
      // אם לא נמצא מזהה גוגל, ננסה לחפש לפי אימייל (אם נרשם בעבר ידנית)
      user = await User.findOne({ email });
      if (user) {
        user.googleId = googleId;
        await user.save();
      } else {
        // יצירת משתמש חדש
        user = new User({
          email,
          googleId,
          role: 'user',
        });
        await user.save();
      }
    }

    // 5. בדיקה אם המשתמש חסום במערכת
    if (user.isBanned) {
      res.redirect(`${clientUrl}/login?error=banned`);
      return;
    }

    // 6. הנפקת אסימוני JWT של המערכת שלנו
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });
    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      role: user.role,
    });

    // שמירת ה-refreshToken ברשימת הטוקנים הפעילים של המשתמש
    if (!user.refreshTokens) user.refreshTokens = [];
    user.refreshTokens.push(refreshToken);
    if (user.refreshTokens.length > 10) user.refreshTokens.shift();
    await user.save();

    // 7. הגדרת עוגיות המזהה במענה
    setTokenCookies(res, accessToken, refreshToken);

    // 8. הפניה חזרה לפרונטנד
    res.redirect(clientUrl);
  } catch (error) {
    console.error('OAuth error:', error);
    res.redirect(`${clientUrl}/login?error=server_error`);
  }
};

import type { AuthenticatedRequest } from '../middlewares/auth.js';

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'גישה נדחתה. משתמש אינו מחובר',
      });
      return;
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'המשתמש לא נמצא במערכת',
      });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({
        success: false,
        message: 'גישת משתמש זה נחסמה על ידי מנהל המערכת',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'פרטי משתמש נשלפו בהצלחה',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};






