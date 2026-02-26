import mongoose, { Schema, Document, Types } from 'mongoose';
import { FORECAST_LABELS, ForecastLabel } from '@/models/Forecast';

export type ExpertForecastStatus = 'pending_review' | 'published' | 'rejected';

export interface IExpertMark {
  preferenceOrder: number;
  hasExplicitOrder?: boolean;
  rawName: string;
  rawLabel?: string;
  resolvedHorseName?: string;
  resolvedEntryId?: Types.ObjectId;
  dorsalNumber?: number;
  label: ForecastLabel;
  matchConfidence: number;
}

export interface IExpertForecast extends Document {
  expertSourceId: Types.ObjectId;
  meetingId: Types.ObjectId;
  raceId: Types.ObjectId;
  raceNumber: number;
  marks: IExpertMark[];
  sourceUrl?: string;
  sourceType: 'youtube' | 'social_text' | 'image_ocr' | 'audio';
  rawContent?: string;
  contentHash: string;
  status: ExpertForecastStatus;
  publishedAt?: Date;
  reviewedBy?: Types.ObjectId;
  result?: {
    evaluated: boolean;
    evaluatedAt?: Date;
    hit1st: boolean;
    hit2nd: boolean;
    hit3rd: boolean;
    hitAny: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ExpertMarkSchema = new Schema<IExpertMark>(
  {
    preferenceOrder: { type: Number, required: true, min: 1, max: 5 },
    hasExplicitOrder: { type: Boolean },
    rawName: { type: String, required: true, trim: true },
    rawLabel: { type: String, trim: true },
    resolvedHorseName: { type: String, trim: true },
    resolvedEntryId: { type: Schema.Types.ObjectId, ref: 'Entry' },
    dorsalNumber: { type: Number },
    label: { type: String, enum: FORECAST_LABELS, required: true },
    matchConfidence: { type: Number, default: 1.0, min: 0, max: 1 },
  },
  { _id: false }
);

const ExpertForecastSchema = new Schema<IExpertForecast>(
  {
    expertSourceId: { type: Schema.Types.ObjectId, ref: 'ExpertSource', required: true },
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true },
    raceId: { type: Schema.Types.ObjectId, ref: 'Race', required: true },
    raceNumber: { type: Number, required: true },
    marks: {
      type: [ExpertMarkSchema],
      validate: {
        validator: (m: IExpertMark[]) => m.length >= 1 && m.length <= 5,
        message: 'Un pronóstico debe tener entre 1 y 5 marcas.',
      },
    },
    sourceUrl: { type: String, trim: true },
    sourceType: {
      type: String,
      enum: ['youtube', 'social_text', 'image_ocr', 'audio'],
      required: true,
    },
    rawContent: { type: String },
    contentHash: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending_review', 'published', 'rejected'],
      default: 'pending_review',
    },
    publishedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    result: {
      evaluated: { type: Boolean, default: false },
      evaluatedAt: { type: Date },
      hit1st: { type: Boolean },
      hit2nd: { type: Boolean },
      hit3rd: { type: Boolean },
      hitAny: { type: Boolean },
    },
  },
  { timestamps: true }
);

ExpertForecastSchema.index({ contentHash: 1 }, { unique: true });
ExpertForecastSchema.index({ expertSourceId: 1, meetingId: 1 });
ExpertForecastSchema.index({ meetingId: 1, status: 1 });

export default mongoose.models.ExpertForecast ||
  mongoose.model<IExpertForecast>('ExpertForecast', ExpertForecastSchema);
