import mongoose, { Schema, Document } from 'mongoose';

/**
 * Daily aggregated ad metrics — our own first-party tracking.
 * One doc per campaign + slot + day. Incremented by the impression beacon
 * and the click-through redirect (/api/go/sponsor).
 */
export interface IAdDailyStat extends Document {
  campaignSlug: string;
  slot: string;
  date: string; // 'YYYY-MM-DD'
  impressions: number;
  clicks: number;
}

const AdDailyStatSchema = new Schema<IAdDailyStat>(
  {
    campaignSlug: { type: String, required: true },
    slot:         { type: String, required: true },
    date:         { type: String, required: true },
    impressions:  { type: Number, default: 0 },
    clicks:       { type: Number, default: 0 },
  },
  { timestamps: true }
);

AdDailyStatSchema.index({ campaignSlug: 1, slot: 1, date: 1 }, { unique: true });
AdDailyStatSchema.index({ date: -1 });

export default mongoose.models.AdDailyStat ||
  mongoose.model<IAdDailyStat>('AdDailyStat', AdDailyStatSchema);
