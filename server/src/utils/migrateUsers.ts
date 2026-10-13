import { User } from '../models/User.js';

/**
 * מיגרציה אוטומטית ובטוחה עבור משתמשי המערכת:
 * 1. מנהלי מערכת (role: 'admin') מאושרים תמיד (isApproved = true).
 * 2. משתמשים קיימים ללא שדה אישור מוגדרים אוטומטית כ-pending (isApproved = false).
 */
export async function migrateUserApprovals() {
  try {
    // 👑 הבטחת אישור מלא לכל מנהלי המערכת
    const adminUpdate = await User.updateMany(
      { role: 'admin' },
      { $set: { isApproved: true, approvalStatus: 'approved' } }
    );

    // 🔒 הגדרת כל המשתמשים הקיימים שטרם הוגדר להם אישור לסטטוס pending
    const userUpdate = await User.updateMany(
      { role: { $ne: 'admin' }, isApproved: { $exists: false } },
      { $set: { isApproved: false, approvalStatus: 'pending' } }
    );

    if (adminUpdate.modifiedCount > 0 || userUpdate.modifiedCount > 0) {
      console.log(`🔒 User approval migration applied: ${adminUpdate.modifiedCount} admins verified, ${userUpdate.modifiedCount} users initialized to pending.`);
    }
  } catch (err) {
    console.error('Notice: User approval migration skipped or failed:', err);
  }
}
