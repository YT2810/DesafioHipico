import mongoose, { Schema, Document } from 'mongoose';

export type ExpertPlatform = 'YouTube' | 'X' | 'Instagram' | 'Revista' | 'Telegram' | 'Otro';

export interface IExpertSource extends Document {
  name: string;
  platform: ExpertPlatform;
  handle?: string;
  link?: string;
  avatarUrl?: string;
  isVerified: boolean;
  isClaimable: boolean;
  isGhost: boolean;
  totalForecasts: number;
  totalHits: number;
  hitRate: number;
  createdAt: Date;
  updatedAt: Date;
}

const ExpertSourceSchema = new Schema<IExpertSource>(
  {
    name: { type: String, required: true, trim: true },
    platform: {
      type: String,
      enum: ['YouTube', 'X', 'Instagram', 'Revista', 'Telegram', 'Otro'],
      required: true,
    },
    handle: { type: String, trim: true },
    link: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    isVerified: { type: Boolean, default: false },
    isClaimable: { type: Boolean, default: true },
    isGhost: { type: Boolean, default: true },
    totalForecasts: { type: Number, default: 0 },
    totalHits: { type: Number, default: 0 },
    hitRate: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ExpertSourceSchema.index({ name: 1, platform: 1 }, { unique: true });

export default mongoose.models.ExpertSource ||
  mongoose.model<IExpertSource>('ExpertSource', ExpertSourceSchema);
