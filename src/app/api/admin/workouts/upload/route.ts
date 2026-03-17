import { NextRequest, NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import WorkoutEntry from '@/models/WorkoutEntry';
import Track from '@/models/Track';
import Horse from '@/models/Horse';
import { extractWorkoutDate } from '@/services/parsers/workouts';

export const dynamic = 'force-dynamic';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const WORKOUTS_PROMPT = `Eres un extractor de trabajos de entrenamiento de caballos del INH (Instituto Nacional de Hipismo) venezolano.

El PDF tiene una tabla con estas columnas (de izquierda a derecha):
1. N° de carrera (ej: "4D", "7D", "11D") — puede estar vacía si el caballo no corre esa semana
2. Nombre del ejemplar
3. Parciales y comentarios (ej: "14,1 27 39 (600MTS) (EP) 51,2 MUY COMODO", o "GALOPO SUAVE (EP)", o "UN PIQUE AL TIRO (EP)")
4. RM — remate o tiempo final (número, ej: "12", "15,3") — puede estar vacío
5. Jinete o TRAQUEADOR
6. Entrenador

Puede haber múltiples secciones de fechas distintas en el mismo PDF (ej: martes y miércoles). Extrae TODOS los trabajos de TODAS las fechas.
Puede haber una sección especial llamada "APARATO" — extrae esos trabajos igual, con workoutType: "AP".

Para cada fila extrae:
- horseName: nombre del ejemplar (tal como aparece)
- raceNumber: número de carrera si está (ej: "4D") o null
- parciales: texto de parciales y comentarios completo (columna 3)
- rm: remate (número o null)
- jockeyName: jinete o "TRAQUEADOR" si dice eso
- trainerName: entrenador
- workoutDate: fecha de la sección en formato YYYY-MM-DD (si hay varias secciones, asigna la fecha correcta a cada fila)

De los parciales deduce:
- workoutType: "EP" si contiene (EP), "ES" si contiene (ES), "AP" si contiene (AP) o es sección APARATO, "galopo" si dice GALOPO
- distance: número en metros si aparece (ej: 400, 600, 800, 1000) o null si es galopo/pique
- splits: solo los números de tiempos parciales (ej: "14,1 27 39")
- comment: texto descriptivo (ej: "MUY COMODO", "SE FUE LARGO", "UN PIQUE AL TIRO")

Devuelve JSON puro sin markdown:
{
  "workouts": [
    {
      "horseName": "ALCALA",
      "raceNumber": null,
      "workoutDate": "2026-02-26",
      "workoutType": "EP",
      "distance": 600,
      "splits": "14,1 27 39",
      "comment": "SE FUE LARGO",
      "rm": 12,
      "jockeyName": "G.GONZALEZ",
      "trainerName": "F.PARILLI.T"
    }
  ]
}`;

type GeminiWorkout = { horseName: string; raceNumber: string | null; workoutDate: string; workoutType: string; distance: number | null; splits: string; comment: string; rm: number | null; jockeyName: string; trainerName: string };

async function callGeminiChunk(chunkText: string): Promise<GeminiWorkout[]> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://desafiohipico.com',
      'X-Title': 'Desafío Hípico',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{
        role: 'user',
        content: `${WORKOUTS_PROMPT}\n\nTexto extraído del PDF:\n\n${chunkText}`,
      }],
      temperature: 0.1,
      max_tokens: 16000,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini error: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? '';
  const cleaned = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.workouts ?? [];
  } catch {
    return [];
  }
}

