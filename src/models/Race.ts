import mongoose, { Schema, Document, Types } from 'mongoose';

export type RaceStatus = 'scheduled' | 'active' | 'finished' | 'cancelled';

export interface IPrizePool {
  bs: number;
  usd: number;
}

export interface IPrizeDistribution {
  first: number;
  second: number;
  third: number;
  fourth: number;
  fifth: number;
  breederBonus: number;
}

export type GameType = 'GANADOR' | 'PLACE' | 'EXACTA' | 'TRIFECTA' | 'SUPERFECTA' | 'QUINELA' | 'DOBLE_SELECCION';

export interface IPayout {
  combination: string;
  amount: number;
}

export interface IPayouts {
  winner?: IPayout[];
  exacta?: IPayout[];
  trifecta?: IPayout[];
  superfecta?: IPayout[];
  quinela?: IPayout[];
  dobleSeleccion?: IPayout[];
}

export interface ITimeSplit {
  distance: number;
  time: string;
}

export interface IRace extends Document {
  meetingId: Types.ObjectId;
  raceNumber: number;
  annualRaceNumber?: number;
  llamado?: number;
  distance: number;
  scheduledTime: string;
  prizePool: IPrizePool;
  bonoPrimerCriador?: number;
  prizeDistribution?: IPrizeDistribution;
  conditions?: string;
  surface?: 'dirt' | 'turf' | 'synthetic';
  games: GameType[];
  payouts: IPayouts;
  timeSplits: ITimeSplit[];
  officialTime?: string;
  status: RaceStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const RaceSchema = new Schema<IRace>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true },
    raceNumber: { type: Number, required: true },
    distance: { type: Number, required: true },
    scheduledTime: { type: String, trim: true },
    prizePool: {
      bs: { type: Number, default: 0 },
      usd: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'finished', 'cancelled'],
      default: 'scheduled',
    },
    annualRaceNumber: { type: Number },
    llamado: { type: Number },
    conditions: { type: String, trim: true },
    surface: { type: String, enum: ['dirt', 'turf', 'synthetic'] },
    bonoPrimerCriador: { type: Number },
    prizeDistribution: {
      first: { type: Number },
      second: { type: Number },
      third: { type: Number },
      fourth: { type: Number },
      fifth: { type: Number },
      breederBonus: { type: Number },
    },
    games: [{ type: String, enum: ['GANADOR', 'PLACE', 'EXACTA', 'TRIFECTA', 'SUPERFECTA', 'QUINELA', 'DOBLE_SELECCION'] }],
    payouts: {
      winner: [{ combination: String, amount: Number }],
      exacta: [{ combination: String, amount: Number }],
      trifecta: [{ combination: String, amount: Number }],
      superfecta: [{ combination: String, amount: Number }],
      quinela: [{ combination: String, amount: Number }],
      dobleSeleccion: [{ combination: String, amount: Number }],
    },
    timeSplits: [{ distance: Number, time: String }],
    officialTime: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

RaceSchema.index({ meetingId: 1, raceNumber: 1 }, { unique: true });

export default mongoose.models.Race || mongoose.model<IRace>('Race', RaceSchema);
