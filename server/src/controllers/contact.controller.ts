import type { Request, Response, NextFunction } from 'express';
import { Contact } from '../models/Contact.js';
import { PendingContact } from '../models/PendingContact.js';
import { RevealLog } from '../models/RevealLog.js';
import { Report } from '../models/Report.js';
import type { CreateContactInput, CreateReportInput } from 'shared';
import type { AuthenticatedRequest } from '../middlewares/auth.js';
import { escapeRegex } from '../utils/sanitize.js';

export const getContacts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, letter } = req.query as { search?: string; letter?: string };
    const query: Record<string, any> = {};

    const andConditions: any[] = [];

    if (search && typeof search === 'string' && search.trim()) {
      const words = search.trim().split(/\s+/).filter(Boolean);
      if (words.length === 1) {
        const safeSearch = escapeRegex(words[0]);
        andConditions.push({
          $or: [
            { lastName: { $regex: safeSearch, $options: 'i' } },
            { firstName: { $regex: safeSearch, $options: 'i' } },
            { name: { $regex: safeSearch, $options: 'i' } },
            { machzor: { $regex: safeSearch, $options: 'i' } },
          ],
        });
      } else if (words.length > 1) {
        // בחיפוש מרובה מילים (למשל "זקס שלמה" או "שלמה זקס"), כל מילה צריכה להתאים לפחות לאחד השדות
        for (const word of words) {
          const safeWord = escapeRegex(word);
          andConditions.push({
            $or: [
              { lastName: { $regex: safeWord, $options: 'i' } },
              { firstName: { $regex: safeWord, $options: 'i' } },
              { name: { $regex: safeWord, $options: 'i' } },
              { machzor: { $regex: safeWord, $options: 'i' } },
            ],
          });
        }
      }
    }

    if (letter && typeof letter === 'string' && letter.trim() && letter.trim() !== 'הכל') {
      const safeLetter = escapeRegex(letter.trim());
      andConditions.push({
        $or: [
          { lastName: { $regex: `^${safeLetter}`, $options: 'i' } },
          { name: { $regex: `^${safeLetter}`, $options: 'i' } },
        ],
      });
    }

    if (andConditions.length === 1) {
      if (andConditions[0].$or) {
        query.$or = andConditions[0].$or;
      } else {
        query.$and = andConditions;
      }
    } else if (andConditions.length > 1) {
      query.$and = andConditions;
    }

    // שליפת רשימת אנשי קשר ממוינת בסדר עולה לפי שם משפחה ואז שם פרטי
    const contacts = await Contact.find(query, 'firstName lastName name machzor reportCount reportedBy')
      .sort({ lastName: 1, firstName: 1, name: 1 });
    const userId = (req as AuthenticatedRequest).user?.userId;

    // שליפת פירוט סיבות הדיווחים עבור אנשי קשר שיש להם דיווחים
    const contactIdsWithReports = contacts
      .filter((c) => c.reportCount > 0)
      .map((c) => c._id);

    const reportBreakdowns: Record<string, Record<string, number>> = {};
    if (contactIdsWithReports.length > 0) {
      const reports = await Report.aggregate([
        {
          $match: {
            contactId: { $in: contactIdsWithReports },
          },
        },
        {
          $group: {
            _id: { contactId: '$contactId', reason: '$reason' },
            count: { $sum: 1 },
          },
        },
      ]);

      for (const item of reports) {
        const cId = item._id.contactId.toString();
        const reason = item._id.reason;
        if (!reportBreakdowns[cId]) {
          reportBreakdowns[cId] = {};
        }
        reportBreakdowns[cId][reason] = item.count;
      }
    }

    const data = contacts.map((c) => {
      const cObj = typeof c.toObject === 'function' ? c.toObject() : { ...c };
      const hasReported = userId && cObj.reportedBy
        ? cObj.reportedBy.some((rId: any) => rId.toString() === userId.toString())
        : false;
      const firstName = cObj.firstName || (cObj.name ? cObj.name.split(' ')[0] : '');
      const lastName = cObj.lastName || (cObj.name ? cObj.name.split(' ').slice(1).join(' ') : '');
      const fullName = cObj.name || `${firstName} ${lastName}`.trim();
      return {
        _id: cObj._id,
        firstName,
        lastName,
        name: fullName,
        machzor: cObj.machzor || undefined,
        reportCount: cObj.reportCount || 0,
        hasReported: !!hasReported,
        reportBreakdown: reportBreakdowns[c._id.toString()] || {},
      };
    });

    res.status(200).json({
      success: true,
      message: 'רשימת אנשי הקשר נשלפה בהצלחה',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const createContact = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, name, phone, kosherPhone, nonKosherPhone, machzor, email } = req.body as CreateContactInput;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'גישה נדחתה. משתמש אינו מחובר',
      });
      return;
    }

    const resolvedFirstName = (firstName || (name ? name.split(' ')[0] : '')).trim();
    const resolvedLastName = (lastName || (name ? name.split(' ').slice(1).join(' ') : '')).trim();
    const fullName = (name || `${resolvedFirstName} ${resolvedLastName}`).trim();
    const primaryPhone = kosherPhone || nonKosherPhone || phone;

    const phonesToCheck = [kosherPhone, nonKosherPhone, phone].filter(Boolean) as string[];

    // בדיקה אם קיים כבר איש קשר מאושר עם אותם פרטים
    const existingContact = await Contact.findOne({
      $and: [
        {
          $or: [
            { name: fullName },
            { firstName: resolvedFirstName, lastName: resolvedLastName },
          ],
        },
        {
          $or: [
            { phone: { $in: phonesToCheck } },
            { kosherPhone: { $in: phonesToCheck } },
            { nonKosherPhone: { $in: phonesToCheck } },
          ],
        },
      ],
    });
    if (existingContact) {
      res.status(409).json({
        success: false,
        message: 'איש קשר עם שם ומספר טלפון זהה כבר קיים במערכת',
      });
      return;
    }

    // בדיקה אם קיים כבר איש קשר ממתין לאישור עם אותם פרטים
    const existingPending = await PendingContact.findOne({
      $and: [
        {
          $or: [
            { name: fullName },
            { firstName: resolvedFirstName, lastName: resolvedLastName },
          ],
        },
        {
          $or: [
            { phone: { $in: phonesToCheck } },
            { kosherPhone: { $in: phonesToCheck } },
            { nonKosherPhone: { $in: phonesToCheck } },
          ],
        },
      ],
    });
    if (existingPending) {
      res.status(409).json({
        success: false,
        message: 'איש קשר זה כבר נשלח ומחכה לאישור מנהל',
      });
      return;
    }

    // שמירה ב-PendingContact (ממתין לאישור) במקום ישירות ב-Contact
    const pendingContact = new PendingContact({
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      name: fullName,
      phone: primaryPhone,
      kosherPhone: kosherPhone || undefined,
      nonKosherPhone: nonKosherPhone || undefined,
      machzor: machzor?.trim() || undefined,
      email: email || undefined,
      createdBy: req.user.userId,
    });

    await pendingContact.save();

    res.status(201).json({
      success: true,
      message: 'איש הקשר נשלח בהצלחה ומחכה לאישור מנהל',
      data: pendingContact,
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

    const contact = await Contact.findById(id).populate('createdBy', 'email firstName lastName phone');
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

    const hasReported = req.user && contact.reportedBy
      ? contact.reportedBy.some((rId: any) => rId.toString() === req.user!.userId.toString())
      : false;

    // מטא-דאטה מנהל: נחשף אך ורק למנהלים (admin)
    const creator = contact.createdBy as any;
    const creatorName = creator && (creator.firstName || creator.lastName)
      ? `${creator.firstName || ''} ${creator.lastName || ''}`.trim()
      : undefined;

    const adminMeta = req.user.role === 'admin'
      ? {
          createdByEmail: creator?.email || 'לא צוין',
          createdByName: creatorName,
          createdByPhone: creator?.phone || undefined,
          createdById: creator?._id || contact.createdBy,
          createdAt: (contact as any).createdAt,
        }
      : undefined;

    // תיקון אוטומטי בזמן חשיפה במקרה של אי-התאמה היסטורית בין phone שעודכן ל-nonKosherPhone הישן
    let effectiveNonKosher = contact.nonKosherPhone;
    if (contact.phone && contact.phone !== contact.kosherPhone && contact.phone !== contact.nonKosherPhone) {
      effectiveNonKosher = contact.phone;
      contact.nonKosherPhone = contact.phone;
      contact.save().catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: 'פרטי איש הקשר נחשפו בהצלחה',
      data: {
        phone: contact.phone || contact.kosherPhone || effectiveNonKosher,
        kosherPhone: contact.kosherPhone || null,
        nonKosherPhone: effectiveNonKosher || null,
        machzor: contact.machzor || null,
        email: contact.email || null,
        hasReported: !!hasReported,
        adminMeta,
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




