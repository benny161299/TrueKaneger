import type { Request, Response, NextFunction } from 'express';
import { Contact } from '../models/Contact.js';
import { RevealLog } from '../models/RevealLog.js';
import { Report } from '../models/Report.js';
import type { CreateContactInput, CreateReportInput } from 'shared';
import type { AuthenticatedRequest } from '../middlewares/auth.js';

export const getContacts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // שליפת רשימת אנשי קשר המכילה רק מזהים ושמות (ללא טלפון ומייל לשמירה על פרטיות)
    const contacts = await Contact.find({}, 'name reportCount');

    res.status(200).json({
      success: true,
      message: 'רשימת אנשי הקשר נשלפה בהצלחה',
      data: contacts,
    });
  } catch (error) {
    next(error);
  }
};

export const createContact = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, phone, email } = req.body as CreateContactInput;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'גישה נדחתה. משתמש אינו מחובר',
      });
      return;
    }

    // בדיקה אם קיים כבר איש קשר עם שם ומספר טלפון זהה
    const existingContact = await Contact.findOne({ name, phone });
    if (existingContact) {
      res.status(409).json({
        success: false,
        message: 'איש קשר עם שם ומספר טלפון זהה כבר קיים במערכת',
      });
      return;
    }

    const newContact = new Contact({
      name,
      phone,
      email: email || undefined,
      createdBy: req.user.userId,
    });

    await newContact.save();

    res.status(201).json({
      success: true,
      message: 'איש קשר נוסף בהצלחה',
      data: newContact,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteContact = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const deletedContact = await Contact.findByIdAndDelete(id);
    if (!deletedContact) {
      res.status(404).json({
        success: false,
        message: 'איש קשר לא נמצא במערכת',
      });
      return;
    }

    // ניקוי דוחות ולוגי חשיפה המשויכים לאיש הקשר שנמחק
    await Report.deleteMany({ contactId: id });
    await RevealLog.deleteMany({ contactId: id });

    res.status(200).json({
      success: true,
      message: 'איש קשר נמחק בהצלחה',
    });
  } catch (error) {
    next(error);
  }
};

export const revealContact = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'גישה נדחתה. משתמש אינו מחובר',
      });
      return;
    }

    const contact = await Contact.findById(id);
    if (!contact) {
      res.status(404).json({
        success: false,
        message: 'איש קשר לא נמצא במערכת',
      });
      return;
    }

    // שמירת לוג חשיפה (RevealLog) לאחר החשיפה המוצלח
    const log = new RevealLog({
      userId: req.user.userId,
      contactId: contact._id,
    });
    await log.save();

    res.status(200).json({
      success: true,
      message: 'פרטי איש הקשר נחשפו בהצלחה',
      data: {
        phone: contact.phone,
        email: contact.email || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const reportContact = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason, suggestedCorrection, freeTextComment } = req.body as CreateReportInput;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'גישה נדחתה. משתמש אינו מחובר',
      });
      return;
    }

    const userId = req.user.userId;

    const contact = await Contact.findById(id);
    if (!contact) {
      res.status(404).json({
        success: false,
        message: 'איש קשר לא נמצא במערכת',
      });
      return;
    }

    // 6.2 Validation: וידוא שהמשתמש לא דיווח כבר על אותו איש קשר
    const hasReported = contact.reportedBy.some(reporterId => reporterId.toString() === userId.toString());
    if (hasReported) {
      res.status(409).json({
        success: false,
        message: 'כבר דיווחת על איש קשר זה בעבר',
      });
      return;
    }

    // יצירת הדיווח
    const report = new Report({
      contactId: contact._id,
      reportedBy: userId,
      reason,
      suggestedCorrection: suggestedCorrection || undefined,
      freeTextComment: freeTextComment || undefined,
    });
    await report.save();

    // 6.3 עדכון reportCount ו-reportedBy על ה-Contact
    contact.reportedBy.push(userId as any);
    contact.reportCount = contact.reportedBy.length;
    await contact.save();

    res.status(201).json({
      success: true,
      message: 'הדיווח התקבל בהצלחה',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};




