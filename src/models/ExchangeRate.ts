/**
 * ExchangeRate — stores the current USD/VES (Bolívares) exchange rate.
 * Only one active record at a time (upsert by key='bcv').
 * Admin updates it manually; the system warns if it's stale (>24h).
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExchangeRate extends Document {
  key: string;           // always 'bcv'
  rateVes: number;       // Bs per 1 USD
  updatedBy: Types.ObjectId;
  updatedAt: Date;
  createdAt: Date;
}

const ExchangeRateSchema = new Schema<IExchangeRate>(
  {
    key:       { type: String, default: 'bcv', unique: true },
    rateVes:   { type: Number, required: true, min: 0.01 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.models.ExchangeRate ||
  mongoose.model<IExchangeRate>('ExchangeRate', ExchangeRateSchema);
