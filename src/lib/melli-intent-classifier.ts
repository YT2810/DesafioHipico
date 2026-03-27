import JargonEntry, { MelliIntent } from '@/models/JargonEntry';
import connectDB from '@/lib/mongodb';

export interface ClassifiedIntent {
  intent: MelliIntent;
  confidence: 'high' | 'medium' | 'low';
  matchedPhrase?: string;
  jargonId?: string;
}

/**
 * Clasifica la intención del usuario a partir del jergario en MongoDB.
 * Si hay match fuerte → devuelve la intención sin necesidad de LLM.
 * Si no hay match → devuelve 'unknown' y el chat/route usa OpenAI como fallback.
 */
export async function classifyIntent(message: string): Promise<ClassifiedIntent> {
  await connectDB();
  const msg = message.toLowerCase().trim();

  // 1. Buscar match exacto de frase completa
  const exactMatch = await JargonEntry.findOne({
    $or: [
      { phrase: msg },
      { synonyms: msg },
    ],
  }).lean() as any;

  if (exactMatch) {
    await JargonEntry.updateOne({ _id: exactMatch._id }, { $inc: { hitCount: 1 } });
    return {
      intent: exactMatch.intent,
      confidence: 'high',
      matchedPhrase: exactMatch.phrase,
      jargonId: exactMatch._id.toString(),
    };
  }

  // 2. Buscar por keywords contenidas en el mensaje
  const allEntries = await JargonEntry.find({}).lean() as any[];

  let bestMatch: any = null;
  let bestScore = 0;

  for (const entry of allEntries) {
    let score = 0;

    // Match por keywords
    for (const kw of entry.keywords) {
      if (msg.includes(kw)) {
        // Ponderar por longitud del keyword (más largo = más específico)
        score += kw.length;
      }
    }

    // Match por synonyms parciales
    for (const syn of entry.synonyms) {
      if (msg.includes(syn)) {
        score += syn.length * 1.2; // synonyms pesan un poco más
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  // Umbral: al menos 4 chars de match para considerar confiable
  if (bestMatch && bestScore >= 4) {
    await JargonEntry.updateOne({ _id: bestMatch._id }, { $inc: { hitCount: 1 } });
    return {
      intent: bestMatch.intent === 'unknown' ? 'unknown' : bestMatch.intent,
      confidence: bestScore >= 8 ? 'high' : 'medium',
      matchedPhrase: bestMatch.phrase,
      jargonId: bestMatch._id.toString(),
    };
  }

  // 3. Sin match → fallback a LLM
  return { intent: 'unknown', confidence: 'low' };
}
