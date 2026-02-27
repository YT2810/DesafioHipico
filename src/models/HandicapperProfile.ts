import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IHandicapperStats {
  totalForecasts: number;
  totalRacesWithResult: number;
  hit1st: number;
  hit2nd: number;
  hit3rd: number;
  hitAny: number;
  pct1st: number;
  pct2nd: number;
  pct3rd: number;
  pctGeneral: number;
}

export interface IHandicapperProfile extends Document {
  userId?: Types.ObjectId;
  pseudonym: string;
  contactNumber?: string;
  bio?: string;
  isActive: boolean;
  isPublic: boolean;
  isGhost: boolean;
  expertSourceId?: Types.ObjectId;
  revenueSharePct: number;
  stats: IHandicapperStats;
  createdAt: Date;
  updatedAt: Date;
}

const HandicapperProfileSchema = new Schema<IHandicapperProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false, sparse: true },
    pseudonym: { type: String, required: true, trim: true, unique: true },
    isGhost: { type: Boolean, default: false },
    expertSourceId: { type: Schema.Types.ObjectId, ref: 'ExpertSource' },
    contactNumber: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: true },
    revenueSharePct: {
      type: Number,
      default: 70,
      min: 0,
      max: 100,
      comment: 'Porcentaje que recibe el handicapper (plataforma recibe 100 - este valor)',
    },
    stats: {
      totalForecasts: { type: Number, default: 0 },
      totalRacesWithResult: { type: Number, default: 0 },
      hit1st: { type: Number, default: 0 },
      hit2nd: { type: Number, default: 0 },
      hit3rd: { type: Number, default: 0 },
      hitAny: { type: Number, default: 0 },
      pct1st: { type: Number, default: 0 },
      pct2nd: { type: Number, default: 0 },
      pct3rd: { type: Number, default: 0 },
      pctGeneral: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

HandicapperProfileSchema.index({ userId: 1 }, { sparse: true, unique: true });
HandicapperProfileSchema.index({ pseudonym: 1 });
HandicapperProfileSchema.index({ isActive: 1, isPublic: 1 });

export default mongoose.models.HandicapperProfile ||
  mongoose.model<IHandicapperProfile>('HandicapperProfile', HandicapperProfileSchema);
