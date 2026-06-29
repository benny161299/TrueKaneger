import mongoose, { Schema, type Document } from 'mongoose';

export enum ReportReason {
  WRONG_NUMBER = 'WRONG_NUMBER',
  DOES_NOT_EXIST = 'DOES_NOT_EXIST',
  WRONG_NAME = 'WRONG_NAME',
  WRONG_EMAIL = 'WRONG_EMAIL',
}

export interface IReport extends Document {
  contactId: mongoose.Types.ObjectId;
  reportedBy: mongoose.Types.ObjectId;
  reason: ReportReason;
  suggestedCorrection?: string;
  freeTextComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema: Schema = new Schema(
  {
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      enum: Object.values(ReportReason),
      required: true,
    },
    suggestedCorrection: {
      type: String,
      required: false,
      trim: true,
    },
    freeTextComment: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Report = mongoose.model<IReport>('Report', ReportSchema);
