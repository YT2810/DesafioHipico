import mongoose, { Schema, Document, Types } from 'mongoose';

export type EntryStatus = 'declared' | 'confirmed' | 'scratched' | 'finished';

export interface IFinishResult {
  finishPosition?: number;
  officialTime?: string;
  distanceMargin?: string;
  isScratched: boolean;
  scratchReason?: string;
}

export interface IEntry extends Document {
  raceId: Types.ObjectId;
  horseId: Types.ObjectId;
  jockeyId: Types.ObjectId;
  trainerId: Types.ObjectId;
  studId?: Types.ObjectId;
  dorsalNumber: number;
  postPosition: number;
  weight: number;
  weightRaw?: string;
  morningLineOdds?: number;
  finalOdds?: number;
  medication?: string;
  implements?: string;
  status: EntryStatus;
  result: IFinishResult;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const EntrySchema = new Schema<IEntry>(
  {
    raceId: { type: Schema.Types.ObjectId, ref: 'Race', required: true },
    horseId: { type: Schema.Types.ObjectId, ref: 'Horse', required: true },
    jockeyId: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
    trainerId: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
    dorsalNumber: { type: Number, required: true },
    postPosition: { type: Number, required: true },
    weight: { type: Number, required: true },
    weightRaw: { type: String, trim: true },
    morningLineOdds: { type: Number },
    finalOdds: { type: Number },
    status: {
      type: String,
      enum: ['declared', 'confirmed', 'scratched', 'finished'],
      default: 'declared',
    },
    studId: { type: Schema.Types.ObjectId, ref: 'Stud' },
    medication: { type: String, trim: true },
    implements: { type: String, trim: true },
    result: {
      finishPosition: { type: Number },
      officialTime: { type: String },
      distanceMargin: { type: String },
      isScratched: { type: Boolean, default: false },
      scratchReason: { type: String },
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

EntrySchema.index({ raceId: 1, dorsalNumber: 1 }, { unique: true });
EntrySchema.index({ raceId: 1, horseId: 1 }, { unique: true });
EntrySchema.index({ horseId: 1 });
EntrySchema.index({ jockeyId: 1 });
EntrySchema.index({ trainerId: 1 });

export default mongoose.models.Entry || mongoose.model<IEntry>('Entry', EntrySchema);
