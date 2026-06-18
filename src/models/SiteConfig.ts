import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteConfig extends Document {
  key: string;
  value: unknown;
  updatedAt: Date;
}

const SiteConfigSchema = new Schema<ISiteConfig>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.SiteConfig ||
  mongoose.model<ISiteConfig>('SiteConfig', SiteConfigSchema);

// ── Helper ────────────────────────────────────────────────────────────────────

export async function getSiteConfig<T = unknown>(key: string, defaultValue: T): Promise<T> {
  const doc = await mongoose.models.SiteConfig?.findOne({ key }).lean<{ value: T }>();
  return doc ? (doc.value as T) : defaultValue;
}

export async function setSiteConfig(key: string, value: unknown): Promise<void> {
  await mongoose.models.SiteConfig?.findOneAndUpdate(
    { key },
    { $set: { key, value } },
    { upsert: true }
  );
}
