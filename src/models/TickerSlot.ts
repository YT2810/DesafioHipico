/**
 * TickerSlot — commercial/sponsor slots that appear in the ExpertTickerBar.
 * Types:
 *   'sponsor'     — paid advertising by external company
 *   'handicapper' — promoted handicapper card (extra visibility, configurable)
 *   'promo'       — platform's own promotions
 */
import mongoose, { Schema, Document } from 'mongoose';

export type TickerSlotType = 'sponsor' | 'handicapper' | 'promo';

export interface ITickerSlot extends Document {
  type: TickerSlotType;
  label: string;             // main text, e.g. company name or promo headline
  sublabel?: string;         // secondary text, e.g. "Patrocinador oficial"
  badgeText?: string;        // e.g. "🔥 Oferta", "📢 Nuevo"
  accentColor?: string;      // hex, e.g. "#D4AF37"  — defaults to gold
  logoUrl?: string;          // optional image/icon URL
  actionUrl?: string;        // click target — external link or internal route
  actionLabel?: string;      // CTA text in drawer, e.g. "Ver oferta"
  isActive: boolean;
  startsAt?: Date;
  endsAt?: Date;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const TickerSlotSchema = new Schema<ITickerSlot>(
  {
    type:         { type: String, enum: ['sponsor', 'handicapper', 'promo'], required: true },
    label:        { type: String, required: true, trim: true, maxlength: 60 },
    sublabel:     { type: String, trim: true, maxlength: 80 },
    badgeText:    { type: String, trim: true, maxlength: 30 },
    accentColor:  { type: String, trim: true, default: '#D4AF37' },
    logoUrl:      { type: String, trim: true },
    actionUrl:    { type: String, trim: true },
    actionLabel:  { type: String, trim: true, maxlength: 40 },
    isActive:     { type: Boolean, default: true },
    startsAt:     { type: Date },
    endsAt:       { type: Date },
    sortOrder:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

TickerSlotSchema.index({ isActive: 1, sortOrder: 1 });

export default mongoose.models.TickerSlot ||
  mongoose.model<ITickerSlot>('TickerSlot', TickerSlotSchema);
