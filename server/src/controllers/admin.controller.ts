import type { Request, Response, NextFunction } from 'express';
import { Report } from '../models/Report.js';
import { Contact } from '../models/Contact.js';
import { User } from '../models/User.js';
import type { AuthenticatedRequest } from '../middlewares/auth.js';
import type { UpdateContactNameInput, UpdateContactPhoneInput, UpdateContactEmailInput } from 'shared';

export const getReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // שליפת כל הדיווחים במערכת עם קישור לפרטי איש הקשר (כולל היוצר) והמשתמש המדווח
    const reports = await Report.find()
      .populate({
        path: 'contactId',
        select: 'name phone email createdBy createdAt',
        populate: {
          path: 'createdBy',
          select: 'email',
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

    user.isBanned = isBanned;
    await user.save();

    res.status(200).json({
      success: true,
      message: isBanned ? 'המשתמש נחסם בהצלחה' : 'חסימת המשתמש בוטלה בהצלחה',
      data: {
        _id: user._id,
        email: user.email,
        role: user.role,
        isBanned: user.isBanned,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.find({}, 'email role isBanned createdAt updatedAt');
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
    const { phone } = req.body as UpdateContactPhoneInput;

    const contact = await Contact.findById(id);
    if (!contact) {
      res.status(404).json({
        success: false,
        message: 'איש הקשר לא נמצא במערכת',
      });
      return;
    }

    contact.phone = phone;
    await contact.save();

    res.status(200).json({
      success: true,
      message: 'מספר הטלפון של איש הקשר עודכן בהצלחה',
      data: {
        _id: contact._id,
        phone: contact.phone,
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

