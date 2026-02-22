/**
 * POST /api/admin/intelligence/process
 *
 * Accepts: { input: string, meetingId?: string }
 * input can be: YouTube URL, raw text, or base64 image (data:image/...)
 *
 * Returns: GeminiExtractionResult + resolved entries from DB for comparison table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import crypto from 'crypto';

import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import Race from '@/models/Race';
import Entry from '@/models/Entry';
import '@/models/Horse';
import ExpertForecast from '@/models/ExpertForecast';
import {
  processText,
  processImage,
  processYouTube,
  findBestMatch,
  RaceEntriesContext,
  RaceEntryItem,
} from '@/services/ai/geminiProcessor';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function isYouTubeUrl(s: string) {
  return /youtube\.com|youtu\.be/.test(s);
}

function isBase64Image(s: string) {
  return s.startsWith('data:image/');
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

  const body = await req.json().catch(() => null);
  if (!body?.input?.trim()) {
    return NextResponse.json({ error: 'Campo input requerido.' }, { status: 400 });
  }

  const { input, meetingId } = body as { input: string; meetingId?: string };

  await dbConnect();

  // ── 1. Load meeting + races + entries for context ──────────────────────────
  let meeting: any = null;
  let raceEntries: RaceEntriesContext[] = [];

  if (meetingId) {
    meeting = await Meeting.findById(meetingId).lean();
  }

  if (meeting) {
    const races = await Race.find({ meetingId: meeting._id }).sort({ raceNumber: 1 }).lean();
    for (const race of races) {
      const entries = await Entry.find({ raceId: race._id })
        .populate<{ horseId: { name: string } }>('horseId', 'name')
        .sort({ dorsalNumber: 1 })
        .lean();

      const items: RaceEntryItem[] = entries.map((e: any) => ({
        dorsal: e.dorsalNumber,
        horseName: e.horseId?.name ?? '',
      })).filter((e: RaceEntryItem) => e.horseName);

      if (items.length > 0) {
        raceEntries.push({ raceNumber: race.raceNumber, entries: items });
      }
    }
  }

  // ── 2. Detect input type and call Gemini ──────────────────────────────────
  let result;
  if (isYouTubeUrl(input)) {
    result = await processYouTube(input, raceEntries);
  } else if (isBase64Image(input)) {
    const [header, base64data] = input.split(',');
    const mimeMatch = header.match(/data:(image\/[a-z]+);base64/);
    const mimeType = mimeMatch?.[1] ?? 'image/jpeg';
    result = await processImage(base64data, mimeType, raceEntries);
  } else {
    result = await processText(input, raceEntries);
  }

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'No se detectaron pronósticos.' }, { status: 422 });
  }

  // ── 3. Auto-detect meeting if not provided ────────────────────────────────
  if (!meeting && result.meetingDate) {
    const d = new Date(result.meetingDate);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    meeting = await Meeting.findOne({ date: { $gte: start, $lte: end } }).lean();
  }
  if (!meeting && result.meetingNumber) {
    meeting = await Meeting.findOne({ meetingNumber: result.meetingNumber })
      .sort({ date: -1 }).lean();
  }

  // ── 4. Resolve horse names against DB entries ─────────────────────────────
  const resolvedForecasts = await Promise.all(
    result.forecasts.map(async (fc) => {
      const race = meeting
        ? await Race.findOne({ meetingId: meeting._id, raceNumber: fc.raceNumber }).lean()
        : null;

      let dbEntries: { dorsal: number; horseName: string; entryId: string }[] = [];
      if (race) {
        const entries = await Entry.find({ raceId: (race as any)._id })
          .populate<{ horseId: { name: string } }>('horseId', 'name')
          .sort({ dorsalNumber: 1 })
          .lean();
        dbEntries = entries.map((e: any) => ({
          dorsal: e.dorsalNumber,
          horseName: e.horseId?.name ?? '',
          entryId: e._id.toString(),
        })).filter(e => e.horseName);
      }

      const resolvedMarks = fc.marks.map(mark => {
        const match = findBestMatch(mark.rawName, dbEntries.map(e => ({ dorsal: e.dorsal, horseName: e.horseName })));
        return {
          ...mark,
          resolvedHorseName: match?.horseName ?? null,
          resolvedEntryId: match ? dbEntries[match.entryIdx]?.entryId : null,
          matchConfidence: match?.confidence ?? 0,
        };
      });

      return {
        raceNumber: fc.raceNumber,
        expertName: fc.expertName ?? null,
        raceId: race ? (race as any)._id.toString() : null,
        marks: resolvedMarks,
        dbEntries,
      };
    })
  );

  // ── 5. Compute content hash for deduplication ─────────────────────────────
  const contentHash = crypto
    .createHash('sha256')
    .update(input.slice(0, 2000))
    .digest('hex');

  const existing = await ExpertForecast.findOne({ contentHash }).lean();

  return NextResponse.json({
    success: true,
    inputType: result.inputType,
    meetingDate: result.meetingDate ?? null,
    meetingNumber: result.meetingNumber ?? null,
    meetingId: meeting ? (meeting as any)._id.toString() : null,
    meetingLabel: meeting
      ? `Reunión ${(meeting as any).meetingNumber} · ${new Date((meeting as any).date).toLocaleDateString('es-VE')}`
      : null,
    forecasts: resolvedForecasts,
    contentHash,
    alreadyIngested: !!existing,
    rawTranscript: result.rawTranscript ?? null,
  });
  } catch (err) {
    console.error('[intelligence/process]', err);
    const msg = err instanceof Error ? err.message : 'Error interno del servidor';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
