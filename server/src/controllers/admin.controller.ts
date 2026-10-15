import type { Request, Response, NextFunction } from 'express';
import { Report } from '../models/Report.js';
import { Contact } from '../models/Contact.js';
import { PendingContact } from '../models/PendingContact.js';
import { User } from '../models/User.js';
import type { AuthenticatedRequest } from '../middlewares/auth.js';
import type {
  UpdateContactNameInput,
  UpdateContactPhoneInput,
  UpdateContactEmailInput,
  UpdateContactFullInput,
} from 'shared';

export const getReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // שליפת כל הדיווחים במערכת עם קישור לפרטי איש הקשר (כולל היוצר) והמשתמש המדווח
    const reports = await Report.find()
      .populate({
        path: 'contactId',
        select: 'firstName lastName name phone kosherPhone nonKosherPhone machzor email createdBy createdAt',
        populate: {
          path: 'createdBy',
          select: 'email firstName lastName phone',
        },
      })
      .populate('reportedBy', 'email');

    res.status(200).json({
      success: true,
      message: 'רשימת הדיווחים נשלפה בהצלחה',
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};

export const dismissReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // מחיקת הדיווח ממסד הנתונים
    const report = await Report.findByIdAndDelete(id);
    if (!report) {
      res.status(404).json({
        success: false,
        message: 'הדיווח לא נמצא במערכת',
      });
      return;
    }

    // עדכון איש הקשר המתאים: הסרת המדווח והפחתת ספירת הדיווחים
    await Contact.findByIdAndUpdate(report.contactId, {
      $pull: { reportedBy: report.reportedBy },
      $inc: { reportCount: -1 },
    });

    res.status(200).json({
      success: true,
      message: 'הדיווח נסגר ונמחק בהצלחה',
    });
  } catch (error) {
    next(error);
  }
};

