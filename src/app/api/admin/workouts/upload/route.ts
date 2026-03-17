import { NextRequest, NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import WorkoutEntry from '@/models/WorkoutEntry';
import Track from '@/models/Track';
import Horse from '@/models/Horse';
import { parseWorkoutsPdf, extractWorkoutDate } from '@/services/parsers/workouts';

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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse.js');
    const parsed = await pdfParse(buffer);
    const text: string = parsed.text;

    const workoutDate = extractWorkoutDate(text, file.name);
    if (!workoutDate) {
      return NextResponse.json({ error: 'No se pudo extraer la fecha del PDF. Verifica el nombre del archivo (ej: TRABAJOS SABADO 14 DE MARZO 2026.pdf)' }, { status: 400 });
    }

    const rows = parseWorkoutsPdf(text);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron trabajos en el PDF' }, { status: 400 });
    }

    if (previewOnly) {
      return NextResponse.json({
        workoutDate: workoutDate.toISOString(),
        count: rows.length,
        preview: rows.slice(0, 10),
      });
    }

    await connectMongo();

    // Verificar que el track existe
    const track = await Track.findById(trackId).lean();
    if (!track) return NextResponse.json({ error: 'Track no encontrado' }, { status: 404 });

    // Para cada workout, intentar linkear al Horse por nombre (fuzzy no — solo exacto normalizado)
    const dateStart = new Date(workoutDate);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(workoutDate);
    dateEnd.setHours(23, 59, 59, 999);

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const normalizedName = row.horseName.toUpperCase().trim();

      // Buscar caballo por nombre exacto normalizado
      const horse = await Horse.findOne({
        name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      }).lean();

      // Upsert: si ya existe un workout de este caballo en esta fecha y pista, actualizar
      await WorkoutEntry.findOneAndUpdate(
        {
          horseName: normalizedName,
          trackId,
          workoutDate: { $gte: dateStart, $lte: dateEnd },
        },
        {
          $set: {
            horseId: horse ? horse._id : undefined,
            horseName: normalizedName,
            trackId,
            workoutDate,
            distance: row.distance ?? 0,
            workoutType: row.workoutType,
            splits: row.splits,
            comment: row.comment,
            jockeyName: row.jockeyName,
            trainerName: row.trainerName,
            daysRest: row.daysRest ?? undefined,
            sourceFile: file.name,
          },
        },
        { upsert: true, new: true }
      );
      inserted++;
    }

    return NextResponse.json({
      success: true,
      workoutDate: workoutDate.toISOString(),
      inserted,
      skipped,
      total: rows.length,
      rows: rows.map(r => ({
        horseName: r.horseName,
        trainerName: r.trainerName,
        jockeyName: r.jockeyName,
        workoutType: r.workoutType,
        distance: r.distance,
        splits: r.splits,
        comment: r.comment,
        daysRest: r.daysRest,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
