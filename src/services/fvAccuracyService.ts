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
  meetingId: string;
  meetingNumber: number;
  date: string;
  year: number;
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
    fvRank: number | null; // 1..5 or null if outside Top 5
    fullFvRank?: number | null; // 1..N across all horses in FV, or null if 0% FV
    fvPct: number;
  };
}

export interface FvPatternInsight {
  title: string;
  category: 'favoritos' | 'batacazos' | 'candados' | 'trilogias';
  detail: string;
  metric: string;
}

export const FACTOR_5Y6_BS = 35;

export function get5y6FactorBs(dateStr: string): number {
  return dateStr && dateStr <= '2026-09-03' ? 20 : 35;
}

export function extractMeeting5y6Payouts(
  racesWithPayouts: { payouts?: { cincoYSeis?: { combination?: string; amount?: number }[] } }[]
): { payout6: number; payout5: number } {
  const raw: { c: string; a: number }[] = [];
  for (const r of racesWithPayouts) {
    if (r.payouts?.cincoYSeis?.length) {
      for (const p of r.payouts.cincoYSeis) {
        if (typeof p.amount === 'number' && p.amount > 0) {
          raw.push({ c: String(p.combination ?? ''), a: p.amount });
        }
      }
    }
  }
  if (!raw.length) return { payout6: 0, payout5: 0 };
  const unique = [...new Map(raw.map(x => [x.a, x])).values()];
  const filtered = unique.length >= 3 ? unique.filter(x => !/[-/]/.test(x.c)) : unique;
  const list = (filtered.length ? filtered : unique).sort((a, b) => b.a - a.a);
  if (list.length === 1) {
    return list[0].a < 5000 ? { payout6: 0, payout5: list[0].a } : { payout6: list[0].a, payout5: 0 };
  }
  return { payout6: list[0].a, payout5: list[1].a };
}

export interface FvValidaPick {
  validaNumber: number; // 1..6
  raceNumber: number;
  distance: number;
  fieldSize: number;
  safetyRank: number; // 1..6 (1 = más confiable, 6 = más peligrosa)
  badgeEco: string;
  badgeMed: string;
  badgeBli: string;
  badgePre: string;
  reasonText: string;
  countEco: number;
  countMed: number;
  countBli: number;
  countPre: number;
  isAllEco?: boolean;
  isAllMed?: boolean;
  isAllBli?: boolean;
  isAllPre?: boolean;
  picksEco: { pos: number; dorsalNumber?: number; horseName: string; fvPct: number }[];
  picksMed: { pos: number; dorsalNumber?: number; horseName: string; fvPct: number }[];
  picksBlindado: { pos: number; dorsalNumber?: number; horseName: string; fvPct: number }[];
  picksPremium: { pos: number; dorsalNumber?: number; horseName: string; fvPct: number }[];
  winner?: {
    dorsalNumber?: number;
    horseName: string;
    fvRank: number | null;
    fullFvRank?: number | null;
    fvPct: number;
  };
  hitEco?: boolean;
  hitMed?: boolean;
  hitBlindado?: boolean;
  hitPremium?: boolean;
}

export interface FvMeetingBacktestRow {
  meetingId: string;
  meetingNumber: number;
  date: string;
  year: number;
  factorBs: number;
  payout6Bs: number;
  payout5Bs: number;
  hasSuperFijo: boolean;
  combinationsEco: number;
  combinationsMed: number;
  combinationsBlindado: number;
  combinationsPremium: number;
  costBsEco: number;
  costBsMed: number;
  costBsBlindado: number;
  costBsPremium: number;
  prizeBsEco: number;
  prizeBsMed: number;
  prizeBsBlindado: number;
  prizeBsPremium: number;
  hitsEco: number; // 0..6
  hitsMed: number; // 0..6
  hitsBlindado: number; // 0..6
  hitsPremium: number; // 0..6
  validas: FvValidaPick[];
}

