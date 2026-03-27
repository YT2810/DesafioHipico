/**
 * Respuestas directas del Melli sin LLM.
 * Cuando el clasificador de intenciones detecta una consulta clara,
 * esta función genera la respuesta desde la DB con templates fijos.
 */
import connectDB from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import Race from '@/models/Race';
import Entry from '@/models/Entry';
import Forecast from '@/models/Forecast';
import HandicapperProfile from '@/models/HandicapperProfile';
import WorkoutEntry from '@/models/WorkoutEntry';
import Track from '@/models/Track';
import { MelliIntent } from '@/models/JargonEntry';

interface DirectResponseParams {
  intent: MelliIntent;
  meetingId?: string;
  raceNumber?: number;
  validaRef?: number;
  horseName?: string;
}

interface DirectResponse {
  content: string;
  raceNumber?: number;
  action: string;
}

const DISCLAIMER = '\n\n📊 DesafíoHípico.com — Análisis estadístico, no recomendación.';

/**
 * Genera una respuesta directa desde la DB sin llamar a OpenAI.
 * Retorna null si no puede responder (fallback a LLM).
 */
export async function generateDirectResponse(params: DirectResponseParams): Promise<DirectResponse | null> {
  await connectDB();

  const { intent, meetingId, raceNumber, validaRef } = params;

  if (!meetingId) return null; // Sin reunión no podemos hacer nada directo

  const meeting = await Meeting.findById(meetingId).populate({ path: 'trackId', model: Track }).lean() as any;
  if (!meeting) return null;

  const trackName = meeting.trackId?.name ?? 'Hipódromo';

  // Cargar carreras
  const races = await Race.find({ meetingId: meeting._id }).sort({ raceNumber: 1 }).lean() as any[];
  if (!races.length) return null;

  const maxRace = races.length;
  const validasStart = Math.max(1, maxRace - 5);

  // Resolver validaRef → raceNumber real
  let targetRaceNum = raceNumber;
  if (validaRef && !raceNumber) {
    targetRaceNum = validasStart + validaRef - 1;
    if (targetRaceNum > maxRace) targetRaceNum = maxRace;
  }

  switch (intent) {
    case 'consensus_pick':
      return targetRaceNum
        ? await buildRaceMarks(races, targetRaceNum, trackName, meeting)
        : await buildAllMarks(races, validasStart, trackName, meeting);

    case 'top_picks_all':
      return await buildAllMarks(races, 1, trackName, meeting);

    case 'pack_5y6':
      return await buildPack5y6(races, validasStart, maxRace, trackName, meeting);

    case 'best_workout':
      return targetRaceNum
        ? await buildBestWorkout(races, targetRaceNum, trackName, meeting)
        : null;

    case 'race_program':
      return targetRaceNum
        ? await buildRaceProgram(races, targetRaceNum, trackName)
        : null;

    case 'full_program':
      return await buildFullProgram(races, trackName);

    default:
      return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getConsensus(raceId: string) {
  const forecasts = await Forecast.find({ raceId, isPublished: true, isVip: false })
    .populate({ path: 'handicapperId', model: HandicapperProfile, select: 'pseudonym' })
    .lean() as any[];

  if (!forecasts.length) return null;

  const votes: Record<string, { count: number; dorsal?: number }> = {};
  const secondVotes: Record<string, { count: number; dorsal?: number }> = {};

  for (const f of forecasts) {
    // DB uses 'marks' sorted by preferenceOrder, fallback to 'picks' for legacy
    const entries = (f.marks?.length ? f.marks : f.picks) ?? [];
    const sorted = [...entries].sort((a: any, b: any) => (a.preferenceOrder ?? 0) - (b.preferenceOrder ?? 0));

    if (sorted.length > 0) {
      const p1 = sorted[0];
      const key1 = p1.horseName ?? `#${p1.dorsalNumber}`;
      if (!votes[key1]) votes[key1] = { count: 0, dorsal: p1.dorsalNumber };
      votes[key1].count++;

      if (sorted.length > 1) {
        const p2 = sorted[1];
        const key2 = p2.horseName ?? `#${p2.dorsalNumber}`;
        if (!secondVotes[key2]) secondVotes[key2] = { count: 0, dorsal: p2.dorsalNumber };
        secondVotes[key2].count++;
      }
    }
  }

  const sorted1 = Object.entries(votes).sort((a, b) => b[1].count - a[1].count);
  const sorted2 = Object.entries(secondVotes).sort((a, b) => b[1].count - a[1].count);

  return {
    hcpCount: forecasts.length,
    first: sorted1[0] ? { name: sorted1[0][0], dorsal: sorted1[0][1].dorsal, votes: sorted1[0][1].count } : null,
    second: sorted2[0] ? { name: sorted2[0][0], dorsal: sorted2[0][1].dorsal, votes: sorted2[0][1].count } : null,
  };
}

async function getBestWorkout(entries: any[]) {
  const now = new Date();
  let best: any = null;
  let bestDays = Infinity;

  for (const e of entries) {
    const horse = e.horseId?.name ?? e.horseName ?? '';
    if (!horse) continue;
    const workout = await WorkoutEntry.findOne({
      horseName: { $regex: new RegExp(horse.split(' ')[0], 'i') },
      workoutDate: { $gte: new Date(now.getTime() - 14 * 24 * 3600 * 1000) },
      distance: { $gt: 0 },
    }).sort({ workoutDate: -1 }).lean() as any;

    if (workout) {
      const days = Math.floor((now.getTime() - new Date(workout.workoutDate).getTime()) / 86400000);
      if (days < bestDays) {
        bestDays = days;
        best = { horse, workout, days };
      }
    }
  }
  return best;
}

async function buildRaceMarks(races: any[], raceNum: number, trackName: string, meeting: any): Promise<DirectResponse | null> {
  const race = races.find(r => r.raceNumber === raceNum);
  if (!race) return { content: `No encontré la carrera ${raceNum} en ${trackName}, socio.`, raceNumber: raceNum, action: 'marks_1race' };

  const consensus = await getConsensus(race._id.toString());
  const entries = await Entry.find({ raceId: race._id }).populate('horseId').lean() as any[];
  const bestWork = await getBestWorkout(entries);

  const validaNum = raceNum >= Math.max(1, races.length - 5)
    ? raceNum - Math.max(1, races.length - 5) + 1
    : null;
  const validaTag = validaNum ? ` (Válida ${validaNum})` : '';

  let lines: string[] = [];
  lines.push(`🏇 **C${raceNum}${validaTag} ${trackName}** | ${race.distance ?? ''}m`);

  if (consensus?.first) {
    lines.push(`📊 Consenso de ${consensus.hcpCount} hcp: **${consensus.first.name}** (#${consensus.first.dorsal})`);
    if (consensus.second) {
      lines.push(`📊 2da marca: **${consensus.second.name}** (#${consensus.second.dorsal})`);
    }
  } else {
    lines.push(`Sin pronósticos publicados aún para esta carrera.`);
  }

  if (bestWork) {
    lines.push(`↳ Mejor trabajo: ${bestWork.horse} — ${bestWork.workout.workoutType} ${bestWork.workout.distance}m | ${bestWork.workout.splits} | hace ${bestWork.days}d`);
  }

  lines.push(DISCLAIMER);
  return { content: lines.join('\n'), raceNumber: raceNum, action: 'marks_1race' };
}

async function buildAllMarks(races: any[], fromRace: number, trackName: string, meeting: any): Promise<DirectResponse> {
  const validasStart = Math.max(1, races.length - 5);
  let lines: string[] = [`🏇 **Marcas ${trackName}** — Reunión ${meeting.meetingNumber}\n`];

  for (const race of races) {
    if (race.raceNumber < fromRace) continue;
    const consensus = await getConsensus(race._id.toString());
    const validaNum = race.raceNumber >= validasStart
      ? race.raceNumber - validasStart + 1
      : null;
    const tag = validaNum ? ` [V${validaNum}]` : '';

    if (consensus?.first) {
      const secondPart = consensus.second ? ` · ${consensus.second.name} (#${consensus.second.dorsal})` : '';
      lines.push(`C${race.raceNumber}${tag}: **${consensus.first.name}** (#${consensus.first.dorsal})${secondPart}`);
    } else {
      lines.push(`C${race.raceNumber}${tag}: Sin pronósticos aún`);
    }
  }

  lines.push(DISCLAIMER);
  return { content: lines.join('\n'), action: 'top_picks_all' };
}

async function buildPack5y6(races: any[], validasStart: number, maxRace: number, trackName: string, meeting: any): Promise<DirectResponse> {
  let lines: string[] = [`🏇 **5y6 ${trackName}** — Reunión ${meeting.meetingNumber}\n`];

  let validaNum = 1;
  for (let rn = validasStart; rn <= maxRace; rn++) {
    const race = races.find(r => r.raceNumber === rn);
    if (!race) continue;
    const consensus = await getConsensus(race._id.toString());

    if (consensus?.first) {
      const secondPart = consensus.second ? ` · ${consensus.second.name} (#${consensus.second.dorsal})` : '';
      lines.push(`V${validaNum} (C${rn}): **${consensus.first.name}** (#${consensus.first.dorsal})${secondPart}`);
    } else {
      lines.push(`V${validaNum} (C${rn}): Sin pronósticos aún`);
    }
    validaNum++;
  }

  lines.push(DISCLAIMER);
  return { content: lines.join('\n'), action: 'pack_5y6' };
}

async function buildBestWorkout(races: any[], raceNum: number, trackName: string, meeting: any): Promise<DirectResponse | null> {
  const race = races.find(r => r.raceNumber === raceNum);
  if (!race) return null;

  const entries = await Entry.find({ raceId: race._id }).populate('horseId').lean() as any[];
  const bestWork = await getBestWorkout(entries);

  const validaNum = raceNum >= Math.max(1, races.length - 5)
    ? raceNum - Math.max(1, races.length - 5) + 1
    : null;
  const validaTag = validaNum ? ` (Válida ${validaNum})` : '';

  if (!bestWork) {
    return {
      content: `No tengo trabajos recientes registrados para la C${raceNum}${validaTag} de ${trackName}, socio.${DISCLAIMER}`,
      raceNumber: raceNum,
      action: 'analysis_1race',
    };
  }

  const lines = [
    `🏇 **Mejor trabajo C${raceNum}${validaTag} ${trackName}**`,
    `↳ **${bestWork.horse}** — ${bestWork.workout.workoutType} ${bestWork.workout.distance}m | ${bestWork.workout.splits} | hace ${bestWork.days}d`,
    DISCLAIMER,
  ];

  return { content: lines.join('\n'), raceNumber: raceNum, action: 'analysis_1race' };
}

async function buildRaceProgram(races: any[], raceNum: number, trackName: string): Promise<DirectResponse | null> {
  const race = races.find(r => r.raceNumber === raceNum);
  if (!race) return null;

  const entries = await Entry.find({ raceId: race._id }).populate('horseId').sort({ dorsalNumber: 1 }).lean() as any[];
  if (!entries.length) return { content: `No hay inscritos cargados para la C${raceNum} de ${trackName} aún.`, raceNumber: raceNum, action: 'free' };

  let lines = [`🏇 **C${raceNum} ${trackName}** | ${race.distance ?? ''}m\n`];
  for (const e of entries) {
    const horse = e.horseId?.name ?? e.horseName ?? '?';
    const jockey = e.jockeyId?.name ?? e.jockeyName ?? '?';
    lines.push(`#${e.dorsalNumber} ${horse} | J: ${jockey}`);
  }

  return { content: lines.join('\n'), raceNumber: raceNum, action: 'free' };
}

async function buildFullProgram(races: any[], trackName: string): Promise<DirectResponse> {
  let lines = [`🏇 **Programa ${trackName}** — ${races.length} carreras\n`];
  const validasStart = Math.max(1, races.length - 5);

  for (const race of races) {
    const validaNum = race.raceNumber >= validasStart ? race.raceNumber - validasStart + 1 : null;
    const tag = validaNum ? ` [V${validaNum}]` : '';
    const entries = await Entry.find({ raceId: race._id }).countDocuments();
    lines.push(`C${race.raceNumber}${tag} | ${race.distance ?? '?'}m | ${entries} inscritos`);
  }

  return { content: lines.join('\n'), action: 'free' };
}
