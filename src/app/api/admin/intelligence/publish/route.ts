/**
 * POST /api/admin/intelligence/publish
 *
 * Saves approved ExpertForecasts to DB.
 * Creates ExpertSource (ghost) if not exists.
 * Prevents duplicate ingestion via contentHash.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import ExpertSource from '@/models/ExpertSource';
import ExpertForecast from '@/models/ExpertForecast';
import HandicapperProfile from '@/models/HandicapperProfile';
import Forecast from '@/models/Forecast';
import Race from '@/models/Race';
import { Types } from 'mongoose';

interface PublishMark {
  preferenceOrder: number;
  hasExplicitOrder?: boolean;
  rawName: string;
  rawLabel?: string;
  resolvedHorseName?: string;
  resolvedEntryId?: string;
  dorsalNumber?: number;
  label: string | null;
  matchConfidence: number;
}

interface PublishForecast {
  raceNumber: number;
  raceId?: string;
  marks: PublishMark[];
}

interface PublishBody {
  expertName: string;
  platform: string;
  handle?: string;
  link?: string;
  isClaimable?: boolean;
  meetingId: string;
  sourceType: string;
  sourceUrl?: string;
  rawContent?: string;
  contentHash: string;
  forecasts: PublishForecast[];
}

export async function POST(req: NextRequest) {
  const secure = req.nextUrl.protocol === 'https:';
  const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
  const roles: string[] = (token?.roles as string[]) ?? [];
  if (!token || !roles.some(r => ['admin', 'staff'].includes(r))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const body: PublishBody = await req.json().catch(() => null);
  if (!body?.meetingId || !body?.contentHash || !body?.forecasts?.length) {
    return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
  }

  await dbConnect();

  // ── 1. Deduplication check ────────────────────────────────────────────────
  const existing = await ExpertForecast.findOne({ contentHash: body.contentHash }).lean();
  if (existing) {
    return NextResponse.json({ error: 'Este contenido ya fue ingresado anteriormente.' }, { status: 409 });
  }

  // ── 2. Upsert ExpertSource (ghost profile) ────────────────────────────────
  const platform = body.platform || 'Otro';
  const isClaimable = platform !== 'Revista';

  let expertSource = await ExpertSource.findOne({
    name: body.expertName.trim(),
    platform,
  });

  if (!expertSource) {
    expertSource = await ExpertSource.create({
      name: body.expertName.trim(),
      platform,
      handle: body.handle ?? undefined,
      link: body.link ?? undefined,
      isVerified: false,
      isClaimable,
      isGhost: true,
    });
  }

  // ── 3. Upsert ghost HandicapperProfile linked to ExpertSource ─────────────
  let ghostProfile = await HandicapperProfile.findOne({ expertSourceId: expertSource._id });
  if (!ghostProfile) {
    ghostProfile = await HandicapperProfile.create({
      pseudonym: body.expertName.trim(),
      isGhost: true,
      isActive: true,
      isPublic: true,
      expertSourceId: expertSource._id,
    });
  }

  // ── 4. Save each forecast ─────────────────────────────────────────────────
  const meetingObjId = new Types.ObjectId(body.meetingId);
  const reviewerId = new Types.ObjectId(token.userId as string);
  const saved: string[] = [];
  const errors: string[] = [];

  for (const fc of body.forecasts) {
    try {
      let raceObjId: Types.ObjectId;
      if (fc.raceId) {
        raceObjId = new Types.ObjectId(fc.raceId);
      } else {
        const race = await Race.findOne({ meetingId: meetingObjId, raceNumber: fc.raceNumber }).lean();
        if (!race) {
          errors.push(`Carrera ${fc.raceNumber}: no encontrada en DB.`);
          continue;
        }
        raceObjId = (race as any)._id;
      }

      const VALID_LABELS = ['Línea', 'Casi Fijo', 'Súper Especial', 'Buen Dividendo', 'Batacazo'];
      const expertMarks = fc.marks.slice(0, 5).map(m => ({
        preferenceOrder: m.preferenceOrder,
        hasExplicitOrder: m.hasExplicitOrder ?? false,
        rawName: m.rawName,
        rawLabel: m.rawLabel ?? undefined,
        resolvedHorseName: m.resolvedHorseName ?? undefined,
        resolvedEntryId: m.resolvedEntryId ? new Types.ObjectId(m.resolvedEntryId) : undefined,
        dorsalNumber: m.dorsalNumber ?? undefined,
        label: (m.label && VALID_LABELS.includes(m.label)) ? m.label : 'Casi Fijo',
        matchConfidence: m.matchConfidence ?? 1.0,
      }));

      // Save ExpertForecast for audit/history
      const doc = await ExpertForecast.create({
        expertSourceId: expertSource._id,
        meetingId: meetingObjId,
        raceId: raceObjId,
        raceNumber: fc.raceNumber,
        marks: expertMarks,
        sourceUrl: body.sourceUrl ?? undefined,
        sourceType: body.sourceType || 'social_text',
        rawContent: body.rawContent ?? undefined,
        contentHash: body.contentHash,
        status: 'published',
        publishedAt: new Date(),
        reviewedBy: reviewerId,
      });

      // Also upsert a real Forecast so it appears in /pronosticos
      const forecastMarks = fc.marks.slice(0, 5).map(m => ({
        preferenceOrder: m.preferenceOrder,
        horseName: m.resolvedHorseName ?? m.rawName,
        dorsalNumber: m.dorsalNumber ?? undefined,
        label: (m.label as any) || '',
        note: '',
      }));

      await Forecast.findOneAndUpdate(
        { handicapperId: ghostProfile._id, raceId: raceObjId },
        {
          $set: {
            meetingId: meetingObjId,
            marks: forecastMarks,
            isVip: false,
            isPublished: true,
            publishedAt: new Date(),
            source: body.sourceType || 'social_text',
            sourceRef: body.sourceUrl ?? '',
          },
        },
        { upsert: true, new: true }
      );

      saved.push(doc._id.toString());
    } catch (e: any) {
      errors.push(`Carrera ${fc.raceNumber}: ${e.message}`);
    }
  }

  // ── 5. Update expert stats ────────────────────────────────────────────────
  await ExpertSource.findByIdAndUpdate(expertSource._id, {
    $inc: { totalForecasts: saved.length },
  });

  return NextResponse.json({
    success: saved.length > 0,
    savedCount: saved.length,
    expertSourceId: expertSource._id.toString(),
    errors,
  });
}