export interface FvTierSummary {
  hits6: number;
  hits5: number;
  hits5Or6: number;
  pct6: number;
  pct5Or6: number;
  avgCombinations: number;
  avgCostBs: number;
  totalCostBs: number;
  totalWonBs: number;
  netProfitBs: number;
}

export interface FvFiveAndSixBacktestSummary {
  totalMeetings: number;
  factorBs: number;
  economico: FvTierSummary;
  medio: FvTierSummary;
  blindado: FvTierSummary;
  premium: FvTierSummary;
  meetings: FvMeetingBacktestRow[];
}

export interface FvUpcomingFiveAndSix {
  meetingId: string;
  meetingNumber: number;
  date: string;
  isHistoricalPreview: boolean;
  hasSuperFijo: boolean;
  combinationsEco: number;
  combinationsMed: number;
  combinationsBlindado: number;
  combinationsPremium: number;
  costBsEco: number;
  costBsMed: number;
  costBsBlindado: number;
  costBsPremium: number;
  validas: FvValidaPick[];
}

export interface FvLabAnalytics {
  trackId: string;
  trackName: string;
  availableYears: number[];
  selectedYear: number | 'all';
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
  fiveAndSixBacktest: FvFiveAndSixBacktestSummary;
  upcomingFiveAndSix: FvUpcomingFiveAndSix | null;
  racesAudit: FvRaceAuditItem[];
}

function round1(num: number, den: number): number {
  return den > 0 ? Math.round((num / den) * 1000) / 10 : 0;
}

