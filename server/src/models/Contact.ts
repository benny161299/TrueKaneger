import mongoose, { Schema, type Document } from 'mongoose';

export interface IContact extends Document {
  name: string;
  phone: string;
  email?: string;
  reportCount: number;
  reportedBy: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema: Schema = new Schema(
  {
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
    reportCount: {
      type: Number,
      default: 0,
    },
    reportedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
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

export const Contact = mongoose.model<IContact>('Contact', ContactSchema);
