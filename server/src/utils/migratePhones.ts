import { Contact } from '../models/Contact.js';

/**
 * מיגרציה אוטומטית ובטוחה לסנכרון שדה phone ל-nonKosherPhone:
 * במקרים שבהם אושר דיווח בעבר ושדה phone קיבל את המספר החדש בעוד nonKosherPhone נותר עם המספר הישן,
 * מיגרציה זו מעדכנת את nonKosherPhone במספר החדש מ-phone.
 */
export async function migrateMismatchedPhones() {
  try {
    const mismatchedContacts = await Contact.find({
      phone: { $exists: true, $ne: null },
      nonKosherPhone: { $exists: true, $ne: null },
      $expr: {
        $and: [
          { $ne: ['$phone', '$nonKosherPhone'] },
          { $ne: ['$phone', { $ifNull: ['$kosherPhone', ''] }] },
        ],
      },
    });

    let updatedCount = 0;
    for (const contact of mismatchedContacts) {
      if (contact.phone) {
        contact.nonKosherPhone = contact.phone;
        await contact.save();
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      console.log(`📞 Phone migration applied: ${updatedCount} mismatched contact phone numbers synchronized.`);
    }
  } catch (err) {
    console.error('Notice: Phone migration skipped or failed:', err);
  }
}
