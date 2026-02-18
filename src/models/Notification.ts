import mongoose, { Schema, Document, Types } from 'mongoose';

export type NotificationType =
  | 'new_forecast'
  | 'forecast_updated'
  | 'race_result'
  | 'gold_purchase'
  | 'gold_low'
  | 'system';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['new_forecast', 'forecast_updated', 'race_result', 'gold_purchase', 'gold_low', 'system'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    data: { type: Map, of: String },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema);
