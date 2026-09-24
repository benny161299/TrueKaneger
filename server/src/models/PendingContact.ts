import mongoose, { Schema, type Document } from 'mongoose';

export interface IPendingContact extends Document {
  firstName?: string;
  lastName?: string;
  name: string;
  phone: string;
  email?: string;
  status: 'pending';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PendingContactSchema: Schema = new Schema(
  {
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending'],
      default: 'pending',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

PendingContactSchema.index({ lastName: 1, firstName: 1 });

export const PendingContact = mongoose.model<IPendingContact>('PendingContact', PendingContactSchema);