async function extractWithGemini(pdfText: string): Promise<GeminiWorkout[]> {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY no configurada');

  const CHUNK_SIZE = 12000;
  if (pdfText.length <= CHUNK_SIZE) {
    return callGeminiChunk(pdfText);
  }

  // Split on line boundaries near CHUNK_SIZE to avoid cutting mid-row
  const chunks: string[] = [];
  let pos = 0;
  while (pos < pdfText.length) {
    let end = pos + CHUNK_SIZE;
    if (end < pdfText.length) {
      // Find last newline before end
      const nl = pdfText.lastIndexOf('\n', end);
      if (nl > pos) end = nl;
    }
    chunks.push(pdfText.slice(pos, end));
    pos = end;
  }

  const allRows: GeminiWorkout[] = [];
  for (const chunk of chunks) {
    const rows = await callGeminiChunk(chunk);
    allRows.push(...rows);
  }
  return allRows;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const trackId = form.get('trackId') as string | null;
    const previewOnly = form.get('preview') === 'true';

    if (!file) return NextResponse.json({ error: 'Falta el archivo PDF' }, { status: 400 });
    if (!trackId) return NextResponse.json({ error: 'Falta trackId' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse.js');
    const parsed = await pdfParse(buffer);
    const text: string = parsed.text;

    // Extraer fecha primaria del nombre del archivo o del texto (fallback)
    const primaryDate = extractWorkoutDate(text, file.name);

    // Usar Gemini para extraer todos los trabajos con estructura correcta
    const rows = await extractWithGemini(text);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Gemini no encontró trabajos en el PDF' }, { status: 400 });
    }

    if (previewOnly) {
      const previewDate = primaryDate?.toISOString() ?? (rows[0]?.workoutDate ? new Date(rows[0].workoutDate + 'T12:00:00Z').toISOString() : null);
      return NextResponse.json({
        workoutDate: previewDate,
        count: rows.length,
        preview: rows.slice(0, 10),
      });
    }

    await connectMongo();

    const track = await Track.findById(trackId).lean();
    if (!track) return NextResponse.json({ error: 'Track no encontrado' }, { status: 404 });

    let inserted = 0;
    // Group by date for upsert window
    for (const row of rows) {
      const normalizedName = row.horseName.toUpperCase().trim();
      if (!normalizedName) continue;

      // Resolve workout date: prefer Gemini's per-row date, fallback to file date
      let workoutDate: Date;
      if (row.workoutDate) {
        workoutDate = new Date(row.workoutDate + 'T12:00:00Z');
      } else if (primaryDate) {
        workoutDate = primaryDate;
      } else {
        continue; // skip if no date
      }

      if (isNaN(workoutDate.getTime())) {
        workoutDate = primaryDate ?? new Date();
      }

      const dateStart = new Date(workoutDate); dateStart.setUTCHours(0, 0, 0, 0);
      const dateEnd = new Date(workoutDate);   dateEnd.setUTCHours(23, 59, 59, 999);

      const horse = await Horse.findOne({
        name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      }).lean();

      const wType = ['EP','ES','AP','galopo'].includes(row.workoutType) ? row.workoutType : 'galopo';

      await WorkoutEntry.findOneAndUpdate(
        { horseName: normalizedName, trackId, workoutDate: { $gte: dateStart, $lte: dateEnd } },
        {
          $set: {
            horseId: horse ? horse._id : undefined,
            horseName: normalizedName,
            trackId,
            workoutDate,
            distance: row.distance ?? 0,
            workoutType: wType,
            splits: row.splits ?? '',
            comment: row.comment ?? '',
            jockeyName: row.jockeyName ?? '',
            trainerName: row.trainerName ?? '',
            sourceFile: file.name,
          },
        },
        { upsert: true, new: true }
      );
      inserted++;
    }

    const firstDate = rows[0]?.workoutDate
      ? new Date(rows[0].workoutDate + 'T12:00:00Z').toISOString()
      : primaryDate?.toISOString() ?? new Date().toISOString();

    return NextResponse.json({
      success: true,
      workoutDate: firstDate,
      inserted,
      total: rows.length,
      rows: rows.map(r => ({
        horseName: r.horseName,
        trainerName: r.trainerName,
        jockeyName: r.jockeyName,
        workoutType: r.workoutType,
        distance: r.distance,
        splits: r.splits,
        comment: r.comment,
        raceNumber: r.raceNumber,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
