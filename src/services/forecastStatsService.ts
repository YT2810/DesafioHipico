/**
 * forecastStatsService.ts
 *
 * Called after official results are loaded for a meeting.
 * Compares each handicapper's marks against the finishPosition of entries
 * and updates their HandicapperProfile stats.
 */

import dbConnect from '@/lib/mongodb';
import Forecast from '@/models/Forecast';
import Entry from '@/models/Entry';
import HandicapperProfile from '@/models/HandicapperProfile';
import { Types } from 'mongoose';

interface RaceResult {
  raceId: string;
  first: string[];
  second: string[];
  third: string[];
}

async function buildRaceResults(meetingId: string): Promise<RaceResult[]> {
  const entries = await Entry.find({}).lean();

  const byRace = new Map<string, { pos: number; horseName?: string; dorsalNumber?: number }[]>();

  for (const e of entries) {
    const raceKey = e.raceId.toString();
    if (!byRace.has(raceKey)) byRace.set(raceKey, []);
    const pos = e.result?.finishPosition;
    if (pos) byRace.get(raceKey)!.push({ pos, dorsalNumber: e.dorsalNumber });
  }

  const results: RaceResult[] = [];
  for (const [raceId, positions] of byRace.entries()) {
    const at = (p: number) => positions.filter(x => x.pos === p).map(x => String(x.dorsalNumber));
    results.push({ raceId, first: at(1), second: at(2), third: at(3) });
  }
  return results;
}

function markHits(
  marks: { preferenceOrder: number; horseName: string; dorsalNumber?: number }[],
  result: RaceResult
): { hit1st: boolean; hit2nd: boolean; hit3rd: boolean; hitAny: boolean } {
  const dorsals = marks.map(m => m.dorsalNumber).filter(Boolean).map(String);
  const names = marks.map(m => m.horseName.toUpperCase());

  const matchesFirst = result.first.some(d => dorsals.includes(d));
  const matchesSecond = result.second.some(d => dorsals.includes(d));
  const matchesThird = result.third.some(d => dorsals.includes(d));

  return {
    hit1st: matchesFirst,
    hit2nd: matchesSecond,
    hit3rd: matchesThird,
    hitAny: matchesFirst || matchesSecond || matchesThird,
  };
}

/**
 * Evaluate all published forecasts for a meeting and update handicapper stats.
 * Call this after persisting official race results.
 */
export async function evaluateMeetingForecasts(meetingId: string): Promise<{
  evaluated: number;
  handicappersUpdated: number;
}> {
  await dbConnect();

  const raceResults = await buildRaceResults(meetingId);
  const resultMap = new Map(raceResults.map(r => [r.raceId, r]));

  const forecasts = await Forecast.find({
    meetingId: new Types.ObjectId(meetingId),
    isPublished: true,
    'result.evaluated': { $ne: true },
  });

  const handicapperUpdates = new Map<
    string,
    { hit1st: number; hit2nd: number; hit3rd: number; hitAny: number; total: number }
  >();

  let evaluated = 0;

  for (const forecast of forecasts) {
    const result = resultMap.get(forecast.raceId.toString());
    if (!result) continue;

    const hits = markHits(forecast.marks, result);

    forecast.result = {
      evaluated: true,
      evaluatedAt: new Date(),
      ...hits,
    };
    await forecast.save();
    evaluated++;

    const hid = forecast.handicapperId.toString();
    if (!handicapperUpdates.has(hid)) {
      handicapperUpdates.set(hid, { hit1st: 0, hit2nd: 0, hit3rd: 0, hitAny: 0, total: 0 });
    }
    const acc = handicapperUpdates.get(hid)!;
    acc.total++;
    if (hits.hit1st) acc.hit1st++;
    if (hits.hit2nd) acc.hit2nd++;
    if (hits.hit3rd) acc.hit3rd++;
    if (hits.hitAny) acc.hitAny++;
  }

  // Update each handicapper's cumulative stats
  for (const [hid, delta] of handicapperUpdates.entries()) {
    const profile = await HandicapperProfile.findById(hid);
    if (!profile) continue;

    const s = profile.stats;
    s.totalRacesWithResult += delta.total;
    s.hit1st += delta.hit1st;
    s.hit2nd += delta.hit2nd;
    s.hit3rd += delta.hit3rd;
    s.hitAny += delta.hitAny;

    const base = s.totalRacesWithResult || 1;
    s.pct1st = Math.round((s.hit1st / base) * 100);
    s.pct2nd = Math.round((s.hit2nd / base) * 100);
    s.pct3rd = Math.round((s.hit3rd / base) * 100);
    s.pctGeneral = Math.round((s.hitAny / base) * 100);

    await profile.save();
  }

  return { evaluated, handicappersUpdated: handicapperUpdates.size };
}
