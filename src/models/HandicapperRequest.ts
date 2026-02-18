import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IHandicapperRequest extends Document {
  userId: Types.ObjectId;
  pseudonym: string;
  bio: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
}

const HandicapperRequestSchema = new Schema<IHandicapperRequest>(
  {
    userId:          { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    pseudonym:       { type: String, required: true, trim: true },
    bio:             { type: String, default: '', trim: true },
    status:          { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, trim: true },
    reviewedBy:      { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt:      { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

HandicapperRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.HandicapperRequest ||
  mongoose.model<IHandicapperRequest>('HandicapperRequest', HandicapperRequestSchema);
