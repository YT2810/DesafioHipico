import mongoose, { Schema, Document } from 'mongoose';

export type MelliIntent =
  | 'consensus_pick'      // Pedir fijo/marca de una carrera
  | 'top_picks_all'       // Pedir marcas de todas las carreras
  | 'pack_5y6'            // Pedir las 6 válidas del 5y6
  | 'best_workout'        // Mejor trabajo/traqueo de una carrera
  | 'workouts_all'        // Traqueos generales del día
  | 'horse_workout'       // Trabajo de un caballo específico por nombre o dorsal
  | 'horse_detail'        // Info de un caballo específico
  | 'eliminated'          // Caballos eliminados/retirados
  | 'race_program'        // Programa/inscritos de una carrera
  | 'full_program'        // Programa completo del día
  | 'betting'             // Términos de apuestas (5y6, cuadro, taquilla, etc.)
  | 'race_analysis'       // Análisis de carrera (remate, split, parciales, etc.)
  | 'jockey_trainer'      // Términos de jinetes/entrenadores
  | 'track_conditions'    // Condiciones de pista (pesada, rápida, etc.)
  | 'general_hipismo'     // Jerga hípica general
  | 'slang'               // Expresiones coloquiales del hipódromo
  | 'greeting'            // Saludo
  | 'off_topic'           // Fuera de tema hípico
  | 'unknown';            // No clasificado (fallback a LLM)

export interface IJargonEntry extends Document {
  phrase: string;           // Frase o término clave
  intent: MelliIntent;     // Intención mapeada
  keywords: string[];       // Palabras clave para matching
  description: string;      // Explicación en español (para /diccionario-hipico)
  example?: string;         // Ejemplo de uso en contexto
  synonyms: string[];       // Variantes de la frase
  source: 'seed' | 'youtube' | 'user_log' | 'manual';
  public: boolean;          // Si se muestra en /diccionario-hipico
  hitCount: number;         // Veces que se ha matcheado
  createdAt: Date;
  updatedAt: Date;
}

const JargonEntrySchema = new Schema<IJargonEntry>(
  {
    phrase:      { type: String, required: true, unique: true, trim: true, lowercase: true },
    intent:      { type: String, required: true, trim: true, lowercase: true },
    keywords:    [{ type: String, trim: true, lowercase: true }],
    description: { type: String, required: true },
    example:     { type: String },
    synonyms:    [{ type: String, trim: true, lowercase: true }],
    source:      { type: String, enum: ['seed', 'youtube', 'user_log', 'manual'], default: 'manual' },
    public:      { type: Boolean, default: true },
    hitCount:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

JargonEntrySchema.index({ keywords: 1 });
JargonEntrySchema.index({ intent: 1 });
JargonEntrySchema.index({ public: 1 });
JargonEntrySchema.index({ hitCount: -1 });

export default mongoose.models.JargonEntry ||
  mongoose.model<IJargonEntry>('JargonEntry', JargonEntrySchema);
