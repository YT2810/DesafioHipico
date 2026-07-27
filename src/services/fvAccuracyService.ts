import dbConnect from '@/lib/mongodb';
import { MARK_POINTS, FIJO_BONUS_POINTS } from '@/lib/constants';
import Meeting from '@/models/Meeting';
import Race from '@/models/Race';
import Track from '@/models/Track';
import Entry from '@/models/Entry';
import Forecast from '@/models/Forecast';

export interface FvAccuracyRow {
  position: number;
  total: number;
  wins: number;
  pct: number;
}

export interface FvTrackAccuracy {
  trackId: string;
  trackName: string;
  totalRaces: number;
  batacazos: number;
  batacazoPct: number;
  byPosition: FvAccuracyRow[];
}

interface FvHorse {
  horseName: string;
  dorsalNumber?: number;
  points: number;
  factor: number;
}

function horseKey(horseName: string): string {
  return horseName.toUpperCase().trim();
}

function calcFv(forecasts: { marks: { preferenceOrder: number; horseName: string; dorsalNumber?: number; label?: string | null }[] }[]): FvHorse[] {
  const maxTotal = forecasts.length * FIJO_BONUS_POINTS;
  const map = new Map<string, { horseName: string; dorsalNumber?: number; points: number }>();

  for (const f of forecasts) {
    const isSingle = f.marks.length === 1;
    for (const m of f.marks) {
      const key = horseKey(m.horseName);
      const isFijo = isSingle && m.label === 'Línea';
      const pts = isFijo ? FIJO_BONUS_POINTS : (MARK_POINTS[m.preferenceOrder] ?? 1);
      const existing = map.get(key);
      if (existing) {
        existing.points += pts;
      } else {
        map.set(key, { horseName: m.horseName, dorsalNumber: m.dorsalNumber, points: pts });
      }
    }
  }

  return [...map.values()]
    .map(v => ({ ...v, factor: maxTotal > 0 ? v.points / maxTotal : 0 }))
    .sort((a, b) => b.points - a.points || (a.dorsalNumber ?? 999) - (b.dorsalNumber ?? 999));
}

export async function getFvAccuracy(trackNameQuery: string): Promise<FvTrackAccuracy | null> {
  await dbConnect();

  const track = await Track.findOne({ name: { $regex: new RegExp(trackNameQuery, 'i') } }).lean() as any;
  if (!track) return null;

  const meetings = await Meeting.find({ trackId: track._id }).select('_id').lean() as any[];
  const meetingIds = meetings.map(m => m._id.toString());

  if (!meetingIds.length) {
    return { trackId: track._id.toString(), trackName: track.name, totalRaces: 0, batacazos: 0, batacazoPct: 0, byPosition: [] };
  }

  const races = await Race.find({ meetingId: { $in: meetingIds }, hasResults: true }).select('_id raceNumber meetingId').lean() as any[];
  if (!races.length) {
    return { trackId: track._id.toString(), trackName: track.name, totalRaces: 0, batacazos: 0, batacazoPct: 0, byPosition: [] };
  }

  const raceIds = races.map(r => r._id.toString());

  const [forecasts, winners] = await Promise.all([
    Forecast.find({ raceId: { $in: raceIds }, isPublished: true }).select('raceId marks').lean() as any,
    Entry.find({ raceId: { $in: raceIds }, 'result.finishPosition': 1 })
      .populate('horseId', 'name')
      .select('raceId dorsalNumber horseId result')
      .lean() as any,
  ]);

  const forecastsByRace: Record<string, any[]> = {};
  for (const f of forecasts) {
    const rid = f.raceId.toString();
    if (!forecastsByRace[rid]) forecastsByRace[rid] = [];
    forecastsByRace[rid].push(f);
  }

  const winnerByRace: Record<string, { dorsalNumber?: number; horseName?: string }> = {};
  for (const e of winners) {
    winnerByRace[e.raceId.toString()] = {
      dorsalNumber: e.dorsalNumber,
      horseName: (e.horseId as any)?.name ?? '',
    };
  }

  const byPosition: Record<number, { total: number; wins: number }> = {
    1: { total: 0, wins: 0 },
    2: { total: 0, wins: 0 },
    3: { total: 0, wins: 0 },
    4: { total: 0, wins: 0 },
    5: { total: 0, wins: 0 },
  };

  let batacazos = 0;
  let countedRaces = 0;

  for (const race of races) {
    const rid = race._id.toString();
    const winner = winnerByRace[rid];
    if (!winner) continue;

    const raceForecasts = forecastsByRace[rid] ?? [];
    if (!raceForecasts.length) continue;

    const fv = calcFv(raceForecasts);
    const top5 = fv.slice(0, 5);
    if (!top5.length) continue;

    countedRaces++;
    const winnerKey = horseKey(winner.horseName ?? '');
    let winnerInTop5 = false;

    for (let i = 0; i < top5.length; i++) {
      const pos = i + 1;
      byPosition[pos].total++;
      const h = top5[i];
      const key = horseKey(h.horseName);
      const dorsalMatch = winner.dorsalNumber != null && h.dorsalNumber != null && winner.dorsalNumber === h.dorsalNumber;
      if (key === winnerKey || dorsalMatch) {
        byPosition[pos].wins++;
        winnerInTop5 = true;
      }
    }

    if (!winnerInTop5) batacazos++;
  }

  const byPositionArray = [1, 2, 3, 4, 5].map(pos => {
    const { total, wins } = byPosition[pos];
    return { position: pos, total, wins, pct: total > 0 ? Math.round((wins / total) * 1000) / 10 : 0 };
  });

  return {
    trackId: track._id.toString(),
    trackName: track.name,
    totalRaces: countedRaces,
    batacazos,
    batacazoPct: countedRaces > 0 ? Math.round((batacazos / countedRaces) * 1000) / 10 : 0,
    byPosition: byPositionArray,
  };
}
