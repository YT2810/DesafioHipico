import mongoose, { Schema, Document, Types } from 'mongoose';

export type WorkoutType = 'EP' | 'ES' | 'AP' | 'galopo';

export interface IWorkoutEntry extends Document {
  horseId?: Types.ObjectId;
  horseName: string;
  trackId: Types.ObjectId;
  workoutDate: Date;
  distance: number;
  workoutType: WorkoutType;
  splits: string;
  comment?: string;
  jockeyName?: string;
  trainerName?: string;
  daysRest?: number;
  raceNumber?: string;
  sourceFile?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkoutEntrySchema = new Schema<IWorkoutEntry>(
  {
    horseId:     { type: Schema.Types.ObjectId, ref: 'Horse' },
    horseName:   { type: String, required: true, trim: true },
    trackId:     { type: Schema.Types.ObjectId, ref: 'Track', required: true },
    workoutDate: { type: Date, required: true },
    distance:    { type: Number, required: true },
    workoutType: { type: String, enum: ['EP', 'ES', 'AP', 'galopo'], required: true },
    splits:      { type: String, trim: true, default: '' },
    comment:     { type: String, trim: true },
    jockeyName:  { type: String, trim: true },
    trainerName: { type: String, trim: true },
    daysRest:    { type: Number },
    raceNumber:  { type: String, trim: true },
    sourceFile:  { type: String, trim: true },
  },
  { timestamps: true }
);

WorkoutEntrySchema.index({ trackId: 1, workoutDate: -1 });
WorkoutEntrySchema.index({ horseName: 1, workoutDate: -1 });
WorkoutEntrySchema.index({ horseId: 1, workoutDate: -1 }, { sparse: true });

export default mongoose.models.WorkoutEntry ||
  mongoose.model<IWorkoutEntry>('WorkoutEntry', WorkoutEntrySchema);
