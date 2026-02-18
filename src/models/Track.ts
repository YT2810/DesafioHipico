import mongoose, { Schema, Document } from 'mongoose';

export interface ITrack extends Document {
  name: string;
  location: string;
  country: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const TrackSchema = new Schema<ITrack>(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: 'VE' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

TrackSchema.index({ name: 1, country: 1 }, { unique: true });

export default mongoose.models.Track || mongoose.model<ITrack>('Track', TrackSchema);
