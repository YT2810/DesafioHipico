/**
 * GET /api/forecasts/preview?meetingId=
 * Public endpoint — returns one "Línea" forecast per handicapper.
 * Priority: Línea in válidas (last 6) > Línea in non-válidas > any first race.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Forecast from '@/models/Forecast';
import Race from '@/models/Race';
import '@/models/HandicapperProfile';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');
    if (!meetingId) return NextResponse.json({ forecasts: [] });

    // Load all races sorted ascending to know total and válidas boundary
    const allRaces = await Race.find({ meetingId }).sort({ raceNumber: 1 }).lean();
    if (!allRaces.length) return NextResponse.json({ forecasts: [] });

    const totalRaces = allRaces.length;
    // Válidas = last 6 races
    const validasStart = Math.max(1, totalRaces - 5);
    const validaRaceIds = new Set(
      allRaces.filter((r: any) => r.raceNumber >= validasStart).map((r: any) => r._id.toString())
    );
    const nonValidaRaceIds = new Set(
      allRaces.filter((r: any) => r.raceNumber < validasStart).map((r: any) => r._id.toString())
    );
    const firstRaceId = (allRaces[0] as any)._id.toString();

    // Load all published forecasts for the meeting
    const allForecasts = await Forecast.find({ meetingId, isPublished: true })
      .populate('handicapperId', 'pseudonym')
      .lean();

    // Group by handicapper
    const byHandicapper = new Map<string, typeof allForecasts>();
    for (const f of allForecasts) {
      const hId = (f.handicapperId as any)?._id?.toString() ?? String(f.handicapperId);
      if (!byHandicapper.has(hId)) byHandicapper.set(hId, []);
      byHandicapper.get(hId)!.push(f);
    }

    const toTitle = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

    const result = [...byHandicapper.values()].map(forecasts => {
      const pseudonym = (forecasts[0].handicapperId as any)?.pseudonym ?? 'Experto';

      // Find the best forecast to show:
      // 1. Línea in a válida race
      // 2. Línea in a non-válida race
      // 3. First race available
      const hasLinea = (f: any) => (f.marks ?? []).some((m: any) => m.label === 'Línea');

      const lineaValida = forecasts.find(f => validaRaceIds.has(f.raceId.toString()) && hasLinea(f));
      const lineaNonValida = forecasts.find(f => nonValidaRaceIds.has(f.raceId.toString()) && hasLinea(f));
      const firstRace = forecasts.find(f => f.raceId.toString() === firstRaceId);
      const fallback = forecasts[0];

      const chosen = lineaValida ?? lineaNonValida ?? firstRace ?? fallback;
      if (!chosen) return null;

      // Find the Línea mark specifically, or first mark
      const marks: any[] = chosen.marks ?? [];
      const lineaMark = marks.find((m: any) => m.label === 'Línea');
      const displayMarks = lineaMark ? [lineaMark] : marks.slice(0, 3);

      // Get race number for label
      const race = allRaces.find((r: any) => r._id.toString() === chosen.raceId.toString());
      const raceNumber = (race as any)?.raceNumber ?? '?';
      const isValida = validaRaceIds.has(chosen.raceId.toString());
      const raceLabel = isValida
        ? `${raceNumber - validasStart + 1}V`
        : `C${raceNumber}`;

      return {
        pseudonym,
        raceLabel,
        marks: displayMarks.map((m: any) => ({
          horseName: toTitle(m.horseName ?? ''),
          dorsalNumber: m.dorsalNumber,
          label: m.label,
        })),
      };
    }).filter(Boolean);

    return NextResponse.json({ forecasts: result });
  } catch {
    return NextResponse.json({ forecasts: [] });
  }
}
