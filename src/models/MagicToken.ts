import mongoose, { Schema, Document } from 'mongoose';

export interface IMagicToken extends Document {
  email: string;
  token: string;
  callbackUrl: string;
  expiresAt: Date;
  used: boolean;
}

const MagicTokenSchema = new Schema<IMagicToken>({
  email:       { type: String, required: true, lowercase: true, trim: true },
  token:       { type: String, required: true, unique: true },
  callbackUrl: { type: String, default: '/' },
  expiresAt:   { type: Date, required: true },
  used:        { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });

MagicTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
MagicTokenSchema.index({ token: 1 });

export default mongoose.models.MagicToken ||
  mongoose.model<IMagicToken>('MagicToken', MagicTokenSchema);
