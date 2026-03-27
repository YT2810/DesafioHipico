/**
 * GET /api/melli/context
 * Carga data estructurada de DB para el Melli.
 * NO llama OpenRouter — solo consulta MongoDB y devuelve texto listo para el system prompt.
 *
 * Query params (opcionales — si se omiten, devuelve resumen general):
 *   meetingId   — ID de reunión específica
 *   raceNumber  — número de carrera (requiere meetingId)
 *
 * Respuesta: { context: string, meetings: MeetingSummary[], hasRaceData: boolean }
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectMongo from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import Race from '@/models/Race';
import Entry from '@/models/Entry';
import Forecast from '@/models/Forecast';
import HandicapperProfile from '@/models/HandicapperProfile';
import WorkoutEntry from '@/models/WorkoutEntry';
import Person from '@/models/Person';
import Horse from '@/models/Horse';
import '@/models/Track';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const meetingId  = searchParams.get('meetingId');
  const validaRef  = searchParams.get('validaRef')  ? parseInt(searchParams.get('validaRef')!)  : null;
  let   raceNumber = searchParams.get('raceNumber') ? parseInt(searchParams.get('raceNumber')!) : null;

  try {
    await connectMongo();
    const now = new Date();
    const lines: string[] = [];

    // ── 1. Reuniones activas / próximas (TODOS los hipódromos) ──────────────────
    const future = new Date(now);
    future.setDate(future.getDate() + 10);
    const past = new Date(now);
    past.setDate(past.getDate() - 1);

    const activeMeetings = await Meeting.find({
      date: { $gte: past, $lte: future },
      status: { $ne: 'cancelled' },
    }).sort({ date: 1 }).populate('trackId', 'name').lean() as any[];

    if (activeMeetings.length === 0) {
      lines.push('SIN_REUNIONES_ACTIVAS: No hay reuniones programadas esta semana.');
    } else {
      lines.push('=== REUNIONES DISPONIBLES ===');
      for (const m of activeMeetings) {
        const d = new Date(m.date);
        const track = m.trackId?.name ?? 'Hipódromo';
        const fechaStr = d.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
        const raceCount = await Race.countDocuments({ meetingId: m._id });
        lines.push(`ID:${m._id} | ${track} | Reunión ${m.meetingNumber} | ${fechaStr} | ${raceCount} carreras | status:${m.status}`);
      }
    }

    // ── 2. Si hay meetingId específico: cargar carreras + inscriptos + pronósticos ──
    let targetMeeting: any = null;
    if (meetingId) {
      targetMeeting = activeMeetings.find(m => m._id.toString() === meetingId)
        ?? await Meeting.findById(meetingId).populate('trackId', 'name').lean();
    } else if (activeMeetings.length === 1) {
      // Si solo hay una reunión activa, la tomamos por defecto
      targetMeeting = activeMeetings[0];
    }

    if (targetMeeting) {
      const track = (targetMeeting as any).trackId?.name ?? 'Hipódromo';
      const races  = await Race.find({ meetingId: targetMeeting._id }).sort({ raceNumber: 1 }).lean();

      // Resolver "Nth válida" → número de carrera real
      // validasStart = primera carrera que forma parte del 5y6 (últimas 6 del programa)
      const maxRace = races.length > 0 ? Math.max(...races.map(r => r.raceNumber)) : 0;
      const validasStart = Math.max(1, maxRace - 5);
      if (validaRef && !raceNumber) {
        // validaRef=1 → primera válida = validasStart, validaRef=6 → última válida = maxRace
        const resolvedRace = validasStart + (validaRef - 1);
        if (resolvedRace <= maxRace) raceNumber = resolvedRace;
      }

      // Filtrar por carrera específica si se pidió
      const targetRaces = raceNumber
        ? races.filter(r => r.raceNumber === raceNumber)
        : races;

      if (targetRaces.length === 0) {
        lines.push(`\nSIN_DATOS_CARRERAS: No hay carreras cargadas para ${track} Reunión ${(targetMeeting as any).meetingNumber}`);
      } else {
        lines.push(`\n=== PROGRAMA: ${track} · Reunión ${(targetMeeting as any).meetingNumber} ===`);

        for (const race of targetRaces) {
          const esValida = race.raceNumber >= validasStart;
          const raceLabel = `C${race.raceNumber}${esValida ? ' [VÁLIDA 5y6]' : ' [no válida]'}`;
          lines.push(`\n${raceLabel} | ${race.distance}m | ${race.scheduledTime ?? ''} | ${race.conditions ?? ''}`);

          // Inscriptos con jinete+entrenador
          const entries = await Entry.find({ raceId: race._id, 'result.isScratched': { $ne: true } })
            .populate('horseId', 'name')
            .populate('jockeyId', 'firstName lastName')
            .populate('trainerId', 'firstName lastName')
            .sort({ dorsalNumber: 1 })
            .lean() as any[];

          for (const e of entries) {
            const horse   = e.horseId?.name ?? e.horseId?.toString() ?? '?';
            const jockey  = e.jockeyId  ? `${e.jockeyId.firstName ?? ''} ${e.jockeyId.lastName ?? ''}`.trim() : '?';
            const trainer = e.trainerId ? `${e.trainerId.firstName ?? ''} ${e.trainerId.lastName ?? ''}`.trim() : '?';
            const impl    = e.implements ? ` [${e.implements}]` : '';
            lines.push(`  #${e.dorsalNumber} ${horse} | J:${jockey} | E:${trainer}${impl}`);

            // Traqueo reciente del caballo (últimos 14 días, misma pista o cualquiera)
            const recentWorkout = await WorkoutEntry.findOne({
              horseName: { $regex: new RegExp(horse.split(' ')[0], 'i') },
              workoutDate: { $gte: new Date(now.getTime() - 14 * 24 * 3600 * 1000) },
            }).sort({ workoutDate: -1 }).lean() as any;

            if (recentWorkout) {
              const dDias = Math.floor((now.getTime() - new Date(recentWorkout.workoutDate).getTime()) / 86400000);
              lines.push(`    ↳ Trabajo: ${recentWorkout.workoutType} ${recentWorkout.distance}m | splits:${recentWorkout.splits || 'N/A'} | hace ${dDias}d${recentWorkout.daysRest ? ` | descanso:${recentWorkout.daysRest}d` : ''}`);
            }
          }

          // Pronósticos públicos para esta carrera (consenso)
          const forecasts = await Forecast.find({ raceId: race._id, isPublished: true, isVip: false })
            .populate({ path: 'handicapperId', model: HandicapperProfile, select: 'pseudonym' })
            .lean() as any[];

          if (forecasts.length > 0) {
            // Contar votos por caballo (1ª marca = fijo candidato)
            const voteMap: Record<string, { votes: number; primeraVeces: number; label?: string }> = {};
            for (const f of forecasts) {
              const sorted = [...f.marks].sort((a: any, b: any) => a.preferenceOrder - b.preferenceOrder);
              sorted.forEach((m: any, idx: number) => {
                if (!voteMap[m.horseName]) voteMap[m.horseName] = { votes: 0, primeraVeces: 0, label: m.label };
                voteMap[m.horseName].votes++;
                if (idx === 0) voteMap[m.horseName].primeraVeces++;
                if (m.label && ['Casi Fijo', 'Súper Especial', 'Batacazo'].includes(m.label)) {
                  voteMap[m.horseName].label = m.label;
                }
              });
            }
            const sorted = Object.entries(voteMap).sort((a, b) => b[1].primeraVeces - a[1].primeraVeces || b[1].votes - a[1].votes);
            const topPicks = sorted.slice(0, 4).map(([name, v]) => `${name}(${v.primeraVeces}P/${v.votes}T${v.label ? `/${v.label}` : ''})`).join(', ');
            lines.push(`  ► CONSENSO ${forecasts.length} hcp: ${topPicks}`);
          } else {
            lines.push(`  ► Sin pronósticos publicados aún`);
          }
        }
      }
    }

    // ── 3. Traqueos recientes (top 10) — solo cuando NO hay carrera específica en foco ──
    if (!raceNumber) {
      const recentWorkouts = await WorkoutEntry.find({
        workoutDate: { $gte: new Date(now.getTime() - 7 * 24 * 3600 * 1000) },
      }).sort({ workoutDate: -1 }).limit(10).populate('trackId', 'name').lean() as any[];

      if (recentWorkouts.length > 0) {
        lines.push('\n=== TRAQUEOS SEMANA (top 10) ===');
        for (const w of recentWorkouts) {
          const dDias = Math.floor((now.getTime() - new Date(w.workoutDate).getTime()) / 86400000);
          lines.push(`• ${w.horseName} | ${w.workoutType} ${w.distance}m | ${w.splits || 'N/A'} | hace ${dDias}d${w.trainerName ? ` | ${w.trainerName}` : ''}`);
        }
      }
    }

    return NextResponse.json({
      context: lines.join('\n'),
      meetings: activeMeetings.map((m: any) => ({
        id: m._id.toString(),
        meetingNumber: m.meetingNumber,
        trackName: m.trackId?.name ?? 'Hipódromo',
        date: m.date,
        status: m.status,
      })),
      hasRaceData: !!targetMeeting,
    });

  } catch (err) {
    console.error('[melli/context]', err);
    return NextResponse.json({ context: 'ERROR_CONTEXTO', meetings: [], hasRaceData: false });
  }
}
