/**
 * POST /api/handicapper/forecast
 * Create or update a forecast for a race.
 * Requires role: handicapper | admin
 *
 * GET /api/handicapper/forecast?meetingId=
 * List own forecasts for a meeting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Forecast from '@/models/Forecast';
import HandicapperProfile from '@/models/HandicapperProfile';
import { notifyFollowers } from '@/services/followService';
import { Types } from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const roles: string[] = (session.user as any).roles ?? [];
    if (!roles.some(r => ['handicapper', 'admin'].includes(r))) {
      return NextResponse.json({ error: 'Acceso denegado. Se requiere rol handicapper.' }, { status: 403 });
    }

    await dbConnect();

    let profile = await HandicapperProfile.findOne({ userId: new Types.ObjectId(session.user.id) });
    if (!profile) {
      if (!roles.some(r => ['admin', 'staff'].includes(r))) {
        return NextResponse.json({ error: 'Perfil de handicapper no encontrado. Contacta al administrador.' }, { status: 404 });
      }
      // Auto-create profile for admin/staff
      const name = (session.user as any).name ?? (session.user as any).email ?? 'Admin';
      profile = await HandicapperProfile.create({
        userId: new Types.ObjectId(session.user.id),
        pseudonym: name,
        isActive: true,
        isPublic: true,
      });
    }

    const body = await req.json();
    const { meetingId, raceId, marks, isVip, source, sourceRef, publish } = body;

    if (!meetingId || !raceId || !marks?.length) {
      return NextResponse.json({ error: 'meetingId, raceId y al menos una marca son requeridos.' }, { status: 400 });
    }
    if (marks.length > 5) {
      return NextResponse.json({ error: 'Máximo 5 marcas por pronóstico.' }, { status: 400 });
    }

    const isUpdate = !!(await Forecast.findOne({ handicapperId: profile._id, raceId: new Types.ObjectId(raceId) }));

    const forecast = await Forecast.findOneAndUpdate(
      { handicapperId: profile._id, raceId: new Types.ObjectId(raceId) },
      {
        $set: {
          meetingId: new Types.ObjectId(meetingId),
          marks,
          isVip: !!isVip,
          source: source ?? 'manual',
          sourceRef: sourceRef ?? '',
          ...(publish ? { isPublished: true, publishedAt: new Date() } : {}),
        },
      },
      { upsert: true, new: true }
    );

    // Fan-out notifications to followers if publishing
    let notified = 0;
    if (publish) {
      const race = await (await import('@/models/Race')).default.findById(raceId).lean();
      const meeting = await (await import('@/models/Meeting')).default.findById(meetingId).lean();
      if (race && meeting) {
        notified = await notifyFollowers(
          profile._id.toString(),
          (meeting as any).meetingNumber,
          (race as any).raceNumber,
          isUpdate,
        );
      }
    }

    return NextResponse.json({
      success: true,
      forecastId: forecast._id.toString(),
      isUpdate,
      notified,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const roles: string[] = (session.user as any).roles ?? [];
    if (!roles.some(r => ['handicapper', 'admin'].includes(r))) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    await dbConnect();
    const profile = await HandicapperProfile.findOne({ userId: new Types.ObjectId(session.user.id) });
    if (!profile) return NextResponse.json({ forecasts: [] });

    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');

    const query: Record<string, unknown> = { handicapperId: profile._id };
    if (meetingId) query.meetingId = new Types.ObjectId(meetingId);

    const forecasts = await Forecast.find(query)
      .populate('raceId', 'raceNumber distance scheduledTime')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ forecasts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
