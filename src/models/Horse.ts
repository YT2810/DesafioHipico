import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPedigree {
  sire?: string;
  dam?: string;
  sireSire?: string;
  damSire?: string;
}

export interface IStudHistoryEntry {
  studId: Types.ObjectId;
  studName: string;
  from: Date;
  to?: Date;
}

export interface IHorse extends Document {
  name: string;
  pedigree: IPedigree;
  birthDate?: Date;
  color?: string;
  gender?: 'male' | 'female' | 'gelding';
  registrationId?: string;
  currentStudId?: Types.ObjectId;
  studHistory: IStudHistoryEntry[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const HorseSchema = new Schema<IHorse>(
  {
    name: { type: String, required: true, trim: true },
    pedigree: {
      sire: { type: String, trim: true },
      dam: { type: String, trim: true },
      sireSire: { type: String, trim: true },
      damSire: { type: String, trim: true },
    },
    birthDate: { type: Date },
    color: { type: String, trim: true },
    gender: { type: String, enum: ['male', 'female', 'gelding'] },
    registrationId: { type: String, trim: true },
    currentStudId: { type: Schema.Types.ObjectId, ref: 'Stud' },
    studHistory: [
      {
        studId: { type: Schema.Types.ObjectId, ref: 'Stud', required: true },
        studName: { type: String, required: true },
        from: { type: Date, required: true },
        to: { type: Date },
      },
    ],
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

HorseSchema.index({ name: 1 });
HorseSchema.index({ registrationId: 1 }, { sparse: true });
HorseSchema.index({ currentStudId: 1 }, { sparse: true });

export default mongoose.models.Horse || mongoose.model<IHorse>('Horse', HorseSchema);
