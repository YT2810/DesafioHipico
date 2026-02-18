import mongoose, { Schema, Document, Types } from 'mongoose';

export type GoldTxType =
  | 'purchase'
  | 'race_unlock'
  | 'refund'
  | 'bonus'
  | 'handicapper_payout'
  | 'platform_fee';

export interface IGoldTransaction extends Document {
  userId: Types.ObjectId;
  type: GoldTxType;
  amount: number;
  balanceAfter: number;
  description: string;
  raceId?: Types.ObjectId;
  forecastId?: Types.ObjectId;
  relatedTxId?: Types.ObjectId;
  revenueShare?: {
    handicapperPct: number;
    platformPct: number;
    handicapperId: Types.ObjectId;
    handicapperAmount: number;
    platformAmount: number;
  };
  externalRef?: string;
  createdAt: Date;
}

const GoldTransactionSchema = new Schema<IGoldTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['purchase', 'race_unlock', 'refund', 'bonus', 'handicapper_payout', 'platform_fee'],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String, required: true, trim: true },
    raceId: { type: Schema.Types.ObjectId, ref: 'Race' },
    forecastId: { type: Schema.Types.ObjectId, ref: 'Forecast' },
    relatedTxId: { type: Schema.Types.ObjectId, ref: 'GoldTransaction' },
    revenueShare: {
      handicapperPct: { type: Number },
      platformPct: { type: Number },
      handicapperId: { type: Schema.Types.ObjectId, ref: 'HandicapperProfile' },
      handicapperAmount: { type: Number },
      platformAmount: { type: Number },
    },
    externalRef: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

GoldTransactionSchema.index({ userId: 1, createdAt: -1 });
GoldTransactionSchema.index({ type: 1, createdAt: -1 });

export default mongoose.models.GoldTransaction ||
  mongoose.model<IGoldTransaction>('GoldTransaction', GoldTransactionSchema);
