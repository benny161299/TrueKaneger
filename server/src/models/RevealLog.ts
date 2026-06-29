import mongoose, { Schema, type Document } from 'mongoose';

export interface IRevealLog extends Document {
  userId: mongoose.Types.ObjectId;
  contactId: mongoose.Types.ObjectId;
  timestamp: Date;
}

const RevealLogSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
      // הוסר ה-index: true מכאן כי הוא לא רלוונטי לשאילתות ה-Rate Limit
    },
    timestamp: {
      type: Date,
      default: Date.now,
      expires: '30d', // מוחק אוטומטית לוגים ישנים מ-30 יום (מצוין ל-Free Tier!)
    },
  },
  {
    // Optionally also enable timestamps if createdAt/updatedAt are desired,
    // but the spec specifically mentions `timestamp`.
    timestamps: false,
  }
);

// ⚡ האינדקס הקריטי: מאפשר ל-Rate Limit לספור בשבריר שנייה כמה חשיפות עשה משתמש ספציפי לאחרונה
RevealLogSchema.index({ userId: 1, timestamp: -1 });

export const RevealLog = mongoose.model<IRevealLog>('RevealLog', RevealLogSchema);