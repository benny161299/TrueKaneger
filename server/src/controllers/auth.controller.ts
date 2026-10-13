import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { User } from '../models/User.js'; // ⚡ תוקן ליבוא מסולסל תואם למודל שלך
import type { RegisterInput, LoginInput, CompleteProfileInput } from 'shared';
import { generateAccessToken, generateRefreshToken, setTokenCookies, clearTokenCookies, verifyRefreshToken } from '../utils/jwt.js';
import type { AuthenticatedRequest } from '../middlewares/auth.js';

/**
 * יצירת SHA-256 Hash עבור Refresh Token לפני שמירתו במסד הנתונים.
 * מונע גניבת סשנים גם במקרה של דליפת מסד נתונים מלאה (Database Leak).
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

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

    // יצירת המשתמש החדש — תמיד עם role 'user'
    // הרשאת admin ניתנת אך ורק דרך DB/seed ידני, לא דרך הרשמה
    const newUser = new User({
      email,
      passwordHash,
      role: 'user',
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

    // שמירת ה-refreshToken כ-SHA-256 Hash ברשימת הטוקנים הפעילים של המשתמש
    if (!user.refreshTokens) user.refreshTokens = [];
    user.refreshTokens.push(hashToken(refreshToken));
    if (user.refreshTokens.length > 10) {
      user.refreshTokens.shift();
    }
    user.markModified('refreshTokens');
    await user.save();

    // 5. הגדרת עוגיות המזהה במענה (עבור דפדפנים שתומכים בעוגיות כרגיל)
    setTokenCookies(res, accessToken, refreshToken);

    // 6. החזרת תשובה במבנה ה-ApiResponse האחיד
    // בנוסף לעוגיות, מחזירים את הטוקנים בגוף התשובה כרשת ביטחון עבור דפדפנים שחוסמים עוגיות צד שלישי (iOS Safari, Incognito)
    res.status(200).json({
      success: true,
      message: 'התחברות בוצעה בהצלחה',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          machzor: user.machzor,
          approvalStatus: user.role === 'admin' ? 'approved' : (user.approvalStatus || (user.isApproved ? 'approved' : 'pending')),
          isApproved: user.role === 'admin' ? true : !!user.isApproved,
          isProfileComplete: Boolean(user.firstName && user.lastName && user.phone && user.machzor),
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
    // מוחק הן אם היה שמור כטקסט גולמי ישן והן אם שמור כ-SHA-256 Hash
    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        if (decoded?.userId) {
          const incomingTokenHash = hashToken(refreshToken);
          await User.findByIdAndUpdate(decoded.userId, {
            $pull: { refreshTokens: { $in: [refreshToken, incomingTokenHash] } },
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

    // 5. בדיקה קריטית: האם ה-refreshToken עדיין תקף ב-DB (כתוקף גלוי ישן או כ-Hash חדש)
    const incomingTokenHash = hashToken(refreshToken);
    const tokenExists =
      user.refreshTokens &&
      (user.refreshTokens.includes(incomingTokenHash) ||
        user.refreshTokens.includes(refreshToken));

    if (!tokenExists) {
      // 🚨 זיהוי פריצה ושימוש חוזר בזמן אמת (Reuse Detection):
      // הטוקן חתום ותקין קריפטוגרפית (verifyRefreshToken עבר בהצלחה),
      // אך הוא אינו קיים ברשימת הטוקנים המורשים (הוא כבר "נשרף" ברוטציה קודמת או נגנב).
      // מחיקה מיידית של כל הסשנים של המשתמש כדי לנתק כל תוקף מכל המכשירים!
      if (user.refreshTokens && user.refreshTokens.length > 0) {
        user.refreshTokens = [];
        user.markModified('refreshTokens');
        await user.save();
      }

      clearTokenCookies(res);
      res.status(401).json({
        success: false,
        message: 'אסימון הרענון בוטל או שאינו מורשה יותר (נדרשת התחברות מחדש)',
      });
      return;
    }

    // 6. הנפקת אסימונים חדשים (עם רוטציית Refresh Token מלאה ושמירת Hash בלבד)
    const newAccessToken = generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });
    const newRefreshToken = generateRefreshToken({
      userId: user._id.toString(),
      role: user.role,
    });
    const newRefreshTokenHash = hashToken(newRefreshToken);

    // החלפת הטוקן הישן בחדש: מוחקים גם אם היה שמור כטקסט גלוי וגם אם כ-Hash, ושומרים את ה-Hash החדש
    if (!user.refreshTokens) user.refreshTokens = [];
    user.refreshTokens = user.refreshTokens.filter(
      (t) => t !== refreshToken && t !== incomingTokenHash
    );
    user.refreshTokens.push(newRefreshTokenHash);
    if (user.refreshTokens.length > 10) {
      user.refreshTokens.shift();
    }
    user.markModified('refreshTokens');
    await user.save();

    // 7. עדכון עוגיות המזהה במענה
    setTokenCookies(res, newAccessToken, newRefreshToken);

    // 8. החזרת תשובה במבנה ה-ApiResponse האחיד כולל הטוקנים המעודכנים כרשת ביטחון
    res.status(200).json({
      success: true,
      message: 'אסימון הגישה חודש בהצלחה',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
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
    const userData = (await userinfoResponse.json()) as {
      id: string;
      email: string;
      given_name?: string;
      family_name?: string;
      name?: string;
    };
    const { id: googleId, email } = userData;

    // 4. חיפוש או יצירת המשתמש במסד הנתונים
    let user = await User.findOne({ googleId });
    
    if (!user) {
      // אם לא נמצא מזהה גוגל, ננסה לחפש לפי אימייל (אם נרשם בעבר ידנית)
      user = await User.findOne({ email });
      if (user) {
        user.googleId = googleId;
      } else {
        // יצירת משתמש חדש
        user = new User({
          email,
          googleId,
          role: 'user',
          approvalStatus: 'pending',
          isApproved: false,
        });
      }
    }

    // שמירת שמות מראש מגוגל (כדי להקל על המשתמש בהשלמת הפרופיל)
    if (!user.firstName && (userData.given_name || userData.name)) {
      user.firstName = (userData.given_name || userData.name?.split(' ')[0] || '').trim();
    }
    if (!user.lastName && (userData.family_name || userData.name)) {
      user.lastName = (userData.family_name || userData.name?.split(' ').slice(1).join(' ') || '').trim();
    }
    await user.save();

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

    // שמירת ה-refreshToken כ-SHA-256 Hash ברשימת הטוקנים הפעילים של המשתמש
    if (!user.refreshTokens) user.refreshTokens = [];
    user.refreshTokens.push(hashToken(refreshToken));
    if (user.refreshTokens.length > 10) user.refreshTokens.shift();
    user.markModified('refreshTokens');
    await user.save();

    // 7. הגדרת עוגיות המזהה במענה
    setTokenCookies(res, accessToken, refreshToken);

    // 8. הפניה חזרה לפרונטנד עם הטוקנים (מאפשר התחברות חלקה גם ללא עוגיות צד שלישי)
    const redirectUrl = new URL(clientUrl);
    redirectUrl.searchParams.set('accessToken', accessToken);
    redirectUrl.searchParams.set('refreshToken', refreshToken);
    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('OAuth error:', error);
    res.redirect(`${clientUrl}/login?error=server_error`);
  }
};

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
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          machzor: user.machzor,
          approvalStatus: user.role === 'admin' ? 'approved' : (user.approvalStatus || (user.isApproved ? 'approved' : 'pending')),
          isApproved: user.role === 'admin' ? true : !!user.isApproved,
          isProfileComplete: Boolean(user.firstName && user.lastName && user.phone && user.machzor),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * השלמת פרטי פרופיל (שם פרטי, שם משפחה, טלפון, מחזור) ושליחה לאישור מנהל
 */
export const completeProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'גישה נדחתה. משתמש אינו מחובר',
      });
      return;
    }

    const { firstName, lastName, phone, machzor } = req.body as CompleteProfileInput;

    const user = await User.findById(req.user.userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'המשתמש לא נמצא במערכת',
      });
      return;
    }

    // עדכון פרטי הפרופיל (אין שום גישה לשינוי role)
    user.firstName = firstName.trim();
    user.lastName = lastName.trim();
    user.phone = phone.trim();
    user.machzor = machzor.trim();

    // מנהל תמיד מאושר, משתמש רגיל מוגדר בהמתנה
    if (user.role !== 'admin' && !user.isApproved) {
      user.approvalStatus = 'pending';
      user.isApproved = false;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'פרטי הפרופיל עודכנו בהצלחה ונשלחו לאישור מנהל',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          machzor: user.machzor,
          approvalStatus: user.role === 'admin' ? 'approved' : user.approvalStatus,
          isApproved: user.role === 'admin' ? true : !!user.isApproved,
          isProfileComplete: true,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};






