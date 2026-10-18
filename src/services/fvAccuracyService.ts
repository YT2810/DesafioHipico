import dbConnect from '@/lib/mongodb';
import { MARK_POINTS, FIJO_BONUS_POINTS } from '@/lib/constants';
import Meeting from '@/models/Meeting';
import Race from '@/models/Race';
import Track from '@/models/Track';
import Entry from '@/models/Entry';
import Horse from '@/models/Horse';
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
  void Horse;

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

// ─── Laboratorio FV Analytics (Read-Only Deep Analysis) ───────────────────────

export interface FvThresholdBreakdown {
  label: string;
  mode: 'cumulative' | 'band';
  totalCandidates: number;
  wins: number;
  winPct: number;
  losses: number;
  whenLost: {
    wonBy2nd: number;
    wonBy3rd: number;
    wonBy4th: number;
    wonBy5th: number;
    wonByBatacazo: number;
    wonBy2ndPct: number;
    wonBy3rdPct: number;
    wonBy4thPct: number;
    wonBy5thPct: number;
    wonByBatacazoPct: number;
  };
}

export interface FvFieldSizeRow {
  fieldSizeLabel: string;
  fieldSizeKey: number; // 2..11 (11 means 11+)
  totalRaces: number;
  posWins: {
    pos1: number;
    pos2: number;
    pos3: number;
    pos4: number;
    pos5: number;
    batacazo: number;
  };
  posPcts: {
    pos1: number;
    pos2: number;
    pos3: number;
    pos4: number;
    pos5: number;
    batacazo: number;
  };
  shareOfAllBatacazosPct: number;
}

export interface FvDistanceRow {
  distance: number; // e.g. 1100, 1200, ..., 3200
  distanceLabel: string;
  totalRaces: number;
  posWins: {
    pos1: number;
    pos2: number;
    pos3: number;
    pos4: number;
    pos5: number;
    batacazo: number;
  };
  posPcts: {
    pos1: number;
    pos2: number;
    pos3: number;
    pos4: number;
    pos5: number;
    batacazo: number;
  };
  shareOfAllBatacazosPct: number;
}

export interface FvPrescriptionRule {
  id: string;
  actionBadge: string;
  title: string;
  conditionText: string;
  recommendation: string;
  matchingRaces: number;
  frequencyPct: number;
  successCount: number;
  successPct: number;
  targetOutcomeLabel: string;
}

export interface FvComboRuleRow {
  id: string;
  group: 'duo' | 'trilogia';
  label: string;
  description: string;
  matchingRaces: number;
  frequencyPct: number;
  winsInGroup: number;
  accuracyPct: number;
  breakdownWins: {
    pos1: number;
    pos2: number;
    pos3: number;
  };
}

export interface FvRaceAuditItem {
  raceId: string;
  meetingNumber: number;
  date: string;
  raceNumber: number;
  distance: number;
  fieldSize: number;
  forecasterCount: number;
  topHorses: {
    pos: number;
    dorsalNumber?: number;
    horseName: string;
    fvPct: number;
  }[];
  sumTop2Pct: number;
  sumTop3Pct: number;
  winner: {
    dorsalNumber?: number;
    horseName: string;
    fvRank: number | null; // 1..5 or null if Batacazo
    fvPct: number;
  };
}

export interface FvPatternInsight {
  title: string;
  category: 'favoritos' | 'batacazos' | 'candados' | 'trilogias';
  detail: string;
  metric: string;
}

export interface FvLabAnalytics {
  trackId: string;
  trackName: string;
  totalRaces: number;
  batacazos: number;
  batacazoPct: number;
  byPosition: FvAccuracyRow[];
  thresholds: FvThresholdBreakdown[];
  byFieldSize: FvFieldSizeRow[];
  byDistance: FvDistanceRow[];
  comboRules: FvComboRuleRow[];
  prescriptionRules: FvPrescriptionRule[];
  insights: FvPatternInsight[];
  racesAudit: FvRaceAuditItem[];
}

