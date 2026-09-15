/**
 * GET /api/revista/[meetingId]/picks
 *
 * Returns a randomly selected tipster's picks for a given meeting,
 * organised by raceId. Used by the GacetaPrintTemplate to populate
 * the "Favoritos" block at the bottom of each race section.
 *
 * The tipster is chosen uniformly at random from every handicapper
 * who has at least one published forecast in this meeting — even if
 * they only covered a single race.
 */

import { NextRequest, NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import Forecast from '@/models/Forecast';
import HandicapperProfile from '@/models/HandicapperProfile';
import ExpertSource from '@/models/ExpertSource';
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const { meetingId } = await params;

  try {
    await connectMongo();

    const forecasts = await Forecast.find({
      meetingId: new Types.ObjectId(meetingId),
      isPublished: true,
    })
      .select('handicapperId raceId marks source')
      .lean() as any[];

    if (!forecasts.length) {
      return NextResponse.json({ tipster: null, picksByRace: {} });
    }

    // All unique handicapper IDs who participated in this meeting
    const handicapperIds = [...new Set(forecasts.map((f: any) => f.handicapperId.toString()))];

    // Pick one at random — no weighting by coverage
    const chosenId = handicapperIds[Math.floor(Math.random() * handicapperIds.length)];

    const profile = await HandicapperProfile.findById(chosenId)
      .select('pseudonym expertSourceId')
      .populate({ path: 'expertSourceId', model: ExpertSource, select: 'youtubeChannelUrl' })
      .lean() as any;

    // Organise chosen tipster's picks by raceId
    const picksByRace: Record<string, { marks: { preferenceOrder: number; horseName: string; dorsalNumber: number | null; label: string | null }[]; hasAiSource: boolean }> = {};

    for (const f of forecasts) {
      if (f.handicapperId.toString() !== chosenId) continue;
      const rid = f.raceId.toString();
      picksByRace[rid] = {
        marks: (f.marks as any[]).map(m => ({
          preferenceOrder: m.preferenceOrder,
          horseName: m.horseName,
          dorsalNumber: m.dorsalNumber ?? null,
          label: m.label ?? null,
        })),
        hasAiSource: f.source !== 'manual',
      };
    }

    return NextResponse.json({
      tipster: {
        id: chosenId,
        name: profile?.pseudonym ?? 'Experto',
        youtubeUrl: (profile?.expertSourceId as any)?.youtubeChannelUrl ?? null,
      },
      picksByRace,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
