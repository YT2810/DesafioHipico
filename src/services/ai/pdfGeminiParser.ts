import { callLLM } from './geminiProcessor';
import type {
  ProcessedDocument,
  ExtractedMeeting,
  ExtractedRace,
  ExtractedPerson,
  ExtractedHorse,
  ExtractedEntry,
  ExtractedRaceBlock,
} from '../pdfProcessor';
import { simpleHash, parseVEDate } from '../pdfProcessor';

function buildPDFParserPrompt(rawText: string): string {
  return `Eres un extractor de programas hípicos venezolanos (INH / La Rinconada / Valencia).
Analiza el siguiente texto extraído de un PDF de ejemplares inscritos y devuélvelo como JSON estricto.

REGLAS GENERALES:
- Extrae TODAS las carreras del programa.
- Si el texto está incompleto o cortado, extrae lo que puedas.
- Si no hay número de carrera anual, pon null en annualRaceNumber.
- La hora (scheduledTime) debe estar en formato HH:mm de 24 horas.

PARA CADA CARRERA extrae:
- raceNumber: número entero de la carrera del día
- annualRaceNumber: número entero de la carrera del año, o null si no aparece
- distance: número entero de metros (ej: 1300)
- scheduledTime: string en formato "HH:mm"
- conditions: string con las condiciones completas de la carrera
- games: array de strings con los tipos de apuesta disponibles. Ej: ["GANADOR", "PLACE", "EXACTA", "TRIFECTA", "SUPERFECTA"]. Si no aparece, array vacío [].

PARA CADA EJEMPLAR extrae:
- dorsalNumber: número entero
- horseName: string con el nombre del caballo SIN país entre paréntesis, SIN implementos, SIN precio de reclamo. Si el nombre termina con algo como "(USA)" o "(ARG)", ELIMINA eso del nombre y ponlo en nationality.
- nationality: string con el código de país SOLO las letras, sin paréntesis. Ej: "USA", "ARG", "CHI", "PER". Si no tiene país, usa null.
- medication: string con los códigos de medicación separados por guion. Si no hay, pon "".
- weightRaw: string EXACTAMENTE como aparece en el PDF, incluyendo descuentos. Ej: "54", "55-1", "54.5-3". NO calcules nada.
- jockeyName: string, nombre completo del jinete. Preserva el orden y las iniciales.
- trainerName: string, nombre completo del entrenador.
- postPosition: número entero de la posición de partida.
- implements: string con los códigos de implementos exactamente como aparecen, incluyendo los puntos. Ej: "L.CC.V.BB.M.LA.". Si no hay, pon "".
- claimPrice: número o null. Si es carrera de reclamo, extrae el precio como número entero. Ej: "8000,00" → 8000. Si no es carrera de reclamo, null.

REGLAS CRÍTICAS:
- NUNCA incluyas "(USA)", "(ARG)", "(CHI)", "(PER)" como parte de horseName. Separa el país en nationality.
- NUNCA incluyas "PRECIO $: 8.000,00" en horseName. Eso va en claimPrice.
- NUNCA incluyas implementos tipo "L.BZ.", "Gr.", "SF" en horseName. Eso va en implements.
- weightRaw debe ser el texto original del PDF, sin calcular.
- Si el nombre tiene acentos, preservalos.
- Si el nombre tiene espacios múltiples, limpia a un solo espacio.

FORMATO DE SALIDA:
Devuelve SOLO un JSON válido, sin markdown, sin explicaciones. La raíz debe ser un objeto con una clave "races" que contenga un array de carreras.

Empieza el análisis ahora. Texto del PDF:
${rawText}`;
}

function makePersonLicenseId(name: string, type: 'jockey' | 'trainer'): string {
  return `${type === 'jockey' ? 'J' : 'T'}-${name.replace(/\s+/g, '').toUpperCase().slice(0, 12)}`;
}

