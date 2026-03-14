import mongoose, { Schema, Document, Types } from 'mongoose';

export type ContactPlatform = 'whatsapp' | 'telegram';

export interface ISocialLink {
  platform: 'x' | 'instagram' | 'youtube' | 'tiktok' | 'other';
  url: string;
  frequency?: 'daily' | 'weekly' | 'irregular';
}

export interface IHandicapperRequest extends Document {
  userId: Types.ObjectId;
  pseudonym: string;
  bio: string;
  contactPlatform: ContactPlatform;
  contactValue: string;       // phone number or @handle
  socialLinks?: ISocialLink[];
  yearsExperience?: number;
  methodology?: string;       // brief description of their handicapping approach
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
}

const SocialLinkSchema = new Schema<ISocialLink>(
  {
    platform:  { type: String, enum: ['x', 'instagram', 'youtube', 'tiktok', 'other'], required: true },
    url:       { type: String, trim: true, required: true },
    frequency: { type: String, enum: ['daily', 'weekly', 'irregular'] },
  },
  { _id: false }
);

const HandicapperRequestSchema = new Schema<IHandicapperRequest>(
  {
    userId:           { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    pseudonym:        { type: String, required: true, trim: true },
    bio:              { type: String, default: '', trim: true },
    contactPlatform:  { type: String, enum: ['whatsapp', 'telegram'], required: true },
    contactValue:     { type: String, required: true, trim: true },
    socialLinks:      { type: [SocialLinkSchema], default: [] },
    yearsExperience:  { type: Number, min: 0, max: 50 },
    methodology:      { type: String, trim: true, maxlength: 500 },
    status:           { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason:  { type: String, trim: true },
    reviewedBy:       { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt:       { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

HandicapperRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.HandicapperRequest ||
  mongoose.model<IHandicapperRequest>('HandicapperRequest', HandicapperRequestSchema);