function round1(num: number, den: number): number {
  return den > 0 ? Math.round((num / den) * 1000) / 10 : 0;
}

export async function getFvLabAnalytics(trackNameQuery: string): Promise<FvLabAnalytics | null> {
  await dbConnect();
  void Horse;

  const track = await Track.findOne({ name: { $regex: new RegExp(trackNameQuery, 'i') } }).lean() as any;
  if (!track) return null;

  const meetings = await Meeting.find({ trackId: track._id })
    .select('_id meetingNumber date')
    .lean() as any[];

  const meetingMap = new Map<string, { meetingNumber: number; date: string }>();
  for (const m of meetings) {
    meetingMap.set(m._id.toString(), {
      meetingNumber: m.meetingNumber ?? 0,
      date: m.date ? new Date(m.date).toISOString().slice(0, 10) : '',
    });
  }

  const meetingIds = meetings.map(m => m._id.toString());
  if (!meetingIds.length) {
    return {
      trackId: track._id.toString(),
      trackName: track.name,
      totalRaces: 0,
      batacazos: 0,
      batacazoPct: 0,
      byPosition: [],
      thresholds: [],
      byFieldSize: [],
      byDistance: [],
      comboRules: [],
      prescriptionRules: [],
      insights: [],
      racesAudit: [],
    };
  }

  const races = await Race.find({ meetingId: { $in: meetingIds }, hasResults: true })
    .select('_id raceNumber distance meetingId')
    .lean() as any[];

  if (!races.length) {
    return {
      trackId: track._id.toString(),
      trackName: track.name,
      totalRaces: 0,
      batacazos: 0,
      batacazoPct: 0,
      byPosition: [],
      thresholds: [],
      byFieldSize: [],
      byDistance: [],
      comboRules: [],
      prescriptionRules: [],
      insights: [],
      racesAudit: [],
    };
  }

  const raceIds = races.map(r => r._id.toString());

  const [forecasts, allEntries] = await Promise.all([
    Forecast.find({ raceId: { $in: raceIds }, isPublished: true })
      .select('raceId marks')
      .lean() as any,
    Entry.find({ raceId: { $in: raceIds } })
      .populate('horseId', 'name')
      .select('raceId dorsalNumber horseId status result')
      .lean() as any,
  ]);

  const forecastsByRace: Record<string, any[]> = {};
  for (const f of forecasts) {
    const rid = f.raceId.toString();
    if (!forecastsByRace[rid]) forecastsByRace[rid] = [];
    forecastsByRace[rid].push(f);
  }

  const winnerByRace: Record<string, { dorsalNumber?: number; horseName: string }> = {};
  const fieldSizeByRace: Record<string, number> = {};

  for (const e of allEntries) {
    const rid = e.raceId.toString();
    const isScratched = e.status === 'scratched' || e.result?.isScratched === true;
    const isInvalidated = e.result?.isInvalidated === true;
    if (!isScratched && !isInvalidated) {
      fieldSizeByRace[rid] = (fieldSizeByRace[rid] ?? 0) + 1;
    }
    if (e.result?.finishPosition === 1 && !isScratched && !isInvalidated) {
      winnerByRace[rid] = {
        dorsalNumber: e.dorsalNumber,
        horseName: (e.horseId as any)?.name ?? '',
      };
    }
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
  const racesAudit: FvRaceAuditItem[] = [];

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
    let winnerRank: number | null = null;
    let winnerFvPct = 0;

    for (let i = 0; i < top5.length; i++) {
      const pos = i + 1;
      byPosition[pos].total++;
      const h = top5[i];
      const key = horseKey(h.horseName);
      const dorsalMatch = winner.dorsalNumber != null && h.dorsalNumber != null && winner.dorsalNumber === h.dorsalNumber;
      if (key === winnerKey || dorsalMatch) {
        byPosition[pos].wins++;
        winnerRank = pos;
        winnerFvPct = Math.round(h.factor * 1000) / 10;
      }
    }

    if (winnerRank === null) {
      batacazos++;
      // Check if winner had any FV points outside top 5
      const outside = fv.slice(5).find(h => {
        const key = horseKey(h.horseName);
        const dorsalMatch = winner.dorsalNumber != null && h.dorsalNumber != null && winner.dorsalNumber === h.dorsalNumber;
        return key === winnerKey || dorsalMatch;
      });
      if (outside) winnerFvPct = Math.round(outside.factor * 1000) / 10;
    }

    const mInfo = meetingMap.get(race.meetingId.toString()) ?? { meetingNumber: 0, date: '' };
    const topHorses = top5.map((h, idx) => ({
      pos: idx + 1,
      dorsalNumber: h.dorsalNumber,
      horseName: h.horseName,
      fvPct: Math.round(h.factor * 1000) / 10,
    }));

    const p1 = topHorses[0]?.fvPct ?? 0;
    const p2 = topHorses[1]?.fvPct ?? 0;
    const p3 = topHorses[2]?.fvPct ?? 0;

    racesAudit.push({
      raceId: rid,
      meetingNumber: mInfo.meetingNumber,
      date: mInfo.date,
      raceNumber: race.raceNumber,
      distance: race.distance ?? 0,
      fieldSize: fieldSizeByRace[rid] ?? 0,
      forecasterCount: raceForecasts.length,
      topHorses,
      sumTop2Pct: Math.round((p1 + p2) * 10) / 10,
      sumTop3Pct: Math.round((p1 + p2 + p3) * 10) / 10,
      winner: {
        dorsalNumber: winner.dorsalNumber,
        horseName: winner.horseName,
        fvRank: winnerRank,
        fvPct: winnerFvPct,
      },
    });
  }

  // Sort audit newest meeting/date first, then raceNumber asc
  racesAudit.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.meetingNumber !== b.meetingNumber) return b.meetingNumber - a.meetingNumber;
    return a.raceNumber - b.raceNumber;
  });

  const byPositionArray = [1, 2, 3, 4, 5].map(pos => {
    const { total, wins } = byPosition[pos];
    return { position: pos, total, wins, pct: round1(wins, total) };
  });

  // ── 1. Thresholds (+40, +50, +60) both cumulative and band + who beats them ─
  const thresholdDefs: { label: string; mode: 'cumulative' | 'band'; min: number; max: number }[] = [
    { label: 'FV +60% (≥ 60%)', mode: 'cumulative', min: 60, max: 999 },
    { label: 'FV +50% (≥ 50%)', mode: 'cumulative', min: 50, max: 999 },
    { label: 'FV +40% (≥ 40%)', mode: 'cumulative', min: 40, max: 999 },
    { label: 'Banda 60% o más', mode: 'band', min: 60, max: 999 },
    { label: 'Banda 50% – 59.9%', mode: 'band', min: 50, max: 60 },
    { label: 'Banda 40% – 49.9%', mode: 'band', min: 40, max: 50 },
  ];

  const thresholds: FvThresholdBreakdown[] = thresholdDefs.map(def => {
    let totalCandidates = 0;
    let wins = 0;
    let wonBy2nd = 0;
    let wonBy3rd = 0;
    let wonBy4th = 0;
    let wonBy5th = 0;
    let wonByBatacazo = 0;

    for (const r of racesAudit) {
      // Evaluate horses in the race that hit the threshold (typically 1st FV, or occasionally 2nd FV)
      const qualifying = r.topHorses.filter(h => h.fvPct >= def.min && h.fvPct < def.max);
      for (const q of qualifying) {
        totalCandidates++;
        if (r.winner.fvRank === q.pos) {
          wins++;
        } else {
          if (r.winner.fvRank === 2) wonBy2nd++;
          else if (r.winner.fvRank === 3) wonBy3rd++;
          else if (r.winner.fvRank === 4) wonBy4th++;
          else if (r.winner.fvRank === 5) wonBy5th++;
          else if (r.winner.fvRank === 1) wonBy2nd++; // if a 2nd FV had +40 and lost to 1st FV
          else wonByBatacazo++;
        }
      }
    }

    const losses = totalCandidates - wins;
    return {
      label: def.label,
      mode: def.mode,
      totalCandidates,
      wins,
      winPct: round1(wins, totalCandidates),
      losses,
      whenLost: {
        wonBy2nd,
        wonBy3rd,
        wonBy4th,
        wonBy5th,
        wonByBatacazo,
        wonBy2ndPct: round1(wonBy2nd, losses),
        wonBy3rdPct: round1(wonBy3rd, losses),
        wonBy4thPct: round1(wonBy4th, losses),
        wonBy5thPct: round1(wonBy5th, losses),
        wonByBatacazoPct: round1(wonByBatacazo, losses),
      },
    };
  });

  // ── 2. Field Size Matrix (2, 3, 4, 5, 6, 7, 8, 9, 10, 11+) ────────────────
  const fieldBuckets = new Map<number, FvRaceAuditItem[]>();
  for (const r of racesAudit) {
    if (r.fieldSize < 2) continue;
    const key = r.fieldSize >= 11 ? 11 : r.fieldSize;
    const list = fieldBuckets.get(key) ?? [];
    list.push(r);
    fieldBuckets.set(key, list);
  }

  const sortedFieldKeys = [...fieldBuckets.keys()].sort((a, b) => a - b);
  const byFieldSize: FvFieldSizeRow[] = sortedFieldKeys.map(key => {
    const list = fieldBuckets.get(key) ?? [];
    const totalRaces = list.length;
    const posWins = { pos1: 0, pos2: 0, pos3: 0, pos4: 0, pos5: 0, batacazo: 0 };
    for (const r of list) {
      if (r.winner.fvRank === 1) posWins.pos1++;
      else if (r.winner.fvRank === 2) posWins.pos2++;
      else if (r.winner.fvRank === 3) posWins.pos3++;
      else if (r.winner.fvRank === 4) posWins.pos4++;
      else if (r.winner.fvRank === 5) posWins.pos5++;
      else posWins.batacazo++;
    }
    return {
      fieldSizeLabel: key === 11 ? '11+ ejemplares' : `${key} ejemplares`,
      fieldSizeKey: key,
      totalRaces,
      posWins,
      posPcts: {
        pos1: round1(posWins.pos1, totalRaces),
        pos2: round1(posWins.pos2, totalRaces),
        pos3: round1(posWins.pos3, totalRaces),
        pos4: round1(posWins.pos4, totalRaces),
        pos5: round1(posWins.pos5, totalRaces),
        batacazo: round1(posWins.batacazo, totalRaces),
      },
      shareOfAllBatacazosPct: round1(posWins.batacazo, batacazos),
    };
  });

  // ── 2B. Dynamic Distance Matrix (auto-adds any distance run: 1100..3200m+) ─
  const distanceBuckets = new Map<number, FvRaceAuditItem[]>();
  for (const r of racesAudit) {
    if (!r.distance || r.distance <= 0) continue;
    const list = distanceBuckets.get(r.distance) ?? [];
    list.push(r);
    distanceBuckets.set(r.distance, list);
  }

  const sortedDistances = [...distanceBuckets.keys()].sort((a, b) => a - b);
  const byDistance: FvDistanceRow[] = sortedDistances.map(dist => {
    const list = distanceBuckets.get(dist) ?? [];
    const totalRaces = list.length;
    const posWins = { pos1: 0, pos2: 0, pos3: 0, pos4: 0, pos5: 0, batacazo: 0 };
    for (const r of list) {
      if (r.winner.fvRank === 1) posWins.pos1++;
      else if (r.winner.fvRank === 2) posWins.pos2++;
      else if (r.winner.fvRank === 3) posWins.pos3++;
      else if (r.winner.fvRank === 4) posWins.pos4++;
      else if (r.winner.fvRank === 5) posWins.pos5++;
      else posWins.batacazo++;
    }
    return {
      distance: dist,
      distanceLabel: `${dist.toLocaleString('es-VE')} mts`,
      totalRaces,
      posWins,
      posPcts: {
        pos1: round1(posWins.pos1, totalRaces),
        pos2: round1(posWins.pos2, totalRaces),
        pos3: round1(posWins.pos3, totalRaces),
        pos4: round1(posWins.pos4, totalRaces),
        pos5: round1(posWins.pos5, totalRaces),
        batacazo: round1(posWins.batacazo, totalRaces),
      },
      shareOfAllBatacazosPct: round1(posWins.batacazo, batacazos),
    };
  });

  // ── 3. Combo Rules (Candados 1º+2º & Trilogías 1º+2º+3º) ──────────────────
  const comboDefs: {
    id: string;
    group: 'duo' | 'trilogia';
    label: string;
    description: string;
    match: (r: FvRaceAuditItem) => boolean;
  }[] = [
    {
      id: 'duo_sum_60',
      group: 'duo',
      label: 'Dúo (1º + 2º) suman ≥ 60%',
      description: 'La suma del FV del 1º y 2º favorito es al menos 60%',
      match: r => r.sumTop2Pct >= 60,
    },
    {
      id: 'duo_sum_70',
      group: 'duo',
      label: 'Dúo (1º + 2º) suman ≥ 70%',
      description: 'La suma del FV del 1º y 2º favorito es al menos 70%',
      match: r => r.sumTop2Pct >= 70,
    },
    {
      id: 'duo_sum_80',
      group: 'duo',
      label: 'Dúo (1º + 2º) suman ≥ 80%',
      description: 'La suma del FV del 1º y 2º favorito es al menos 80%',
      match: r => r.sumTop2Pct >= 80,
    },
    {
      id: 'duo_only2_20',
      group: 'duo',
      label: 'Solo 1º y 2º tienen FV ≥ 20% (3º < 20%)',
      description: 'Corte limpio: solo dos ejemplares alcanzan +20% y el 3º queda por debajo de 20%',
      match: r => (r.topHorses[0]?.fvPct ?? 0) >= 20 && (r.topHorses[1]?.fvPct ?? 0) >= 20 && (r.topHorses[2]?.fvPct ?? 0) < 20,
    },
    {
      id: 'duo_only2_25',
      group: 'duo',
      label: 'Solo 1º y 2º en color Dorado/Verde (≥ 25% y 3º < 25%)',
      description: 'Ambos favoritos en barra dorada/verde (≥ 25%) y el resto en gris (< 25%)',
      match: r => (r.topHorses[0]?.fvPct ?? 0) >= 25 && (r.topHorses[1]?.fvPct ?? 0) >= 25 && (r.topHorses[2]?.fvPct ?? 0) < 25,
    },
    {
      id: 'tri_sum_70',
      group: 'trilogia',
      label: 'Trilogía (1º + 2º + 3º) suman ≥ 70%',
      description: 'Los 3 primeros del FV acumulan 70% o más',
      match: r => r.sumTop3Pct >= 70,
    },
    {
      id: 'tri_sum_80',
      group: 'trilogia',
      label: 'Trilogía (1º + 2º + 3º) suman ≥ 80%',
      description: 'Los 3 primeros del FV acumulan 80% o más',
      match: r => r.sumTop3Pct >= 80,
    },
    {
      id: 'tri_sum_85',
      group: 'trilogia',
      label: 'Trilogía (1º + 2º + 3º) suman ≥ 85%',
      description: 'Los 3 primeros del FV acumulan 85% o más',
      match: r => r.sumTop3Pct >= 85,
    },
    {
      id: 'tri_only3_20',
      group: 'trilogia',
      label: '3 ejemplares con FV ≥ 20% (4º < 20%)',
      description: 'Los 3 primeros superan el 20% cada uno y el 4º cae por debajo de 20%',
      match: r =>
        (r.topHorses[0]?.fvPct ?? 0) >= 20 &&
        (r.topHorses[1]?.fvPct ?? 0) >= 20 &&
        (r.topHorses[2]?.fvPct ?? 0) >= 20 &&
        (r.topHorses[3]?.fvPct ?? 0) < 20,
    },
    {
      id: 'tri_pareja',
      group: 'trilogia',
      label: 'Trilogía pareja (1º < 40% y 3º ≥ 20%)',
      description: 'Sin favorito dominante (< 40%) pero con 3 ejemplares sólidos (≥ 20% cada uno, estilo 32-28-25)',
      match: r =>
        (r.topHorses[0]?.fvPct ?? 0) < 40 &&
        (r.topHorses[0]?.fvPct ?? 0) >= 20 &&
        (r.topHorses[1]?.fvPct ?? 0) >= 20 &&
        (r.topHorses[2]?.fvPct ?? 0) >= 20,
    },
  ];

  const comboRules: FvComboRuleRow[] = comboDefs.map(def => {
    const matched = racesAudit.filter(def.match);
    const matchingRaces = matched.length;
    let pos1 = 0, pos2 = 0, pos3 = 0;
    for (const r of matched) {
      if (r.winner.fvRank === 1) pos1++;
      else if (r.winner.fvRank === 2) pos2++;
      else if (r.winner.fvRank === 3) pos3++;
    }
    const winsInGroup = def.group === 'duo' ? pos1 + pos2 : pos1 + pos2 + pos3;
    return {
      id: def.id,
      group: def.group,
      label: def.label,
      description: def.description,
      matchingRaces,
      frequencyPct: round1(matchingRaces, countedRaces),
      winsInGroup,
      accuracyPct: round1(winsInGroup, matchingRaces),
      breakdownWins: { pos1, pos2, pos3 },
    };
  });

  // ── 4. Prescription Engine for 5y6 & Pool de 4 (Multivariable Rules) ──────
  const prescriptionDefs: {
    id: string;
    actionBadge: string;
    title: string;
    conditionText: string;
    recommendation: string;
    targetOutcomeLabel: string;
    match: (r: FvRaceAuditItem) => boolean;
    isSuccess: (r: FvRaceAuditItem) => boolean;
  }[] = [
    {
      id: 'linea_60',
      actionBadge: '📌 JUGAR LÍNEA (1 CABALLO)',
      title: 'Súper Favorito de Consenso (1º FV ≥ 60%)',
      conditionText: 'El 1º del Factor de Victoria tiene 60% o más de consenso.',
      recommendation: 'Jugar como Línea fija en el 5y6 o base del Pool de 4. Si decides cubrirlo en carreras de lote grande, el único refuerzo lógico es el 2º o 3º FV.',
      targetOutcomeLabel: 'Ganó el 1º FV directo',
      match: r => (r.topHorses[0]?.fvPct ?? 0) >= 60,
      isSuccess: r => r.winner.fvRank === 1,
    },
    {
      id: 'linea_1400_plus',
      actionBadge: '📌 LÍNEA / CANDADO CORTO',
      title: 'Favorito +50% en 1.400 mts o más',
      conditionText: 'Distancia ≥ 1.400m y el 1º FV tiene ≥ 50%.',
      recommendation: 'En 1.400m+ el desarrollo favorece al ejemplar superior: altísima efectividad del 1º FV y casi nulo riesgo de batacazo.',
      targetOutcomeLabel: 'Ganó 1º o 2º FV',
      match: r => r.distance >= 1400 && (r.topHorses[0]?.fvPct ?? 0) >= 50,
      isSuccess: r => r.winner.fvRank === 1 || r.winner.fvRank === 2,
    },
    {
      id: 'candado_50_59',
      actionBadge: '🔒 CANDADO DOBLE (1º + 2º FV)',
      title: 'Favorito en Banda 50%–59.9% + su Escolta (2º FV)',
      conditionText: 'El 1º FV está entre 50% y 59.9% (cuando pierde, la mitad de las veces lo derrota el 2º FV).',
      recommendation: 'En vez de arriesgar una línea vulnerable, amarrar la carrera con el 1º y 2º del FV en el cuadro.',
      targetOutcomeLabel: 'Ganó 1º o 2º FV',
      match: r => (r.topHorses[0]?.fvPct ?? 0) >= 50 && (r.topHorses[0]?.fvPct ?? 0) < 60,
      isSuccess: r => r.winner.fvRank === 1 || r.winner.fvRank === 2,
    },
    {
      id: 'candado_tiro_largo',
      actionBadge: '🔱 BLINDAJE TIRO MEDIO/LARGO (≥ 1.500m)',
      title: 'Carreras de 1.500m a 3.200m (Cero Batacazos)',
      conditionText: 'Distancia ≥ 1.500 metros.',
      recommendation: 'Históricamente NO ocurren batacazos fuera del Top 5 en tiros de 1.500m en adelante. Cerrar con los 3 primeros del FV asegura prácticamente la carrera.',
      targetOutcomeLabel: 'Ganó Top 3 FV (0% Batacazo)',
      match: r => r.distance >= 1500,
      isSuccess: r => r.winner.fvRank === 1 || r.winner.fvRank === 2 || r.winner.fvRank === 3,
    },
    {
      id: 'trilogia_20_corte',
      actionBadge: '🔱 TRILOGÍA (1º + 2º + 3º FV)',
      title: 'Trilogía de Corte Limpio (3 ejemplares ≥ 20% y 4º < 20%)',
      conditionText: 'Los 3 primeros tienen ≥ 20% cada uno y el 4º cae por debajo de 20%.',
      recommendation: 'Jugar exactamente esos 3 ejemplares en el 5y6 o Pool de 4. No gastar en un 4º caballo.',
      targetOutcomeLabel: 'Ganó 1º, 2º o 3º FV',
      match: r =>
        (r.topHorses[0]?.fvPct ?? 0) >= 20 &&
        (r.topHorses[1]?.fvPct ?? 0) >= 20 &&
        (r.topHorses[2]?.fvPct ?? 0) >= 20 &&
        (r.topHorses[3]?.fvPct ?? 0) < 20,
      isSuccess: r => r.winner.fvRank === 1 || r.winner.fvRank === 2 || r.winner.fvRank === 3,
    },
    {
      id: 'alerta_batacazo_lote_grande',
      actionBadge: '🚨 MULTIPLICAR / ALERTA DE BATACAZO',
      title: 'Tiro Corto (1.100m–1.300m) + Lote Grande (≥ 9 caballos) + 1º FV < 45%',
      conditionText: 'Distancia ≤ 1.300m, corren 9 o más ejemplares y ningún caballo llega a 45% de FV.',
      recommendation: 'Aquí es donde se caen los cuadros del 5y6. El 1º FV baja drásticamente su acierto; es la carrera obligatoria para abrir con 4+ ejemplares o buscar dividendo.',
      targetOutcomeLabel: 'Perdió el 1º FV (Sorpresa / Dividendo)',
      match: r => r.distance > 0 && r.distance <= 1300 && r.fieldSize >= 9 && (r.topHorses[0]?.fvPct ?? 0) < 45,
      isSuccess: r => r.winner.fvRank !== 1,
    },
  ];

  const prescriptionRules: FvPrescriptionRule[] = prescriptionDefs.map(def => {
    const matched = racesAudit.filter(def.match);
    const matchingRaces = matched.length;
    const successCount = matched.filter(def.isSuccess).length;
    return {
      id: def.id,
      actionBadge: def.actionBadge,
      title: def.title,
      conditionText: def.conditionText,
      recommendation: def.recommendation,
      matchingRaces,
      frequencyPct: round1(matchingRaces, countedRaces),
      successCount,
      successPct: round1(successCount, matchingRaces),
      targetOutcomeLabel: def.targetOutcomeLabel,
    };
  });

  // ── 5. Automatic Pattern Insights ─────────────────────────────────────────
  const insights: FvPatternInsight[] = [];

  const longRaces = racesAudit.filter(r => r.distance >= 1500);
  if (longRaces.length > 0) {
    const longBatacazos = longRaces.filter(r => r.winner.fvRank === null).length;
    const longTop3 = longRaces.filter(r => r.winner.fvRank !== null && r.winner.fvRank <= 3).length;
    insights.push({
      title: 'Patrón de Distancia: 1.500m a 3.200m vs Tiros Cortos',
      category: 'batacazos',
      metric: `${longBatacazos} batacazos en ${longRaces.length} carreras ≥ 1.500m`,
      detail: `En distancias de 1.500m o más solo hubo ${longBatacazos} batacazos (${round1(longBatacazos, longRaces.length)}%) y el Top 3 FV ganó el ${round1(longTop3, longRaces.length)}% de las veces. Todos los batacazos se concentran entre 1.100m y 1.400m.`,
    });
  }

  const th50 = thresholds.find(t => t.mode === 'cumulative' && t.label.includes('+50%'));
  if (th50 && th50.totalCandidates > 0) {
    const top23WhenLost = th50.whenLost.wonBy2nd + th50.whenLost.wonBy3rd;
    const top23Pct = round1(top23WhenLost, th50.losses);
    insights.push({
      title: 'Con Quién Se Caen los Grandes Favoritos (+50% FV)',
      category: 'favoritos',
      metric: `${th50.winPct}% acierto (${th50.wins}/${th50.totalCandidates})`,
      detail:
        th50.losses > 0
          ? `Cuando un ejemplar de +50% FV pierde (${th50.losses} casos), el ${top23Pct}% de las veces lo derrota el 2º (${th50.whenLost.wonBy2nd}) o 3º (${th50.whenLost.wonBy3rd}) del FV.`
          : `Los ejemplares con +50% FV han ganado el 100% de las veces registradas (${th50.wins}/${th50.totalCandidates}).`,
    });
  }

  const largeFieldBatacazos = byFieldSize
    .filter(f => f.fieldSizeKey >= 9)
    .reduce((acc, f) => acc + f.posWins.batacazo, 0);
  if (batacazos > 0) {
    insights.push({
      title: 'Efecto Tamaño de Lote (9+ Ejemplares)',
      category: 'batacazos',
      metric: `${round1(largeFieldBatacazos, batacazos)}% de todos los batacazos`,
      detail: `${largeFieldBatacazos} de los ${batacazos} batacazos totales ocurrieron cuando corrieron 9 o más ejemplares en pista.`,
    });
  }

  const bestTri = comboRules
    .filter(c => c.group === 'trilogia' && c.matchingRaces >= 3)
    .sort((a, b) => b.accuracyPct - a.accuracyPct)[0];
  if (bestTri) {
    insights.push({
      title: 'Mejor Regla de Trilogía (1º+2º+3º)',
      category: 'trilogias',
      metric: `${bestTri.accuracyPct}% efectividad (${bestTri.winsInGroup}/${bestTri.matchingRaces})`,
      detail: `"${bestTri.label}" asegura el ganador en el ${bestTri.accuracyPct}% de las carreras donde se cumple (${bestTri.matchingRaces} de ${countedRaces} carreras).`,
    });
  }

  return {
    trackId: track._id.toString(),
    trackName: track.name,
    totalRaces: countedRaces,
    batacazos,
    batacazoPct: round1(batacazos, countedRaces),
    byPosition: byPositionArray,
    thresholds,
    byFieldSize,
    byDistance,
    comboRules,
    prescriptionRules,
    insights,
    racesAudit,
  };
}

