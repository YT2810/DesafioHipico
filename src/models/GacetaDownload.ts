import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGacetaDownload extends Document {
  userId: Types.ObjectId;
  meetingId: Types.ObjectId;
  downloadedAt: Date;
  tipsterName?: string;   // which tipster's picks were shown
  userAgent?: string;     // browser info
}

const GacetaDownloadSchema = new Schema<IGacetaDownload>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    meetingId:   { type: Schema.Types.ObjectId, ref: 'Meeting', required: true },
    downloadedAt:{ type: Date, default: Date.now },
    tipsterName: { type: String },
    userAgent:   { type: String },
  },
  { timestamps: false }
);

GacetaDownloadSchema.index({ userId: 1, meetingId: 1 });
GacetaDownloadSchema.index({ meetingId: 1, downloadedAt: -1 });
GacetaDownloadSchema.index({ downloadedAt: -1 });

export default mongoose.models.GacetaDownload ||
  mongoose.model<IGacetaDownload>('GacetaDownload', GacetaDownloadSchema);
