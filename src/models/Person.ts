import mongoose, { Schema, Document } from 'mongoose';

export type PersonType = 'jockey' | 'trainer' | 'owner' | 'breeder';

export interface IPerson extends Document {
  name: string;
  type: PersonType;
  licenseId: string;
  nationality?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PersonSchema = new Schema<IPerson>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['jockey', 'trainer', 'owner', 'breeder'],
      required: true,
    },
    licenseId: { type: String, required: true, trim: true },
    nationality: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

PersonSchema.index({ licenseId: 1, type: 1 }, { unique: true });
PersonSchema.index({ name: 1, type: 1 });

export default mongoose.models.Person || mongoose.model<IPerson>('Person', PersonSchema);