function buildMeetingValidasPicks(
  validasRaces: {
    raceNumber: number;
    distance: number;
    fieldSize: number;
    topHorses: { pos: number; dorsalNumber?: number; horseName: string; fvPct: number }[];
    sumTop2Pct: number;
    sumTop3Pct: number;
    winner?: {
      dorsalNumber?: number;
      horseName: string;
      fvRank: number | null;
      fullFvRank?: number | null;
      fvPct: number;
    };
  }[],
  isValencia: boolean,
  factorBs: number = FACTOR_5Y6_BS,
  payout6Bs: number = 0,
  payout5Bs: number = 0
): {
  hasSuperFijo: boolean;
  combinationsEco: number;
  combinationsMed: number;
  combinationsBlindado: number;
  combinationsPremium: number;
  costBsEco: number;
  costBsMed: number;
  costBsBlindado: number;
  costBsPremium: number;
  prizeBsEco: number;
  prizeBsMed: number;
  prizeBsBlindado: number;
  prizeBsPremium: number;
  hitsEco: number;
  hitsMed: number;
  hitsBlindado: number;
  hitsPremium: number;
  validas: FvValidaPick[];
} {
  const scored = validasRaces.map((r, idx) => {
    const p1 = r.topHorses[0]?.fvPct ?? 0;
    const p2 = r.topHorses[1]?.fvPct ?? 0;
    const gap12 = p1 - p2;
    const distScore =
      r.distance >= 1500 && p1 >= 42 ? 14 : r.distance === 1400 && p1 >= 42 ? 10 : r.distance === 1100 ? -6 : 0;
    const lotScore = r.fieldSize <= 7 ? 10 : r.fieldSize === 8 ? 6 : r.fieldSize === 9 ? 0 : -10;
    const score = p1 * 1.15 + gap12 * 0.4 + r.sumTop2Pct * 0.35 + r.sumTop3Pct * 0.45 + distScore + lotScore;
    return { idx, score, p1, p2, r };
  });

  const sortedBySafety = [...scored].sort((a, b) => b.score - a.score);
  const safetyRankByIdx = new Map<number, number>();
  sortedBySafety.forEach((item, rank) => {
    safetyRankByIdx.set(item.idx, rank);
  });

  const bestSafe = sortedBySafety[0];
  const hasSuperFijo = !isValencia
    ? (bestSafe.p1 >= 58 && bestSafe.r.fieldSize <= 9) ||
      (bestSafe.p1 >= 48 && bestSafe.r.distance >= 1400 && bestSafe.r.fieldSize <= 9)
    : bestSafe.p1 >= 58 && bestSafe.r.fieldSize <= 8;

  const bottom4ByWeakestP1 = [...validasRaces]
    .map((r, idx) => ({ idx, p1: r.topHorses[0]?.fvPct ?? 0 }))
    .filter(x => (safetyRankByIdx.get(x.idx) ?? 0) >= 2)
    .sort((a, b) => a.p1 - b.p1);
  const weakestIdx1 = bottom4ByWeakestP1[0]?.idx ?? -1;
  const weakestIdx2 = bottom4ByWeakestP1[1]?.idx ?? -1;

  // Compute raw counts for the 4 tiers
  const countsEco = validasRaces.map((_, idx) => {
    const rk = safetyRankByIdx.get(idx) ?? 3;
    return rk === 0 ? 1 : rk === 1 || rk === 2 ? 2 : rk === 3 || rk === 4 ? 3 : 4;
  });

  const countsMed = validasRaces.map((r, idx) => {
    const rk = safetyRankByIdx.get(idx) ?? 3;
    const fvLen = Math.max(r.topHorses.length, 4);
    if (hasSuperFijo) {
      return rk === 0 ? 1 : rk === 1 ? 4 : rk === 2 ? 2 : rk === 3 || rk === 4 ? 3 : Math.min(fvLen, 6);
    } else {
      return rk === 0 ? 2 : rk === 1 ? 4 : rk === 2 ? 2 : 3;
    }
  });

  const countsBli = validasRaces.map((r, idx) => {
    const rk = safetyRankByIdx.get(idx) ?? 3;
    const p1 = r.topHorses[0]?.fvPct ?? 0;
    const fvLen = Math.max(r.topHorses.length, 4);
    if (!isValencia) {
      if (rk === 0) return p1 >= 61 && r.fieldSize <= 9 ? 1 : 2;
      if (rk === 1) return 4;
      if (idx === weakestIdx1 || idx === weakestIdx2) return Math.min(5, fvLen);
      if (rk === 2) return 2;
      return 3;
    } else {
      return rk === 0 ? 3 : rk === 1 ? 4 : rk === 2 ? 2 : rk === 3 ? 3 : 4;
    }
  });

  const countsPre = validasRaces.map((r, idx) => {
    const rk = safetyRankByIdx.get(idx) ?? 3;
    const p1 = r.topHorses[0]?.fvPct ?? 0;
    const p3 = r.topHorses[2]?.fvPct ?? 0;
    const p4 = r.topHorses[3]?.fvPct ?? 0;
    const p5 = r.topHorses[4]?.fvPct ?? 0;
    const p6 = r.topHorses[5]?.fvPct ?? 0;
    const optHorses = r.topHorses.filter(h => h.fvPct >= 3.3).length;
    const fvLen = Math.max(r.topHorses.length, 4);

    if (!isValencia) {
      let base =
        bestSafe.p1 >= 59 && bestSafe.r.fieldSize <= 9
          ? rk === 0
            ? 1
            : rk === 1
            ? 5
            : rk === 2 || rk === 3
            ? 3
            : rk === 4
            ? 4
            : 5
          : rk === 0
          ? 3
          : rk === 1
          ? 4
          : rk === 2
          ? 2
          : rk === 3
          ? 3
          : 4;
      if (rk === 0 && base === 3 && ((r.sumTop2Pct >= 75 && p3 < 13) || (r.distance >= 1500 && r.fieldSize <= 8))) {
        base = 2;
      }
      if (p1 < 37 || p5 >= 6.2 || (r.fieldSize >= 10 && r.distance <= 1300 && p6 >= 3.3)) {
        base = Math.max(base, Math.min(optHorses, 6));
      }
      if (rk === 2 && p3 >= 16) {
        base = Math.max(base, p4 >= 11 ? 4 : 3);
      }
      return Math.min(base, fvLen);
    } else {
      let base = countsBli[idx];
      if (r.fieldSize >= 10 && p6 >= 4.5) base = Math.max(base, Math.min(optHorses, 6));
      if (rk === 2 && p4 >= 10) base = Math.max(base, 4);
      if (rk === 3 && p3 >= 16) base = Math.max(base, 3);
      return Math.min(base, fvLen);
    }
  });

  const prod = (arr: number[]) => arr.reduce((a, b) => a * b, 1);
  while (prod(countsPre) > 2160) {
    let trimmed = false;
    if (isValencia) {
      for (let i = 0; i < 6; i++) {
        const rk = safetyRankByIdx.get(i) ?? 3;
        const p3 = validasRaces[i].topHorses[2]?.fvPct ?? 0;
        if (rk === 0 && countsPre[i] === 3 && validasRaces[i].sumTop2Pct >= 74 && p3 < 15) {
          countsPre[i] = 2;
          trimmed = true;
          break;
        }
      }
      if (trimmed) continue;
    }
    let minPct = 999;
    let trimIdx = -1;
    for (let i = 0; i < 6; i++) {
      const minFloor = isValencia ? countsBli[i] : 3;
      if (countsPre[i] > minFloor) {
        const rk = safetyRankByIdx.get(i) ?? 3;
        const p4 = validasRaces[i].topHorses[3]?.fvPct ?? 0;
        const lastPct = rk === 0 ? 99 : p4;
        if (lastPct < minPct) {
          minPct = lastPct;
          trimIdx = i;
        }
      }
    }
    if (trimIdx >= 0) countsPre[trimIdx]--;
    else break;
  }

  let hitsEco = 0,
    hitsMed = 0,
    hitsBlindado = 0,
    hitsPremium = 0;
  let missedIdxEco = -1,
    missedIdxMed = -1,
    missedIdxBli = -1,
    missedIdxPre = -1;

  const validas: FvValidaPick[] = validasRaces.map((r, idx) => {
    const rk = safetyRankByIdx.get(idx) ?? 3;
    const p1 = r.topHorses[0]?.fvPct ?? 0;
    const countEco = countsEco[idx];
    const countMed = countsMed[idx];
    const countBli = countsBli[idx];
    const countPre = countsPre[idx];

    const badgeEco =
      countEco === 1 ? '📌 LÍNEA (1)' : countEco === 2 ? '🔒 CANDADO (2)' : countEco === 3 ? '🔱 TRILOGÍA (3)' : `🚨 MULTIPLICAR (${countEco})`;
    const badgeMed =
      countMed === 1 ? '📌 LÍNEA (1)' : countMed === 2 ? '🔒 CANDADO (2)' : countMed === 3 ? '🔱 TRILOGÍA (3)' : countMed === 4 ? '🛡️ ANTI-SORPRESA (4)' : `🚨 ABRE (${countMed})`;
    const badgeBli =
      countBli === 1 ? '📌 LÍNEA (1)' : countBli === 2 ? '🔒 CANDADO (2)' : countBli === 3 ? '🔱 TRILOGÍA (3)' : countBli === 4 ? '🛡️ BLINDAJE (4)' : `🚨 CAZA DIVIDENDO (${countBli})`;
    const badgePre =
      countPre === 1 ? '📌 LÍNEA (1)' : countPre === 2 ? '🔒 CANDADO (2)' : countPre === 3 ? '🔱 TRILOGÍA (3)' : countPre === 4 ? '👑 PREMIUM (4)' : `👑 COBERTURA FV (${countPre})`;

    const reasonText =
      rk === 0
        ? `Válida #1 en confianza (${p1}% FV · ${r.distance}m · ${r.fieldSize} ej.).`
        : rk === 1
        ? `2ª válida en confianza (${p1}% FV): zona histórica de "falso 2º fijo" (cubierta con 4–5 ej. en Medio/Blindado/Premium).`
        : countPre >= 5
        ? `Alerta de dividendo (1º FV ${p1}% · ${r.fieldSize} ej.): 5º/6º FV con opción estadística activa.`
        : `Suma Top 2: ${r.sumTop2Pct}% · Suma Top 3: ${r.sumTop3Pct}% FV.`;

    const picksEco = r.topHorses.slice(0, countEco);
    const picksMed = r.topHorses.slice(0, countMed);
    const picksBlindado = r.topHorses.slice(0, countBli);
    const picksPremium = r.topHorses.slice(0, countPre);

    let hitEco: boolean | undefined;
    let hitMed: boolean | undefined;
    let hitBlindado: boolean | undefined;
    let hitPremium: boolean | undefined;

    if (r.winner) {
      const wRank = r.winner.fullFvRank ?? r.winner.fvRank;
      hitEco = wRank !== null && wRank <= countEco;
      hitMed = wRank !== null && wRank <= countMed;
      hitBlindado = wRank !== null && wRank <= countBli;
      hitPremium = wRank !== null && wRank <= countPre;
      if (hitEco) hitsEco++;
      else missedIdxEco = idx;
      if (hitMed) hitsMed++;
      else missedIdxMed = idx;
      if (hitBlindado) hitsBlindado++;
      else missedIdxBli = idx;
      if (hitPremium) hitsPremium++;
      else missedIdxPre = idx;
    }

    return {
      validaNumber: idx + 1,
      raceNumber: r.raceNumber,
      distance: r.distance,
      fieldSize: r.fieldSize,
      safetyRank: rk + 1,
      badgeEco,
      badgeMed,
      badgeBli,
      badgePre,
      reasonText,
      countEco,
      countMed,
      countBli,
      countPre,
      picksEco,
      picksMed,
      picksBlindado,
      picksPremium,
      winner: r.winner,
      hitEco,
      hitMed,
      hitBlindado,
      hitPremium,
    };
  });

  const combinationsEco = prod(countsEco);
  const combinationsMed = prod(countsMed);
  const combinationsBlindado = prod(countsBli);
  const combinationsPremium = prod(countsPre);

  function calcPrize(hits: number, counts: number[], missedIdx: number): number {
    if (hits === 6) {
      const mult5 = counts.reduce((s, c) => s + (c - 1), 0);
      return Math.round(payout6Bs + mult5 * payout5Bs);
    }
    if (hits === 5 && missedIdx >= 0) {
      return Math.round(counts[missedIdx] * payout5Bs);
    }
    return 0;
  }

  return {
    hasSuperFijo,
    combinationsEco,
    combinationsMed,
    combinationsBlindado,
    combinationsPremium,
    costBsEco: combinationsEco * factorBs,
    costBsMed: combinationsMed * factorBs,
    costBsBlindado: combinationsBlindado * factorBs,
    costBsPremium: combinationsPremium * factorBs,
    prizeBsEco: calcPrize(hitsEco, countsEco, missedIdxEco),
    prizeBsMed: calcPrize(hitsMed, countsMed, missedIdxMed),
    prizeBsBlindado: calcPrize(hitsBlindado, countsBli, missedIdxBli),
    prizeBsPremium: calcPrize(hitsPremium, countsPre, missedIdxPre),
    hitsEco,
    hitsMed,
    hitsBlindado,
    hitsPremium,
    validas,
  };
}

