/**
 * POST /api/admin/forecasts/migrate
 * Reasigna pronósticos (Forecast + ExpertForecast) de las carreras de una
 * reunión origen a las carreras equivalentes de una reunión destino.
 *
 * Body: {
 *   fromMeetingId: string,
 *   toMeetingId:   string,
 *   raceMap: { [fromRaceNumber: string]: number }
 * }
 * Ejemplo raceMap: { "2": 1, "3": 2, "4": 3, ... "10": 9 }
 *
 * GET ?fromMeetingId=X&toMeetingId=Y  → preview sin modificar nada
 * Auth: admin only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import Race from '@/models/Race';
import Forecast from '@/models/Forecast';
import ExpertForecast from '@/models/ExpertForecast';

export const dynamic = 'force-dynamic';

async function authorize(req: NextRequest): Promise<boolean> {
  const secure = req.nextUrl.protocol === 'https:';
  const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
  const roles: string[] = (token?.roles as string[]) ?? [];
  return !!(token && roles.includes('admin'));
}

// ─── GET — preview ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  await dbConnect();
  const fromMeetingId = req.nextUrl.searchParams.get('fromMeetingId');
  const toMeetingId   = req.nextUrl.searchParams.get('toMeetingId');
  if (!fromMeetingId || !toMeetingId) {
    return NextResponse.json({ error: 'fromMeetingId y toMeetingId son requeridos.' }, { status: 400 });
  }

  const fromRaces = await Race.find({ meetingId: fromMeetingId })
    .select('_id raceNumber status annualRaceNumber').sort({ raceNumber: 1 }).lean() as any[];
  const toRaces   = await Race.find({ meetingId: toMeetingId })
    .select('_id raceNumber annualRaceNumber').sort({ raceNumber: 1 }).lean() as any[];

  const preview = await Promise.all(fromRaces.map(async (r: any) => {
    const forecasts       = await Forecast.countDocuments({ raceId: r._id });
    const expertForecasts = await ExpertForecast.countDocuments({ raceId: r._id });
    return {
      raceId: r._id.toString(),
      raceNumber: r.raceNumber,
      annualRaceNumber: r.annualRaceNumber ?? null,
      status: r.status,
      forecasts,
      expertForecasts,
    };
  }));

  return NextResponse.json({
    fromRaces: preview,
    toRaces: toRaces.map((r: any) => ({
      raceId: r._id.toString(),
      raceNumber: r.raceNumber,
      annualRaceNumber: r.annualRaceNumber ?? null,
    })),
  });
}

// ─── POST — execute ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  await dbConnect();
  const { fromMeetingId, toMeetingId, raceMap } = await req.json();
  if (!fromMeetingId || !toMeetingId || !raceMap) {
    return NextResponse.json({ error: 'fromMeetingId, toMeetingId y raceMap son requeridos.' }, { status: 400 });
  }

  const fromRaces = await Race.find({ meetingId: fromMeetingId }).select('_id raceNumber').lean() as any[];
  const toRaces   = await Race.find({ meetingId: toMeetingId }).select('_id raceNumber').lean() as any[];

  const fromByNumber = new Map(fromRaces.map((r: any) => [r.raceNumber, r]));
  const toByNumber   = new Map(toRaces.map((r: any) => [r.raceNumber, r]));

  const results: {
    fromRace: number; toRace: number;
    forecasts: number; expertForecasts: number; error?: string;
  }[] = [];

  for (const [fromNumStr, toNum] of Object.entries(raceMap)) {
    const fromNum  = parseInt(fromNumStr);
    const fromRace = fromByNumber.get(fromNum) as any;
    const toRace   = toByNumber.get(toNum as number) as any;

    if (!fromRace) {
      results.push({ fromRace: fromNum, toRace: toNum as number, forecasts: 0, expertForecasts: 0, error: 'Carrera origen no encontrada' });
      continue;
    }
    if (!toRace) {
      results.push({ fromRace: fromNum, toRace: toNum as number, forecasts: 0, expertForecasts: 0, error: 'Carrera destino no encontrada' });
      continue;
    }

    const fRes = await Forecast.updateMany(
      { raceId: fromRace._id },
      { $set: { raceId: toRace._id, meetingId: toMeetingId } }
    );

    // ExpertForecast tiene índice único (expertSourceId, raceNumber, meetingId)
    // actualizamos también raceNumber al nuevo número de carrera
    const efRes = await ExpertForecast.updateMany(
      { raceId: fromRace._id },
      { $set: { raceId: toRace._id, meetingId: toMeetingId, raceNumber: toNum } }
    );

    results.push({
      fromRace: fromNum,
      toRace: toNum as number,
      forecasts: fRes.modifiedCount,
      expertForecasts: efRes.modifiedCount,
    });
  }

  return NextResponse.json({ success: true, results });
}
