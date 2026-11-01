import mongoose, { Schema, Document } from 'mongoose';

export interface ISponsorCreative {
  badgeText?: string;   // ej. "Sponsor Oficial", "Publicidad"
  title: string;        // titular principal
  subtitle?: string;    // texto secundario
  ctaText: string;      // texto del botón
  logoUrl?: string;     // imagen/logo del anunciante (opcional)
  accentColor?: string; // color de acento del banner (hex)
}

export interface ISponsorCampaign extends Document {
  slug: string;             // identificador único, ej. 'retrospectos-betting-co'
  brand: string;            // nombre visible del anunciante
  targetUrl: string;        // URL de referidos del anunciante
  slots: string[];          // placements donde aparece: 'retrospectos_inline', 'resultados_inline', 'header_leaderboard', 'sticky_mobile'
  active: boolean;
  isHouseAd: boolean;       // true = publicidad propia (se oculta a usuarios con pase activo)
  creative: ISponsorCreative;
  startsAt?: Date;
  endsAt?: Date;
  notes?: string;           // notas internas del deal (monto, contacto, etc.)
  createdAt: Date;
  updatedAt: Date;
}

const SponsorCampaignSchema = new Schema<ISponsorCampaign>(
  {
    slug:       { type: String, required: true, unique: true, trim: true, lowercase: true },
    brand:      { type: String, required: true, trim: true },
    targetUrl:  { type: String, required: true },
    slots:      { type: [String], required: true, default: [] },
    active:     { type: Boolean, default: true },
    isHouseAd:  { type: Boolean, default: false },
    creative: {
      badgeText:   { type: String, default: 'Publicidad' },
      title:       { type: String, required: true },
      subtitle:    { type: String, default: '' },
      ctaText:     { type: String, required: true, default: 'Ver más' },
      logoUrl:     { type: String, default: '' },
      accentColor: { type: String, default: '#D4AF37' },
    },
    startsAt: { type: Date },
    endsAt:   { type: Date },
    notes:    { type: String, default: '' },
  },
  { timestamps: true }
);

SponsorCampaignSchema.index({ active: 1, slots: 1 });

export default mongoose.models.SponsorCampaign ||
  mongoose.model<ISponsorCampaign>('SponsorCampaign', SponsorCampaignSchema);
