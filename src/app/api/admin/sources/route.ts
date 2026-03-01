/**
 * GET /api/admin/sources
 *
 * Returns all ExpertSources with:
 * - totalForecasts count
 * - lastPublishedAt (most recent ExpertForecast)
 * - hasForecastForMeeting (if meetingId query param provided)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import ExpertSource from '@/models/ExpertSource';
import ExpertForecast from '@/models/ExpertForecast';
import HandicapperProfile from '@/models/HandicapperProfile';
import Forecast from '@/models/Forecast';
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secure = req.nextUrl.protocol === 'https:';
  const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
  const roles: string[] = (token?.roles as string[]) ?? [];
  if (!token || !roles.some(r => ['admin', 'staff'].includes(r))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const meetingId = searchParams.get('meetingId');

  await dbConnect();

  const sources = await ExpertSource.find({}).sort({ name: 1 }).lean();

  // For each source get last forecast date and optionally check current meeting
  const result = await Promise.all(
    sources.map(async (s: any) => {
      const lastForecast = await ExpertForecast.findOne({ expertSourceId: s._id })
        .sort({ publishedAt: -1 })
        .select('publishedAt meetingId raceNumber')
        .lean() as any;

      let hasForecastForMeeting = false;
      let forecastCountForMeeting = 0;
      if (meetingId) {
        const meetingObjId = new Types.ObjectId(meetingId);
        // Primary: count via ExpertForecast
        forecastCountForMeeting = await ExpertForecast.countDocuments({
          expertSourceId: s._id,
          meetingId: meetingObjId,
          status: 'published',
        });
        // Fallback: count via ghost HandicapperProfile → Forecast (covers re-published without ExpertForecast)
        if (forecastCountForMeeting === 0) {
          const ghostProfile = await HandicapperProfile.findOne({ expertSourceId: s._id }).select('_id').lean();
          if (ghostProfile) {
            forecastCountForMeeting = await Forecast.countDocuments({
              handicapperId: ghostProfile._id,
              meetingId: meetingObjId,
              isPublished: true,
            });
          }
        }
        hasForecastForMeeting = forecastCountForMeeting > 0;
      }

      return {
        _id: s._id.toString(),
        name: s.name,
        platform: s.platform,
        handle: s.handle ?? null,
        link: s.link ?? null,
        isVerified: s.isVerified,
        isGhost: s.isGhost,
        totalForecasts: s.totalForecasts,
        lastPublishedAt: lastForecast?.publishedAt ?? null,
        hasForecastForMeeting,
        forecastCountForMeeting,
      };
    })
  );

  return NextResponse.json({ sources: result });
}