export const toggleUserBan = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isBanned } = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'גישה נדחתה. משתמש אינו מחובר',
      });
      return;
    }

    // מניעת חסימה עצמית של מנהל המערכת
    if (id === req.user.userId) {
      res.status(400).json({
        success: false,
        message: 'אינך יכול לחסום את עצמך',
      });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'המשתמש לא נמצא במערכת',
      });
      return;
    }

    // מניעת חסימת admin ע"י admin אחר
    if (user.role === 'admin') {
      res.status(403).json({
        success: false,
        message: 'אין אפשרות לחסום מנהל מערכת אחר',
      });
      return;
    }

    user.isBanned = isBanned;
    if (isBanned) {
      user.isApproved = false;
      user.approvalStatus = 'rejected';
    } else {
      user.isApproved = false;
      user.approvalStatus = 'pending';
    }
    await user.save();

    res.status(200).json({
      success: true,
      message: isBanned ? 'המשתמש נחסם בהצלחה' : 'חסימת המשתמש בוטלה בהצלחה',
      data: {
        _id: user._id,
        email: user.email,
        role: user.role,
        isBanned: user.isBanned,
        isApproved: user.isApproved,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.find(
      {},
      'email role isBanned firstName lastName phone machzor isApproved approvalStatus createdAt updatedAt'
    ).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: 'רשימת המשתמשים נשלפה בהצלחה',
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const updateContactName = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, firstName, lastName } = req.body as UpdateContactNameInput;

    const contact = await Contact.findById(id);
    if (!contact) {
      res.status(404).json({
        success: false,
        message: 'איש הקשר לא נמצא במערכת',
      });
      return;
    }

    if (firstName) contact.firstName = firstName.trim();
    if (lastName) contact.lastName = lastName.trim();
    if (name) {
      contact.name = name.trim();
      if (!firstName && !lastName) {
        contact.firstName = name.trim().split(' ')[0];
        contact.lastName = name.trim().split(' ').slice(1).join(' ');
      }
    } else if (contact.firstName || contact.lastName) {
      contact.name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
    }
    await contact.save();

    res.status(200).json({
      success: true,
      message: 'שם איש הקשר עודכן בהצלחה',
      data: {
        _id: contact._id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        name: contact.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateContactPhone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { phone, kosherPhone, nonKosherPhone } = req.body as UpdateContactPhoneInput;

    const contact = await Contact.findById(id);
    if (!contact) {
      res.status(404).json({
        success: false,
        message: 'איש הקשר לא נמצא במערכת',
      });
      return;
    }

    if (kosherPhone !== undefined) contact.kosherPhone = kosherPhone ? kosherPhone.trim() : undefined;
    if (nonKosherPhone !== undefined) contact.nonKosherPhone = nonKosherPhone ? nonKosherPhone.trim() : undefined;
    if (phone !== undefined && phone) {
      contact.phone = phone.trim();
    } else {
      contact.phone = contact.nonKosherPhone || contact.kosherPhone;
    }
    await contact.save();

    res.status(200).json({
      success: true,
      message: 'מספר הטלפון של איש הקשר עודכן בהצלחה',
      data: {
        _id: contact._id,
        phone: contact.phone,
        kosherPhone: contact.kosherPhone,
        nonKosherPhone: contact.nonKosherPhone,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateContactEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { email } = req.body as UpdateContactEmailInput;

    const contact = await Contact.findById(id);
    if (!contact) {
      res.status(404).json({
        success: false,
        message: 'איש הקשר לא נמצא במערכת',
      });
      return;
    }

    contact.email = email;
    await contact.save();

    res.status(200).json({
      success: true,
      message: 'כתובת האימייל של איש הקשר עודכנה בהצלחה',
      data: {
        _id: contact._id,
        email: contact.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

/** עדכון מלא של כל פרטי איש הקשר עם אפשרות לסגירת דיווח במקביל */
export const updateContactFull = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      name,
      phone,
      kosherPhone,
      nonKosherPhone,
      machzor,
      email,
      dismissReportId,
    } = req.body as UpdateContactFullInput;

    const contact = await Contact.findById(id);
    if (!contact) {
      res.status(404).json({
        success: false,
        message: 'איש הקשר לא נמצא במערכת',
      });
      return;
    }

    if (firstName !== undefined) contact.firstName = firstName ? firstName.trim() : undefined;
    if (lastName !== undefined) contact.lastName = lastName ? lastName.trim() : undefined;

    if (name) {
      contact.name = name.trim();
    } else if (contact.firstName || contact.lastName) {
      contact.name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
    }

    if (kosherPhone !== undefined) contact.kosherPhone = kosherPhone ? kosherPhone.trim() : undefined;
    if (nonKosherPhone !== undefined) contact.nonKosherPhone = nonKosherPhone ? nonKosherPhone.trim() : undefined;

    // ודא ששדה phone הראשי מסונכרן תמיד עם המספר הפעיל
    if (phone !== undefined && phone) {
      contact.phone = phone.trim();
    } else {
      contact.phone = contact.nonKosherPhone || contact.kosherPhone;
    }

    if (machzor !== undefined) contact.machzor = machzor ? machzor.trim() : undefined;
    if (email !== undefined) contact.email = email ? email.trim() : undefined;

    await contact.save();

    // אם סומן לסגור את הדיווח במקביל (שמור שינויים וסגור דיווח)
    if (dismissReportId) {
      const report = await Report.findByIdAndDelete(dismissReportId);
      if (report) {
        await Contact.findByIdAndUpdate(report.contactId, {
          $pull: { reportedBy: report.reportedBy },
          $inc: { reportCount: -1 },
        });
      }
    }

    res.status(200).json({
      success: true,
      message: dismissReportId
        ? 'פרטי איש הקשר עודכנו והדיווח נסגר בהצלחה'
        : 'פרטי איש הקשר עודכנו בהצלחה',
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

// --- Pending Contacts ---

/** שליפת כל אנשי הקשר הממתינים לאישור */
export const getPendingContacts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pending = await PendingContact.find()
      .populate('createdBy', 'email firstName lastName phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'רשימת אנשי הקשר הממתינים נשלפה בהצלחה',
      data: pending,
    });
  } catch (error) {
    next(error);
  }
};

/** אישור איש קשר ממתין — מעביר אותו ל-Contact ומוחק מ-PendingContact */
export const approveContact = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const pending = await PendingContact.findById(id);
    if (!pending) {
      res.status(404).json({
        success: false,
        message: 'איש הקשר הממתין לא נמצא',
      });
      return;
    }

    // יצירת איש הקשר המאושר ב-Contact
    const approved = new Contact({
      firstName: pending.firstName,
      lastName: pending.lastName,
      name: pending.name,
      phone: pending.phone || pending.kosherPhone || pending.nonKosherPhone,
      kosherPhone: pending.kosherPhone,
      nonKosherPhone: pending.nonKosherPhone,
      machzor: pending.machzor,
      email: pending.email,
      createdBy: pending.createdBy,
    });
    await approved.save();

    // מחיקת הרשומה מהמתינים
    await PendingContact.findByIdAndDelete(id);

    res.status(201).json({
      success: true,
      message: 'איש הקשר אושר ונוסף למאגר בהצלחה',
      data: approved,
    });
  } catch (error) {
    next(error);
  }
};

/** דחיית איש קשר ממתין — מחיקה לצמיתות */
export const rejectContact = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const deleted = await PendingContact.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'איש הקשר הממתין לא נמצא',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'איש הקשר נדחה ונמחק בהצלחה',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * שליפת רשימת כל המשתמשים הממתינים לאישור גישה לאלפון
 */
export const getPendingUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // שליפת כל מי שאינו אדמין וממתין לאישור (או טרם אושר)
    const pendingUsers = await User.find(
      {
        role: { $ne: 'admin' },
        $or: [
          { approvalStatus: 'pending' },
          { isApproved: { $ne: true }, approvalStatus: { $ne: 'rejected' } },
        ],
      },
      'email role isBanned firstName lastName phone machzor isApproved approvalStatus reidentificationRequested createdAt'
    ).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'רשימת המשתמשים הממתינים נשלפה בהצלחה',
      data: pendingUsers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * אישור גישה למשתמש
 */
export const approveUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'המשתמש לא נמצא במערכת',
      });
      return;
    }

    user.isApproved = true;
    user.approvalStatus = 'approved';
    user.isBanned = false;
    user.reidentificationRequested = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: `המשתמש ${user.firstName ? user.firstName + ' ' + (user.lastName || '') : user.email} אושר בהצלחה`,
      data: {
        _id: user._id,
        email: user.email,
        role: user.role,
        isBanned: user.isBanned,
        isApproved: user.isApproved,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * דחיית בקשת גישה של משתמש
 */
export const rejectUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'המשתמש לא נמצא במערכת',
      });
      return;
    }

    // מניעת דחיית מנהל מערכת
    if (user.role === 'admin') {
      res.status(403).json({
        success: false,
        message: 'אין אפשרות לדחות מנהל מערכת',
      });
      return;
    }

    user.isApproved = false;
    user.approvalStatus = 'rejected';
    user.isBanned = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: `בקשת הגישה של ${user.email} נדחתה והמשתמש נחסם`,
      data: {
        _id: user._id,
        email: user.email,
        role: user.role,
        isBanned: user.isBanned,
        isApproved: user.isApproved,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * בקשת זיהוי פרטים מחדש של משתמש:
 * מאפס את הפרטים שהוזנו (שם פרטי, שם משפחה, טלפון, מחזור),
 * ומחזיר את המשתמש לסטטוס ממתין (pending) בדיוק כמו לפני שהזין פרטים.
 */
export const requestUserDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'המשתמש לא נמצא במערכת',
      });
      return;
    }

    // מניעת איפוס פרטי מנהל מערכת
    if (user.role === 'admin') {
      res.status(403).json({
        success: false,
        message: 'אין אפשרות לאפס פרטים של מנהל מערכת',
      });
      return;
    }

    user.firstName = undefined;
    user.lastName = undefined;
    user.phone = undefined;
    user.machzor = undefined;
    user.isApproved = false;
    user.approvalStatus = 'pending';
    user.isBanned = false;
    user.reidentificationRequested = true;
    await user.save();

    await User.findByIdAndUpdate(id, {
      $unset: {
        firstName: 1,
        lastName: 1,
        phone: 1,
        machzor: 1,
      },
      $set: {
        isApproved: false,
        approvalStatus: 'pending',
        isBanned: false,
        reidentificationRequested: true,
      },
    });

    res.status(200).json({
      success: true,
      message: `נשלחה בקשה לזיהוי פרטים מחדש עבור ${user.email}, הפרטים אופסו והמשתמש הוחזר לסטטוס ממתין`,
      data: {
        _id: user._id,
        email: user.email,
        role: user.role,
        isBanned: false,
        isApproved: false,
        approvalStatus: 'pending',
        reidentificationRequested: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * שליפת ספירות התראות פעילות עבור ממשק הניהול (מנהל בלבד)
 * מחזיר מספר משתמשים ממתינים, אנשי קשר ממתינים, ודיווחים פתוחים
 */
export const getAdminCounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [pendingUsers, pendingContacts, reports] = await Promise.all([
      User.countDocuments({
        role: { $ne: 'admin' },
        $or: [
          { approvalStatus: 'pending' },
          { isApproved: { $ne: true }, approvalStatus: { $ne: 'rejected' } },
        ],
      }),
      PendingContact.countDocuments(),
      Report.countDocuments(),
    ]);

    const totalAlerts = pendingUsers + pendingContacts + reports;

    res.status(200).json({
      success: true,
      message: 'ספירת התראות נשלפה בהצלחה',
      data: {
        pendingUsers,
        pendingContacts,
        reports,
        totalAlerts,
      },
    });
  } catch (error) {
    next(error);
  }
};

