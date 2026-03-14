import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IHandicapperAudio extends Document {
  handicapperId: Types.ObjectId;
  meetingId?: Types.ObjectId;       // optional — ties audio to a specific race day
  title: string;                    // e.g. "Análisis Reunión 45 La Rinconada"
  description?: string;
  durationSecs?: number;
  fileUrl: string;                  // Vercel Blob or external URL
  priceGolds: number;               // 0 = free preview
  revenueSharePct: number;          // handicapper's cut (e.g. 70 → platform keeps 30%)
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HandicapperAudioSchema = new Schema<IHandicapperAudio>(
  {
    handicapperId:  { type: Schema.Types.ObjectId, ref: 'HandicapperProfile', required: true },
    meetingId:      { type: Schema.Types.ObjectId, ref: 'Meeting' },
    title:          { type: String, required: true, trim: true, maxlength: 120 },
    description:    { type: String, trim: true, maxlength: 500 },
    durationSecs:   { type: Number, min: 0 },
    fileUrl:        { type: String, required: true, trim: true },
    priceGolds:     { type: Number, required: true, default: 0, min: 0 },
    revenueSharePct:{ type: Number, default: 70, min: 0, max: 100 },
    isPublished:    { type: Boolean, default: false },
    publishedAt:    { type: Date },
  },
  { timestamps: true }
);

HandicapperAudioSchema.index({ handicapperId: 1, isPublished: 1, createdAt: -1 });
HandicapperAudioSchema.index({ meetingId: 1, isPublished: 1 });

export default mongoose.models.HandicapperAudio ||
  mongoose.model<IHandicapperAudio>('HandicapperAudio', HandicapperAudioSchema);
