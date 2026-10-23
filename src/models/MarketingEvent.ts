import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * MarketingEvent — generic interest/intent tracking for marketing lists.
 * First use: VIP 5y6 widget opens ('vip5y6_open'), counted weekly
 * (Venezuelan Monday–Sunday week, same as the National Pass).
 * Anonymous opens are counted too (userId null) for totals,
 * but only logged users feed the interest lists.
 */

export interface IMarketingEvent extends Document {
  userId?: Types.ObjectId;
  event: string;
  meta?: Record<string, unknown>;
  weekStart: Date;
  createdAt: Date;
}

const MarketingEventSchema = new Schema<IMarketingEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    event: { type: String, required: true, index: true },
    meta: { type: Schema.Types.Mixed, default: {} },
    weekStart: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

MarketingEventSchema.index({ event: 1, weekStart: -1 });
MarketingEventSchema.index({ event: 1, createdAt: -1 });
MarketingEventSchema.index({ userId: 1, event: 1, createdAt: -1 });

export default mongoose.models.MarketingEvent ||
  mongoose.model<IMarketingEvent>('MarketingEvent', MarketingEventSchema);
