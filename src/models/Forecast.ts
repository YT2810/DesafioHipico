import mongoose, { Schema, Document, Types } from 'mongoose';

export const FORECAST_LABELS = [
  'Línea',
  'Casi Fijo',
  'Súper Especial',
  'Buen Dividendo',
  'Batacazo',
] as const;

export type ForecastLabel = typeof FORECAST_LABELS[number];

export type ForecastSource = 'manual' | 'youtube' | 'social_text' | 'image_ocr' | 'audio';

export interface IForecastMark {
  preferenceOrder: number;
  horseName: string;
  dorsalNumber?: number;
  label: ForecastLabel;
  note?: string;
}

export interface IForecast extends Document {
  handicapperId: Types.ObjectId;
  raceId: Types.ObjectId;
  meetingId: Types.ObjectId;
  marks: IForecastMark[];
  source: ForecastSource;
  sourceRef?: string;
  isPublished: boolean;
  isExclusive: boolean;
  isVip: boolean;
  publishedAt?: Date;
  result?: {
    evaluated: boolean;
    evaluatedAt?: Date;
    hit1st: boolean;
    hit2nd: boolean;
    hit3rd: boolean;
    hitAny: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ForecastMarkSchema = new Schema<IForecastMark>(
  {
    preferenceOrder: { type: Number, required: true, min: 1, max: 5 },
    horseName: { type: String, required: true, trim: true },
    dorsalNumber: { type: Number },
    label: { type: String, enum: FORECAST_LABELS, required: true },
    note: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false }
);

const ForecastSchema = new Schema<IForecast>(
  {
    handicapperId: { type: Schema.Types.ObjectId, ref: 'HandicapperProfile', required: true },
    raceId: { type: Schema.Types.ObjectId, ref: 'Race', required: true },
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true },
    marks: {
      type: [ForecastMarkSchema],
      validate: {
        validator: (marks: IForecastMark[]) => marks.length >= 1 && marks.length <= 5,
        message: 'Un pronóstico debe tener entre 1 y 5 marcas.',
      },
    },
    source: {
      type: String,
      enum: ['manual', 'youtube', 'social_text', 'image_ocr', 'audio'],
      default: 'manual',
    },
    sourceRef: { type: String, trim: true },
    isPublished: { type: Boolean, default: false },
    isExclusive: { type: Boolean, default: false },
    isVip: { type: Boolean, default: false },
    publishedAt: { type: Date },
    result: {
      evaluated: { type: Boolean, default: false },
      evaluatedAt: { type: Date },
      hit1st: { type: Boolean },
      hit2nd: { type: Boolean },
      hit3rd: { type: Boolean },
      hitAny: { type: Boolean },
    },
  },
  { timestamps: true }
);

ForecastSchema.index({ handicapperId: 1, raceId: 1 }, { unique: true });
ForecastSchema.index({ meetingId: 1, isPublished: 1 });
ForecastSchema.index({ raceId: 1, isPublished: 1 });

export default mongoose.models.Forecast ||
  mongoose.model<IForecast>('Forecast', ForecastSchema);
