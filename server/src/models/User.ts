import mongoose, { Schema, type Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  googleId?: string;
  role: 'user' | 'admin';
  isBanned: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
  machzor?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  isApproved: boolean;
  reidentificationRequested?: boolean;
  refreshTokens?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: false,
    },
    googleId: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    machzor: {
      type: String,
      trim: true,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    reidentificationRequested: {
      type: Boolean,
      default: false,
    },
    refreshTokens: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
