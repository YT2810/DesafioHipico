import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectMongo from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import WorkoutEntry from '@/models/WorkoutEntry';
import Forecast from '@/models/Forecast';
import HandicapperProfile from '@/models/HandicapperProfile';
import Race from '@/models/Race';
import '@/models/Track';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    await connectMongo();
    const now = new Date();
    const future = new Date(now);
    future.setDate(future.getDate() + 14);
    const pastFrom = new Date(now);
    pastFrom.setDate(pastFrom.getDate() - 7);

    // 1. Próximas reuniones
    const upcomingMeetings = await Meeting.find({ date: { $gte: now, $lte: future } })
      .sort({ date: 1 }).limit(4).populate('trackId', 'name').lean() as any[];

    // 2. Última reunión pasada (resultados)
    const lastMeeting = await Meeting.findOne({ date: { $lt: now } })
      .sort({ date: -1 }).populate('trackId', 'name').lean() as any;

    // 3. Traqueos recientes (últimos 5 días, top 20 por splits)
    const recentWorkouts = await WorkoutEntry.find({ workoutDate: { $gte: pastFrom } })
      .sort({ workoutDate: -1 }).limit(30)
      .populate('trackId', 'name').lean() as any[];

    // 4. Pronósticos publicados para próximas reuniones
    const upcomingMeetingIds = upcomingMeetings.map(m => m._id);
    const forecasts = upcomingMeetingIds.length > 0
      ? await Forecast.find({ meetingId: { $in: upcomingMeetingIds }, isPublished: true })
          .populate({ path: 'handicapperId', model: HandicapperProfile, select: 'pseudonym' })
          .populate({ path: 'raceId', model: Race, select: 'raceNumber distance' })
          .lean() as any[]
      : [];

    // Build snapshot text for the system prompt
    const lines: string[] = [];

    if (upcomingMeetings.length > 0) {
      lines.push('=== PRÓXIMAS REUNIONES ===');
      for (const m of upcomingMeetings) {
        const d = new Date(m.date);
        const track = m.trackId?.name ?? 'La Rinconada';
        lines.push(`• Reunión ${m.meetingNumber} | ${track} | ${d.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}`);
      }
    }

    if (lastMeeting) {
      const d = new Date(lastMeeting.date);
      lines.push(`\n=== ÚLTIMA REUNIÓN (${lastMeeting.trackId?.name ?? 'La Rinconada'} · ${d.toLocaleDateString('es-VE', { day: 'numeric', month: 'long', timeZone: 'UTC' })}) ===`);
      lines.push(`Reunión N° ${lastMeeting.meetingNumber}`);
    }

    if (recentWorkouts.length > 0) {
      lines.push('\n=== TRAQUEOS RECIENTES ===');
      for (const w of recentWorkouts.slice(0, 20)) {
        const track = w.trackId?.name ?? '';
        const date = new Date(w.workoutDate).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', timeZone: 'UTC' });
        lines.push(`• ${w.horseName} | ${w.workoutType} ${w.distance}m | splits: ${w.splits || 'N/A'} | ${date}${w.trainerName ? ` | Ent: ${w.trainerName}` : ''}${track ? ` | ${track}` : ''}`);
      }
    }

    if (forecasts.length > 0) {
      lines.push('\n=== PRONÓSTICOS PUBLICADOS (próximas reuniones) ===');
      for (const f of forecasts) {
        const handicapper = (f.handicapperId as any)?.pseudonym ?? 'Desafío Hípico';
        const race = (f.raceId as any);
        const raceLabel = race ? `Carrera ${race.raceNumber}${race.distance ? ` (${race.distance}m)` : ''}` : 'Carrera N/A';
        const marks = f.marks.map((m: any) => `${m.preferenceOrder}°${m.label ? ` [${m.label}]` : ''} ${m.horseName}${m.note ? ` — ${m.note}` : ''}`).join(', ');
        const vipFlag = f.isVip ? ' [VIP]' : f.isExclusive ? ' [EXCLUSIVO]' : '';
        lines.push(`• ${handicapper}${vipFlag} | ${raceLabel} | ${marks}`);
      }
    }

    return NextResponse.json({ snapshot: lines.join('\n'), meetingCount: upcomingMeetings.length });
  } catch (err) {
    console.error('[melli/snapshot]', err);
    return NextResponse.json({ snapshot: '', meetingCount: 0 });
  }
}
