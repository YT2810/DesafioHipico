import mongoose, { Schema, Document } from 'mongoose';

export interface IStud extends Document {
  name: string;
  ownerName: string;
  colorsDescription: string;
  active: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const StudSchema = new Schema<IStud>(
  {
    name: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    colorsDescription: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

StudSchema.index({ name: 1 }, { unique: true });
StudSchema.index({ ownerName: 1 });

export default mongoose.models.Stud || mongoose.model<IStud>('Stud', StudSchema);
