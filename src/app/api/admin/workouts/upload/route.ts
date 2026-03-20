import { NextRequest, NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import WorkoutEntry from '@/models/WorkoutEntry';
import Track from '@/models/Track';
import Horse from '@/models/Horse';
import { parseWorkoutsPdfBuffer, extractWorkoutDate } from '@/services/parsers/workouts';
import { parseWorkoutsXlsx } from '@/services/parsers/workoutsXlsx';
import { parseWorkoutsXlsxValencia } from '@/services/parsers/workoutsXlsxValencia';
import { resolveWorkoutGroups } from '@/services/parsers/resolveWorkoutGroups';

export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const trackId = form.get('trackId') as string | null;
    const previewOnly = form.get('preview') === 'true';

    if (!file) return NextResponse.json({ error: 'Falta el archivo PDF' }, { status: 400 });
    if (!trackId) return NextResponse.json({ error: 'Falta trackId' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const isXlsx = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');

    // Extract date from filename first; for PDFs also try text content
    let finalDate: Date | null = extractWorkoutDate('', file.name);
    if (!finalDate && !isXlsx) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse/lib/pdf-parse.js');
      const parsed = await pdfParse(buffer);
      finalDate = extractWorkoutDate(parsed.text, file.name);
    }
    if (!finalDate) {
      return NextResponse.json({ error: 'No se pudo extraer la fecha del archivo. Verifica el nombre (ej: TRABAJOS SABADO 14 DE MARZO 2026.pdf)' }, { status: 400 });
    }

    // Detect Valencia track to use the correct xlsx parser
    // We need track name — do a quick lookup before date validation
    let isValenciaTrack = false;
    try {
      await connectMongo();
      const trackDoc = await Track.findById(trackId).lean() as any;
      if (trackDoc?.name) {
        isValenciaTrack = /valencia/i.test(trackDoc.name);
      }
    } catch { /* non-critical, fall back to La Rinconada parser */ }

    let rows;
    if (isXlsx) {
      if (isValenciaTrack) {
        rows = parseWorkoutsXlsxValencia(buffer);
        // Resolve [GRUPO] entries (concatenated multi-horse names) using AI
        await resolveWorkoutGroups(rows).catch(() => { /* non-critical */ });
      } else {
        rows = parseWorkoutsXlsx(buffer);
      }
    } else {
      rows = await parseWorkoutsPdfBuffer(buffer);
    }
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron trabajos en el PDF' }, { status: 400 });
    }

    if (previewOnly) {
      return NextResponse.json({
        workoutDate: finalDate.toISOString(),
        count: rows.length,
        preview: rows.slice(0, 10),
      });
    }

    await connectMongo();

    const track = await Track.findById(trackId).lean() as any;
    if (!track) return NextResponse.json({ error: 'Track no encontrado' }, { status: 404 });

    const dateStart = new Date(finalDate); dateStart.setUTCHours(0, 0, 0, 0);
    const dateEnd   = new Date(finalDate); dateEnd.setUTCHours(23, 59, 59, 999);

    // Batch horse lookup — one query for all names instead of N sequential queries
    const validRows = rows.filter(r => r.horseName.trim().length > 0);
    const allNames = [...new Set(validRows.map(r => r.horseName.toUpperCase().trim()))];
    const horses = await Horse.find({
      name: { $in: allNames.map(n => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) },
    }).lean();
    const horseMap = new Map(horses.map(h => [(h.name as string).toUpperCase().trim(), h._id]));

    // Parallel upserts
    await Promise.all(validRows.map(row => {
      const normalizedName = row.horseName.toUpperCase().trim();
      const horseId = horseMap.get(normalizedName);
      return WorkoutEntry.findOneAndUpdate(
        { horseName: normalizedName, trackId, workoutDate: { $gte: dateStart, $lte: dateEnd } },
        {
          $set: {
            horseId: horseId ?? undefined,
            horseName: normalizedName,
            trackId,
            workoutDate: finalDate,
            distance: row.distance ?? 0,
            workoutType: row.workoutType,
            splits: row.splits,
            comment: row.comment,
            jockeyName: row.jockeyName,
            trainerName: row.trainerName,
            daysRest: row.daysRest ?? undefined,
            rm: row.rm ?? undefined,
            sourceFile: file.name,
          },
        },
        { upsert: true, new: true }
      );
    }));
    const inserted = validRows.length;

    return NextResponse.json({
      success: true,
      workoutDate: finalDate.toISOString(),
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
        rm: r.rm,
        daysRest: r.daysRest,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
