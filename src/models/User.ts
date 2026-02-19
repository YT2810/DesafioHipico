import mongoose, { Schema, Document, Types } from 'mongoose';
export { GOLD_RATE, FREE_RACES_PER_MEETING, GOLD_COST_PER_RACE } from '@/lib/constants';

/**
 * Tracks which races a user has unlocked (free or paid) per meeting.
 * Free quota: first FREE_RACES_PER_MEETING races unlocked at no cost.
 * After that, each additional race costs GOLD_COST_PER_RACE Gold.
 * No time-based reset — quota is per meeting, permanent.
 */
export interface IMeetingConsumption {
  meetingId: string;
  freeUsed: number;
  unlockedRaceIds: string[];
}

export interface IUser extends Document {
  identifier: string;
  alias: string;
  email?: string;
  phone?: string;
  legalId?: string;
  googleId?: string;
  telegramId?: string;
  // Billing profile — required before first top-up
  fullName?: string;
  identityDocument?: string;
  phoneNumber?: string;
  roles: ('customer' | 'handicapper' | 'admin' | 'staff')[];
  balance: {
    golds: number;
    diamonds: number;
  };
  meetingConsumptions: IMeetingConsumption[];
  followedHandicappers: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MeetingConsumptionSchema = new Schema<IMeetingConsumption>(
  {
    meetingId: { type: String, required: true },
    freeUsed: { type: Number, default: 0 },
    unlockedRaceIds: [{ type: String }],
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    identifier: { type: String, trim: true, default: '' },
    alias: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true },
    phone: { type: String, trim: true },
    legalId: { type: String, trim: true },
    googleId:          { type: String, trim: true, sparse: true },
    telegramId:        { type: String, trim: true, sparse: true },
    fullName:          { type: String, trim: true },
    identityDocument:  { type: String, trim: true },
    phoneNumber:       { type: String, trim: true },
    roles: [{ type: String, enum: ['customer', 'handicapper', 'admin', 'staff'] }],
    balance: {
      golds: { type: Number, default: 0, min: 0 },
      diamonds: { type: Number, default: 0, min: 0 },
    },
    meetingConsumptions: { type: [MeetingConsumptionSchema], default: [] },
    followedHandicappers: [{ type: Schema.Types.ObjectId, ref: 'HandicapperProfile' }],
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
