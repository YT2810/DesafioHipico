import mongoose, { Schema, Document, Types } from 'mongoose';

export type MeetingStatus = 'scheduled' | 'active' | 'finished' | 'cancelled';

export interface IMeeting extends Document {
  trackId: Types.ObjectId;
  date: Date;
  meetingNumber: number;
  status: MeetingStatus;
  summaryVideoUrl?: string;
  streamUrl?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingSchema = new Schema<IMeeting>(
  {
    trackId: { type: Schema.Types.ObjectId, ref: 'Track', required: true },
    date: { type: Date, required: true },
    meetingNumber: { type: Number, required: true },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'finished', 'cancelled'],
      default: 'scheduled',
    },
    summaryVideoUrl: { type: String, trim: true },
    streamUrl: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

MeetingSchema.index({ trackId: 1, date: 1, meetingNumber: 1 }, { unique: true });

export default mongoose.models.Meeting || mongoose.model<IMeeting>('Meeting', MeetingSchema);
