/**
 * DELETE /api/admin/intelligence/forecast
 * Body: { handicapperId: string, raceId: string }
 * Deletes the Forecast and ExpertForecast for a given handicapper+race.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import Forecast from '@/models/Forecast';
import ExpertForecast from '@/models/ExpertForecast';
import HandicapperProfile from '@/models/HandicapperProfile';
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  try {
    const secure = req.nextUrl.protocol === 'https:';
    const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
    const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
    const roles: string[] = (token?.roles as string[]) ?? [];
    if (!token || !roles.some(r => ['admin', 'staff'].includes(r))) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const { handicapperId, raceId } = body ?? {};
    if (!handicapperId || !raceId) {
      return NextResponse.json({ error: 'handicapperId y raceId requeridos.' }, { status: 400 });
    }

    await dbConnect();

    // Delete from Forecast (visible in /pronosticos)
    const delForecast = await Forecast.deleteOne({
      handicapperId: new Types.ObjectId(handicapperId),
      raceId: new Types.ObjectId(raceId),
    });

    // Also delete from ExpertForecast (audit trail)
    const profile = await HandicapperProfile.findById(handicapperId).lean();
    if (profile && (profile as any).expertSourceId) {
      await ExpertForecast.deleteOne({
        expertSourceId: (profile as any).expertSourceId,
        raceId: new Types.ObjectId(raceId),
      });
    }

    return NextResponse.json({ ok: true, deleted: delForecast.deletedCount });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Error interno' }, { status: 500 });
  }
}
