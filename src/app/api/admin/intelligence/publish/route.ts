/**
 * POST /api/admin/intelligence/publish
 *
 * Saves approved ExpertForecasts to DB.
 * Creates ExpertSource (ghost) if not exists.
 * Prevents duplicate ingestion via contentHash.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

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
  try {
  const secure = req.nextUrl.protocol === 'https:';
  const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
  const roles: string[] = (token?.roles as string[]) ?? [];
  if (!token || !roles.some(r => ['admin', 'staff'].includes(r))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const body: PublishBody = await req.json().catch(() => null);
  if (!body?.meetingId || !body?.contentHash || !body?.forecasts?.length) {
    return NextResponse.json({ error: `Datos incompletos. meetingId=${body?.meetingId} hash=${body?.contentHash} forecasts=${body?.forecasts?.length}` }, { status: 400 });
  }

  await dbConnect();

  // ── 1. Deduplication check (by source+meeting, not by hash) ───────────────
  // Hash-based dedup is done in /process; here we allow re-publish to update.

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
  let ghostProfile = await HandicapperProfile.findOneAndUpdate(
    { expertSourceId: expertSource._id },
    { $setOnInsert: {
      pseudonym: body.expertName.trim(),
      isGhost: true,
      isActive: true,
      isPublic: true,
      expertSourceId: expertSource._id,
    }},
    { upsert: true, new: true }
  );
  if (!ghostProfile) throw new Error('No se pudo crear el perfil ghost.');

  // ── 4. Save each forecast (parallel) ─────────────────────────────────────
  const meetingObjId = new Types.ObjectId(body.meetingId);
  const reviewerRaw = (token.userId ?? token.sub ?? '') as string;
  const reviewerId = Types.ObjectId.isValid(reviewerRaw) ? new Types.ObjectId(reviewerRaw) : new Types.ObjectId();
  const VALID_LABELS = ['Línea', 'Casi Fijo', 'Súper Especial', 'Buen Dividendo', 'Batacazo'];

  // Pre-fetch all races for this meeting in one query
  const allRaces = await Race.find({ meetingId: meetingObjId }, { raceNumber: 1 }).lean();
  const raceMap = new Map<number, Types.ObjectId>(
    allRaces.map((r: any) => [r.raceNumber as number, r._id as Types.ObjectId])
  );

  const results = await Promise.all(body.forecasts.map(async (fc) => {
    try {
      const raceObjId: Types.ObjectId = fc.raceId
        ? new Types.ObjectId(fc.raceId)
        : raceMap.get(fc.raceNumber) ?? (() => { throw new Error(`Carrera ${fc.raceNumber}: no encontrada en DB.`); })();

      const expertMarks = fc.marks.slice(0, 5).map(m => ({
        preferenceOrder: m.preferenceOrder,
        rawName: m.rawName ?? undefined,
        rawLabel: m.rawLabel ?? undefined,
        resolvedHorseName: m.resolvedHorseName ?? undefined,
        resolvedEntryId: m.resolvedEntryId ? new Types.ObjectId(m.resolvedEntryId) : undefined,
        dorsalNumber: m.dorsalNumber ?? undefined,
        label: (m.label && VALID_LABELS.includes(m.label)) ? m.label : undefined,
        matchConfidence: m.matchConfidence ?? 1.0,
      }));

      const forecastMarks = fc.marks.slice(0, 5)
        .map(m => {
          const horseName = (m.resolvedHorseName && m.resolvedHorseName.trim())
            ? m.resolvedHorseName.trim()
            : ((m as any).rawName && (m as any).rawName.trim())
              ? (m as any).rawName.trim()
              : m.dorsalNumber ? `Dorsal ${m.dorsalNumber}` : null;
          return {
            preferenceOrder: m.preferenceOrder,
            horseName,
            dorsalNumber: m.dorsalNumber ?? undefined,
            label: (VALID_LABELS.includes(m.label as any) ? m.label : undefined) as any,
            note: '',
          };
        })
        .filter(m => m.horseName);

      if (forecastMarks.length === 0) {
        return { ok: false, label: `C${fc.raceNumber}`, error: `Carrera ${fc.raceNumber}: no hay marcas identificables.` };
      }

      // Both upserts in parallel
      await Promise.all([
        ExpertForecast.findOneAndUpdate(
          { expertSourceId: expertSource._id, meetingId: meetingObjId, raceNumber: fc.raceNumber },
          { $set: {
            raceId: raceObjId, marks: expertMarks,
            sourceUrl: body.sourceUrl ?? undefined,
            sourceType: body.sourceType || 'social_text',
            rawContent: body.rawContent ?? undefined,
            contentHash: body.contentHash,
            status: 'published', publishedAt: new Date(), reviewedBy: reviewerId,
          }},
          { upsert: true, new: true }
        ),
        Forecast.findOneAndUpdate(
          { handicapperId: ghostProfile._id, raceId: raceObjId },
          { $set: {
            meetingId: meetingObjId, marks: forecastMarks,
            isVip: false, isPublished: true, publishedAt: new Date(),
            source: body.sourceType || 'social_text',
            sourceRef: body.sourceUrl ?? '',
          }},
          { upsert: true, new: true }
        ),
      ]);

      return { ok: true, label: `C${fc.raceNumber}` };
    } catch (e: any) {
      return { ok: false, label: `C${fc.raceNumber}`, error: e.message };
    }
  }));

  const saved = results.filter(r => r.ok).map(r => r.label);
  const errors = results.filter(r => !r.ok).map(r => r.error!);

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
  } catch (err: any) {
    console.error('[intelligence/publish] ERROR:', err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? 'Error interno del servidor' }, { status: 500 });
  }
}
