import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Notification types by audience:
 *
 * ADMIN/STAFF:
 *   topup_pending       — new top-up request waiting review
 *   handicapper_request — new handicapper role request
 *
 * USERS (customers):
 *   topup_approved      — their top-up was approved
 *   topup_rejected      — their top-up was rejected
 *   followed_forecast   — a handicapper they follow published a forecast
 *   new_meeting         — new race meeting scheduled (all users)
 *   gold_low            — balance < 3 Golds warning
 *
 * HANDICAPPERS:
 *   new_meeting_hcp     — new meeting available to forecast
 *   vip_purchase        — a user bought their VIP plan
 *   request_approved    — their handicapper request was approved
 *   request_rejected    — their handicapper request was rejected
 *
 * GENERAL:
 *   system              — platform announcements
 */
export type NotificationType =
  | 'topup_pending'
  | 'handicapper_request'
  | 'topup_approved'
  | 'topup_rejected'
  | 'followed_forecast'
  | 'new_meeting'
  | 'new_meeting_hcp'
  | 'gold_low'
  | 'vip_purchase'
  | 'request_approved'
  | 'request_rejected'
  | 'system';

export const NOTIFICATION_TYPES: NotificationType[] = [
  'topup_pending', 'handicapper_request',
  'topup_approved', 'topup_rejected',
  'followed_forecast', 'new_meeting', 'new_meeting_hcp',
  'gold_low', 'vip_purchase', 'request_approved', 'request_rejected',
  'system',
];

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  data?: Record<string, string>;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type:    { type: String, enum: NOTIFICATION_TYPES, required: true },
    title:   { type: String, required: true, trim: true, maxlength: 120 },
    body:    { type: String, required: true, trim: true, maxlength: 400 },
    link:    { type: String, trim: true },
    data:    { type: Map, of: String },
    read:    { type: Boolean, default: false },
    readAt:  { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // auto-delete after 90 days

export default mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema);