function parseWeight(weightRaw: string): { weight: number; weightRaw: string } {
  const cleanRaw = weightRaw.replace(',', '.');
  const allowanceMatch = cleanRaw.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (allowanceMatch) {
    return {
      weight: parseFloat(allowanceMatch[1]) - parseFloat(allowanceMatch[2]),
      weightRaw: cleanRaw,
    };
  }
  return {
    weight: parseFloat(cleanRaw) || 0,
    weightRaw: cleanRaw,
  };
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

// ─── Types for Gemini raw response ────────────────────────────────────────────

interface GeminiHorse {
  dorsalNumber: number;
  horseName: string;
  nationality?: string | null;
  medication?: string;
  weightRaw: string;
  jockeyName: string;
  trainerName: string;
  postPosition: number;
  implements?: string;
  claimPrice?: number | null;
}

interface GeminiRace {
  raceNumber: number;
  annualRaceNumber?: number | null;
  distance: number;
  scheduledTime: string;
  conditions: string;
  games?: string[];
  horses: GeminiHorse[];
}

interface GeminiResponse {
  races: GeminiRace[];
}

function extractJSONFromResponse(raw: string): string {
  const cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return match[1].trim();
  }
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace !== -1) return cleaned.slice(firstBrace);
  return cleaned;
}

function normalizeTime(raw: string): string {
  const m = raw.match(/(\d{1,2}):(\d{2})\s*([aApP])\.?\s*[mM]\.?/);
  if (!m) return raw;
  let h = parseInt(m[1]);
  const min = m[2];
  const meridiem = m[3].toLowerCase();
  if (meridiem === 'a' && h === 12) h = 0;
  if (meridiem === 'p' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${min}`;
}

function convertToProcessedDocument(rawText: string, gemini: GeminiResponse): ProcessedDocument {
  const warnings: string[] = [];
  const hash = simpleHash(rawText);

  const meeting: ExtractedMeeting = {
    track: { name: 'LA RINCONADA', location: 'LA RINCONADA', country: 'VE' },
    date: new Date().toISOString(),
    meetingNumber: 0,
  };

  const races: ExtractedRaceBlock[] = gemini.races.map((r) => {
    const entries: ExtractedEntry[] = [];
    const failedLines: string[] = [];

    for (const h of r.horses) {
      try {
        const { weight, weightRaw } = parseWeight(String(h.weightRaw));
        const rawHorseName = clean(h.horseName);

        // Fallback: extraer nationality del nombre si Gemini no la separó
        const countryMatch = rawHorseName.match(/\s*\(([A-Z]{2,4})\)\s*$/);
        let horseName = rawHorseName;
        let nationality = h.nationality ? clean(h.nationality) : undefined;
        if (countryMatch && !nationality) {
          nationality = countryMatch[1];
          horseName = rawHorseName.slice(0, countryMatch.index).trim();
        }

        const horse: ExtractedHorse = {
          name: horseName,
          pedigree: {},
        };
        if (nationality) {
          horse.nationality = nationality;
        }

        const entry: ExtractedEntry = {
          dorsalNumber: Number(h.dorsalNumber),
          postPosition: Number(h.postPosition),
          weight,
          weightRaw,
          medication: h.medication || undefined,
          implements: h.implements || undefined,
          horse,
          jockey: {
            name: clean(h.jockeyName),
            type: 'jockey',
            licenseId: makePersonLicenseId(h.jockeyName, 'jockey'),
          },
          trainer: {
            name: clean(h.trainerName),
            type: 'trainer',
            licenseId: makePersonLicenseId(h.trainerName, 'trainer'),
          },
        };
        entries.push(entry);
      } catch (err) {
        failedLines.push(`dorsal ${h.dorsalNumber}: ${err}`);
      }
    }

    const race: ExtractedRace = {
      raceNumber: Number(r.raceNumber),
      annualRaceNumber: r.annualRaceNumber ?? undefined,
      distance: Number(r.distance),
      scheduledTime: normalizeTime(r.scheduledTime),
      conditions: clean(r.conditions),
      prizePool: { bs: 0, usd: 0 },
      games: r.games || [],
    };

    return { race, entries, failedLines: failedLines.length > 0 ? failedLines : undefined };
  });

  return { meeting, races, rawText, hash, warnings };
}

export async function processDocumentWithGemini(rawText: string): Promise<ProcessedDocument> {
  const prompt = buildPDFParserPrompt(rawText);
  const responseText = await callLLM(prompt);
  const jsonText = extractJSONFromResponse(responseText);

  try {
    const parsed = JSON.parse(jsonText) as GeminiResponse;
    if (!parsed.races || !Array.isArray(parsed.races)) {
      throw new Error('Respuesta de Gemini no contiene array "races"');
    }
    return convertToProcessedDocument(rawText, parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Error parseando respuesta de Gemini: ${msg}. Raw: ${responseText.slice(0, 500)}`);
  }
}
