import mongoose, { Schema, Document, Types } from 'mongoose';

export type AgentCategory =
  | 'analisis_carrera'
  | 'analisis_caballo'
  | 'traqueo'
  | 'pronostico'
  | 'resultado'
  | 'programa'
  | 'handicapper'
  | 'general_hipismo'
  | 'off_topic'
  | 'otro';

export interface IAgentLog extends Document {
  userId?: Types.ObjectId;
  query: string;
  category: AgentCategory;
  meetingId?: string;
  raceNumber?: number;
  horseName?: string;
  createdAt: Date;
}

const AgentLogSchema = new Schema<IAgentLog>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User' },
    query:       { type: String, required: true, maxlength: 500 },
    category:    { type: String, enum: ['analisis_carrera','analisis_caballo','traqueo','pronostico','resultado','programa','handicapper','general_hipismo','off_topic','otro'], default: 'otro' },
    meetingId:   { type: String },
    raceNumber:  { type: Number },
    horseName:   { type: String, trim: true },
  },
  { timestamps: true }
);

AgentLogSchema.index({ userId: 1, createdAt: -1 });
AgentLogSchema.index({ category: 1, createdAt: -1 });
AgentLogSchema.index({ horseName: 1 });

export default mongoose.models.AgentLog ||
  mongoose.model<IAgentLog>('AgentLog', AgentLogSchema);
