/**
 * Lógica compartida del endpoint de programa público.
 * Usada por:
 *   GET /api/programa/[meetingId]   — ruta original (DesafioHipico frontend)
 *   GET /api/v1/programa/[meetingId] — contrato estable para consumidores externos
 *                                      (Taquillero, futuros integradores)
 *
 * NUNCA cambiar el shape del objeto retornado sin versionar primero.
 */

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import Race from '@/models/Race';
import Entry from '@/models/Entry';
import Forecast from '@/models/Forecast';
import '@/models/Track';
import '@/models/Horse';
import '@/models/Person';
import '@/models/HandicapperProfile';
import { Types } from 'mongoose';

export async function getProgramaResponse(meetingId: string) {
  await dbConnect();

  const meeting = await Meeting.findById(meetingId)
    .populate('trackId', 'name location')
    .lean();
  if (!meeting) return NextResponse.json({ error: 'Reunión no encontrada' }, { status: 404 });

  const races = await Race.find({ meetingId: new Types.ObjectId(meetingId) })
    .sort({ raceNumber: 1 })
    .lean();

  const racesWithEntries = await Promise.all(
    races.map(async (race) => {
      const entries = await Entry.find({ raceId: race._id })
        .sort({ dorsalNumber: 1 })
        .populate('horseId', 'name')
        .populate('jockeyId', 'name')
        .populate('trainerId', 'name')
        .lean();

      // Conteo de pronósticos publicados (no expone el contenido)
      const forecastCount = await Forecast.countDocuments({
        meetingId: new Types.ObjectId(meetingId),
        raceId: race._id,
        isPublished: true,
      });

      // Preview: hasta 2 pseudónimos de handicappers (sin marcas) para el CTA
      const forecastPreview = await Forecast.find({
        meetingId: new Types.ObjectId(meetingId),
        raceId: race._id,
        isPublished: true,
      })
        .populate('handicapperId', 'pseudonym')
        .limit(2)
        .lean();

      return {
        raceId: race._id.toString(),
        raceNumber: (race as any).raceNumber,
        annualRaceNumber: (race as any).annualRaceNumber,
        distance: (race as any).distance,
        scheduledTime: (race as any).scheduledTime ?? '',
        conditions: (race as any).conditions ?? '',
        prizePool: (race as any).prizePool ?? { bs: 0, usd: 0 },
        games: (race as any).games ?? [],
        entries: entries.map((e: any) => ({
          dorsalNumber: e.dorsalNumber,
          postPosition: e.postPosition,
          weight: e.weight,
          weightRaw: e.weightRaw ?? '',
          medication: e.medication ?? null,
          implements: e.implements ?? null,
          status: e.status,
          horseName: e.horseId?.name ?? '—',
          jockeyName: e.jockeyId?.name ?? '—',
          trainerName: e.trainerId?.name ?? '—',
        })),
        forecastCount,
        forecastPreview: forecastPreview.map((f: any) => ({
          pseudonym: f.handicapperId?.pseudonym ?? 'Experto',
        })),
      };
    })
  );

  const track = (meeting as any).trackId as any;
  const isValencia = track?.name?.toLowerCase().includes('valencia');

  return NextResponse.json({
    meeting: {
      id: meetingId,
      meetingNumber: (meeting as any).meetingNumber,
      date: (meeting as any).date,
      trackName: track?.name ?? 'Hipódromo',
      trackLocation: track?.location ?? '',
      trackAbbr: isValencia ? 'VLC' : 'LRC',
      isValencia,
    },
    races: racesWithEntries,
  });
}
