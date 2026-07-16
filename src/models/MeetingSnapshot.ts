import mongoose, { Schema, Document } from 'mongoose';

export interface IMeetingSnapshot extends Document {
  meetingId: mongoose.Types.ObjectId;
  generatedAt: Date;
  data: any;
}

const MeetingSnapshotSchema = new Schema<IMeetingSnapshot>({
  meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true, unique: true },
  generatedAt: { type: Date, default: Date.now },
  data: { type: Schema.Types.Mixed, required: true },
});

MeetingSnapshotSchema.index({ meetingId: 1 }, { unique: true });

export default mongoose.models.MeetingSnapshot ||
  mongoose.model<IMeetingSnapshot>('MeetingSnapshot', MeetingSnapshotSchema);