export async function getFvLabAnalytics(
  trackNameQuery: string,
  yearFilter?: number | 'all'
): Promise<FvLabAnalytics | null> {
  await dbConnect();
  void Horse;

  const track = await Track.findOne({ name: { $regex: new RegExp(trackNameQuery, 'i') } }).lean() as any;
  if (!track) return null;

  const allMeetings = await Meeting.find({ trackId: track._id })
    .select('_id meetingNumber date')
    .lean() as any[];

  const yearsSet = new Set<number>();
  for (const m of allMeetings) {
    if (m.date) {
      const y = new Date(m.date).getUTCFullYear();
      if (y >= 2020 && y <= 2035) yearsSet.add(y);
    }
  }
  const availableYears = [...yearsSet].sort((a, b) => b - a);
  const selectedYear: number | 'all' = yearFilter ?? 'all';

  const meetings =
    selectedYear === 'all'
      ? allMeetings
      : allMeetings.filter(m => m.date && new Date(m.date).getUTCFullYear() === selectedYear);

  const meetingMap = new Map<string, { meetingNumber: number; date: string; year: number }>();
  for (const m of meetings) {
    const dt = m.date ? new Date(m.date) : null;
    meetingMap.set(m._id.toString(), {
      meetingNumber: m.meetingNumber ?? 0,
      date: dt ? dt.toISOString().slice(0, 10) : '',
      year: dt ? dt.getUTCFullYear() : 2026,
    });
  }

  const emptyTier: FvTierSummary = {
    hits6: 0,
    hits5: 0,
    hits5Or6: 0,
    pct6: 0,
    pct5Or6: 0,
    avgCombinations: 0,
    avgCostBs: 0,
    totalCostBs: 0,
    totalWonBs: 0,
    netProfitBs: 0,
  };

  const emptyBacktest: FvFiveAndSixBacktestSummary = {
    totalMeetings: 0,
    factorBs: FACTOR_5Y6_BS,
    economico: emptyTier,
    medio: emptyTier,
    blindado: emptyTier,
    premium: emptyTier,
    meetings: [],
  };

  const meetingIds = meetings.map(m => m._id.toString());
  if (!meetingIds.length) {
    return {
      trackId: track._id.toString(),
      trackName: track.name,
      availableYears,
      selectedYear,
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
      fiveAndSixBacktest: emptyBacktest,
      upcomingFiveAndSix: null,
      racesAudit: [],
    };
  }

  const races = await Race.find({ meetingId: { $in: meetingIds }, hasResults: true })
    .select('_id raceNumber distance meetingId payouts')
    .lean() as any[];

  if (!races.length) {
    return {
      trackId: track._id.toString(),
      trackName: track.name,
      availableYears,
      selectedYear,
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
      fiveAndSixBacktest: emptyBacktest,
      upcomingFiveAndSix: null,
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

    let fullFvRank: number | null = null;
    const foundFullIdx = fv.findIndex(h => {
      const key = horseKey(h.horseName);
      const dorsalMatch = winner.dorsalNumber != null && h.dorsalNumber != null && winner.dorsalNumber === h.dorsalNumber;
      return key === winnerKey || dorsalMatch;
    });
    if (foundFullIdx >= 0) {
      fullFvRank = foundFullIdx + 1;
      winnerFvPct = Math.round(fv[foundFullIdx].factor * 1000) / 10;
    }

    if (winnerRank === null) {
      batacazos++;
    }

    const mId = race.meetingId.toString();
    const mInfo = meetingMap.get(mId) ?? { meetingNumber: 0, date: '', year: 2026 };
    const topHorses = fv.slice(0, 7).map((h, idx) => ({
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
      meetingId: mId,
      meetingNumber: mInfo.meetingNumber,
      date: mInfo.date,
      year: mInfo.year,
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
        fullFvRank,
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

  // ── 6. 5y6 Historical Backtesting across all meetings + Upcoming 5y6 ─────
  const isValencia = /valencia/i.test(track.name ?? trackNameQuery);
  const rawRacesByMeeting = new Map<string, any[]>();
  for (const r of races) {
    const mId = r.meetingId.toString();
    const arr = rawRacesByMeeting.get(mId) ?? [];
    arr.push(r);
    rawRacesByMeeting.set(mId, arr);
  }

  const racesByMeeting = new Map<string, FvRaceAuditItem[]>();
  for (const r of racesAudit) {
    const arr = racesByMeeting.get(r.meetingId) ?? [];
    arr.push(r);
    racesByMeeting.set(r.meetingId, arr);
  }

  const backtestRows: FvMeetingBacktestRow[] = [];
  for (const [mId, mRaces] of racesByMeeting.entries()) {
    if (mRaces.length < 6) continue;
    const sortedAsc = [...mRaces].sort((a, b) => a.raceNumber - b.raceNumber);
    const validas6 = sortedAsc.slice(-6);
    const first = validas6[0];
    const factorBs = get5y6FactorBs(first.date);
    const { payout6, payout5 } = extractMeeting5y6Payouts(rawRacesByMeeting.get(mId) ?? []);
    const built = buildMeetingValidasPicks(validas6, isValencia, factorBs, payout6, payout5);
    backtestRows.push({
      meetingId: mId,
      meetingNumber: first.meetingNumber,
      date: first.date,
      year: first.year,
      factorBs,
      payout6Bs: payout6,
      payout5Bs: payout5,
      hasSuperFijo: built.hasSuperFijo,
      combinationsEco: built.combinationsEco,
      combinationsMed: built.combinationsMed,
      combinationsBlindado: built.combinationsBlindado,
      combinationsPremium: built.combinationsPremium,
      costBsEco: built.costBsEco,
      costBsMed: built.costBsMed,
      costBsBlindado: built.costBsBlindado,
      costBsPremium: built.costBsPremium,
      prizeBsEco: built.prizeBsEco,
      prizeBsMed: built.prizeBsMed,
      prizeBsBlindado: built.prizeBsBlindado,
      prizeBsPremium: built.prizeBsPremium,
      hitsEco: built.hitsEco,
      hitsMed: built.hitsMed,
      hitsBlindado: built.hitsBlindado,
      hitsPremium: built.hitsPremium,
      validas: built.validas,
    });
  }

  backtestRows.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.meetingNumber - a.meetingNumber;
  });

  const totalBt = backtestRows.length;
  function summarizeTier(
    getHits: (m: FvMeetingBacktestRow) => number,
    getComb: (m: FvMeetingBacktestRow) => number,
    getCost: (m: FvMeetingBacktestRow) => number,
    getPrize: (m: FvMeetingBacktestRow) => number
  ): FvTierSummary {
    const hits6 = backtestRows.filter(m => getHits(m) === 6).length;
    const hits5 = backtestRows.filter(m => getHits(m) === 5).length;
    const avgCombinations =
      totalBt > 0 ? Math.round(backtestRows.reduce((s, m) => s + getComb(m), 0) / totalBt) : 0;
    const totalCostBs = Math.round(backtestRows.reduce((s, m) => s + getCost(m), 0));
    const totalWonBs = Math.round(backtestRows.reduce((s, m) => s + getPrize(m), 0));
    return {
      hits6,
      hits5,
      hits5Or6: hits6 + hits5,
      pct6: round1(hits6, totalBt),
      pct5Or6: round1(hits6 + hits5, totalBt),
      avgCombinations,
      avgCostBs: avgCombinations * FACTOR_5Y6_BS,
      totalCostBs,
      totalWonBs,
      netProfitBs: totalWonBs - totalCostBs,
    };
  }

  const fiveAndSixBacktest: FvFiveAndSixBacktestSummary = {
    totalMeetings: totalBt,
    factorBs: FACTOR_5Y6_BS,
    economico: summarizeTier(m => m.hitsEco, m => m.combinationsEco, m => m.costBsEco, m => m.prizeBsEco),
    medio: summarizeTier(m => m.hitsMed, m => m.combinationsMed, m => m.costBsMed, m => m.prizeBsMed),
    blindado: summarizeTier(
      m => m.hitsBlindado,
      m => m.combinationsBlindado,
      m => m.costBsBlindado,
      m => m.prizeBsBlindado
    ),
    premium: summarizeTier(
      m => m.hitsPremium,
      m => m.combinationsPremium,
      m => m.costBsPremium,
      m => m.prizeBsPremium
    ),
    meetings: backtestRows,
  };

  // Look for an upcoming/active meeting without results yet (or fallback to latest backtested meeting)
  let upcomingFiveAndSix: FvUpcomingFiveAndSix | null = null;
  const sortedAllMeetingsDesc = [...allMeetings].sort(
    (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
  );
  for (const candMeeting of sortedAllMeetingsDesc.slice(0, 4)) {
    const mId = candMeeting._id.toString();
    const candRaces = (await Race.find({ meetingId: candMeeting._id })
      .select('_id raceNumber distance hasResults')
      .sort({ raceNumber: 1 })
      .lean()) as any[];
    if (candRaces.length < 6) continue;
    const hasPendingResults = candRaces.some(r => !r.hasResults);
    if (!hasPendingResults) continue;

    const validasRacesDocs = candRaces.slice(-6);
    const vIds = validasRacesDocs.map(r => r._id.toString());
    const [vForecasts, vEntries] = await Promise.all([
      Forecast.find({ raceId: { $in: vIds }, isPublished: true }).select('raceId marks').lean() as any,
      Entry.find({ raceId: { $in: vIds } }).select('raceId status result').lean() as any,
    ]);
    const fcMap: Record<string, any[]> = {};
    for (const f of vForecasts) {
      const rid = f.raceId.toString();
      if (!fcMap[rid]) fcMap[rid] = [];
      fcMap[rid].push(f);
    }
    const fsMap: Record<string, number> = {};
    for (const e of vEntries) {
      const rid = e.raceId.toString();
      if (e.status !== 'scratched' && !e.result?.isScratched && !e.result?.isInvalidated) {
        fsMap[rid] = (fsMap[rid] ?? 0) + 1;
      }
    }
    const validasInput = validasRacesDocs
      .map(r => {
        const rid = r._id.toString();
        const fcs = fcMap[rid] ?? [];
        if (!fcs.length) return null;
        const fv = calcFv(fcs).slice(0, 7);
        if (!fv.length) return null;
        const topHorses = fv.map((h, i) => ({
          pos: i + 1,
          dorsalNumber: h.dorsalNumber,
          horseName: h.horseName,
          fvPct: Math.round(h.factor * 1000) / 10,
        }));
        const p1 = topHorses[0]?.fvPct ?? 0;
        const p2 = topHorses[1]?.fvPct ?? 0;
        const p3 = topHorses[2]?.fvPct ?? 0;
        return {
          raceNumber: r.raceNumber,
          distance: r.distance ?? 0,
          fieldSize: fsMap[rid] ?? 8,
          topHorses,
          sumTop2Pct: Math.round((p1 + p2) * 10) / 10,
          sumTop3Pct: Math.round((p1 + p2 + p3) * 10) / 10,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (validasInput.length === 6) {
      const built = buildMeetingValidasPicks(validasInput, isValencia, FACTOR_5Y6_BS, 0, 0);
      upcomingFiveAndSix = {
        meetingId: mId,
        meetingNumber: candMeeting.meetingNumber ?? 0,
        date: candMeeting.date ? new Date(candMeeting.date).toISOString().slice(0, 10) : '',
        isHistoricalPreview: false,
        hasSuperFijo: built.hasSuperFijo,
        combinationsEco: built.combinationsEco,
        combinationsMed: built.combinationsMed,
        combinationsBlindado: built.combinationsBlindado,
        combinationsPremium: built.combinationsPremium,
        costBsEco: built.costBsEco,
        costBsMed: built.costBsMed,
        costBsBlindado: built.costBsBlindado,
        costBsPremium: built.costBsPremium,
        validas: built.validas,
      };
      break;
    }
  }

  if (!upcomingFiveAndSix && backtestRows.length > 0) {
    const latest = backtestRows[0];
    upcomingFiveAndSix = {
      meetingId: latest.meetingId,
      meetingNumber: latest.meetingNumber,
      date: latest.date,
      isHistoricalPreview: true,
      hasSuperFijo: latest.hasSuperFijo,
      combinationsEco: latest.combinationsEco,
      combinationsMed: latest.combinationsMed,
      combinationsBlindado: latest.combinationsBlindado,
      combinationsPremium: latest.combinationsPremium,
      costBsEco: latest.costBsEco,
      costBsMed: latest.costBsMed,
      costBsBlindado: latest.costBsBlindado,
      costBsPremium: latest.costBsPremium,
      validas: latest.validas,
    };
  }

  return {
    trackId: track._id.toString(),
    trackName: track.name,
    availableYears,
    selectedYear,
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
    fiveAndSixBacktest,
    upcomingFiveAndSix,
    racesAudit,
  };
}

