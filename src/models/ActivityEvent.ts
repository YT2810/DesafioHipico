/**
 * ActivityEvent — lightweight public social-proof events.
 *
 * Types:
 *   pass_activation  — user activated a National Pass (weekly/monthly)
 *   race_result      — race result saved with FV winner position
 *
 * userId is optional for race_result events (platform-level announcement).
 */
import mongoose, { Schema, Document, Types } from 'mongoose';

export type ActivityEventType = 'pass_activation' | 'race_result';

export interface IActivityEvent extends Document {
  type: ActivityEventType;
  userId?: Types.ObjectId;
  message: string;           // human-readable, already rendered for the toast
  meta?: Record<string, unknown>;  // extra data (raceId, meetingId, fvRank, etc.)
  createdAt: Date;
}

const ActivityEventSchema = new Schema<IActivityEvent>(
  {
    type:    { type: String, enum: ['pass_activation', 'race_result'], required: true, index: true },
    userId:  { type: Schema.Types.ObjectId, ref: 'User' },
    message: { type: String, required: true },
    meta:    { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivityEventSchema.index({ createdAt: -1 });

export default mongoose.models.ActivityEvent as mongoose.Model<IActivityEvent>
  ?? mongoose.model<IActivityEvent>('ActivityEvent', ActivityEventSchema);
