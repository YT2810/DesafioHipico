/**
 * GET /api/forecasts/preview?meetingId=
 * Public endpoint — returns all published forecasters (first race only)
 * for the home page preview. No auth required.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Forecast from '@/models/Forecast';
import Race from '@/models/Race';
import '@/models/HandicapperProfile';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');
    if (!meetingId) return NextResponse.json({ forecasts: [] });

    // Get first race of the meeting
    const firstRace = await Race.findOne({ meetingId }).sort({ raceNumber: 1 }).lean();
    if (!firstRace) return NextResponse.json({ forecasts: [] });

    const forecasts = await Forecast.find({
      meetingId,
      raceId: (firstRace as any)._id,
      isPublished: true,
    })
      .populate('handicapperId', 'pseudonym')
      .lean();

    const toTitle = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    const result = forecasts.map(f => ({
      pseudonym: (f.handicapperId as any)?.pseudonym ?? 'Experto',
      marks: (f.marks ?? []).slice(0, 3).map((m: any) => ({
        horseName: toTitle(m.horseName ?? ''),
        dorsalNumber: m.dorsalNumber,
        label: m.label,
      })),
    }));

    return NextResponse.json({ forecasts: result });
  } catch {
    return NextResponse.json({ forecasts: [] });
  }
}
