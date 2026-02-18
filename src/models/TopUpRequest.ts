import mongoose, { Schema, Document, Types } from 'mongoose';
export { VENEZUELAN_BANKS } from '@/lib/constants';
export type { VenezuelanBank } from '@/lib/constants';

export type TopUpStatus = 'pending' | 'approved' | 'rejected';

export interface ITopUpRequest extends Document {
  userId: Types.ObjectId;
  amountUsd: number;
  goldAmount: number;
  referenceNumber: string;
  phone: string;
  legalId: string;
  bank: string;
  amountBs: number;
  paymentDate: string;      // YYYY-MM-DD as entered by user
  receiptUrl?: string;      // uploaded screenshot URL
  status: TopUpStatus;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TopUpRequestSchema = new Schema<ITopUpRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amountUsd: { type: Number, required: true, min: 10 },
    goldAmount: { type: Number, required: true },
    referenceNumber: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    legalId: { type: String, required: true, trim: true },
    bank: { type: String, required: true, trim: true },
    amountBs: { type: Number, required: true, min: 0 },
    paymentDate: { type: String, required: true, trim: true },
    receiptUrl: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

TopUpRequestSchema.index({ userId: 1, createdAt: -1 });
TopUpRequestSchema.index({ status: 1, createdAt: -1 });
TopUpRequestSchema.index({ referenceNumber: 1 }, { unique: true });

export default mongoose.models.TopUpRequest ||
  mongoose.model<ITopUpRequest>('TopUpRequest', TopUpRequestSchema);
