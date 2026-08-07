/**
 * POST /api/admin/intelligence/shadow
 * Shadow mode: extract from YouTube channel, compare vs DB. WRITES NOTHING TO DB.
 * Security: admin/staff only via JWT.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import Race from '@/models/Race';
import Entry from '@/models/Entry';
import Forecast from '@/models/Forecast';
import HandicapperProfile from '@/models/HandicapperProfile';
import '@/models/Horse';
import { callLLM, findBestMatch, RaceEntryItem } from '@/services/ai/geminiProcessor';

export const maxDuration = 90;
export const dynamic = 'force-dynamic';

// ── Master prompt with enrolled entries as context ────────────────────────────
function buildMasterPrompt(
  transcript: string,
  enrolledEntries: Array<{ raceNumber: number; entries: RaceEntryItem[] }>
): string {
  const entriesContext = enrolledEntries
    .map(r => `C${r.raceNumber}: ${r.entries.map(e => `${e.dorsal} ${e.horseName}`).join(', ')}`)
    .join('\n');

  return `Eres un extractor de pronósticos hípicos venezolanos. Puede haber UNO O VARIOS pronosticadores en el mismo programa.

INSCRITOS DE LA JORNADA (úsalos para corregir nombres mal pronunciados o transcritos):
${entriesContext}

REGLAS:
- Extrae SOLO caballos recomendados: "me gusta", "fijo", "línea", "lo acompaño", "mi selección", "trilogía"
- Excluye: "no me gusta", "descarto", "difícil", "rival", "enemigo"
- MÚLTIPLES pronosticadores: usa expertName con el alias mencionado. Si no se presenta, "Invitado 1", "Invitado 2"
- UN SOLO pronosticador: expertName puede ser null
- Corrige nombres con los inscritos: si dicen "Karibel" e inscrito es "Caribean Gold" → usa "Caribean Gold"
- Dorsales: "el tres" → dorsalNumber:3. Si no sabes con certeza, omítelo
- Emojis, @menciones, hashtags → ignorar

FORMATOS DE CARRERA:
- "C1","1C","1ra carrera","primera" → raceType:"carrera", raceNumber:1
- "1V","primera válida","1ra válida" → raceType:"valida", raceNumber:1 (hasta 6V)
- Bloque "VÁLIDAS","5y6" → raceType:"valida"

ETIQUETAS (rawLabel verbatim): Fijo, Línea, SF, SSF, Martillazo, Garrotazo, Encapillao, Casi Fijo

JSON PURO sin markdown:
{"forecasts":[{"expertName":null,"raceNumber":1,"raceType":"carrera","hasOrder":true,"marks":[{"preferenceOrder":1,"dorsalNumber":3,"rawName":"CARIBEAN GOLD","rawLabel":"Fijo"}]}]}

TRANSCRIPCIÓN:
${transcript.slice(0, 14000)}`;
}

interface ExtractedMark {
  preferenceOrder: number;
  rawName?: string;
  dorsalNumber?: number;
  rawLabel?: string;
}

interface ExtractedRace {
  expertName: string | null;
  raceNumber: number;
  raceType: 'carrera' | 'valida';
  hasOrder: boolean;
  marks: ExtractedMark[];
}

function parseLLMForecasts(raw: string): ExtractedRace[] {
  try {
    const cleaned = raw
      .replace(/^\s*```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    return (parsed.forecasts ?? [])
      .filter((f: any) => f.raceNumber > 0 && f.marks?.length > 0)
      .map((f: any) => ({
        expertName: f.expertName ?? null,
        raceNumber: Number(f.raceNumber),
        raceType: f.raceType === 'valida' ? 'valida' : 'carrera',
        hasOrder: f.hasOrder === true,
        marks: (f.marks ?? []).slice(0, 5).map((m: any, idx: number) => ({
          preferenceOrder: m.preferenceOrder ?? idx + 1,
          rawName: m.rawName ? String(m.rawName).trim().toUpperCase() : undefined,
          dorsalNumber: m.dorsalNumber ? Number(m.dorsalNumber) : undefined,
          rawLabel: m.rawLabel ?? undefined,
        })).filter((m: ExtractedMark) => m.rawName || m.dorsalNumber),
      }));
  } catch { return []; }
}

// ── Diff types and computation ────────────────────────────────────────────────
export type DiffStatus = 'match' | 'similar' | 'missing' | 'extra';

export interface DiffMark {
  preferenceOrder: number;
  horseName: string;
  dorsalNumber?: number;
  label?: string;
  rawLabel?: string;
  status: DiffStatus;
  matchedWith?: string;
  confidence: number;
}

export interface RaceDiff {
  raceNumber: number;
  raceId: string | null;
  dbMarks: DiffMark[];
  extractedMarks: DiffMark[];
  matchScore: number;
  hasDbData: boolean;
}

function normName(s: string): string {
  return s.toUpperCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function compareNames(a: string, b: string): number {
  const na = normName(a); const nb = normName(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const wa = new Set(na.split(' ').filter(w => w.length > 2));
  const wb = new Set(nb.split(' ').filter(w => w.length > 2));
  const overlap = [...wa].filter(w => wb.has(w)).length;
  if (overlap > 0) return 0.65 + (overlap / Math.max(wa.size, wb.size)) * 0.2;
  return 0;
}

function computeDiff(
  dbMarks: Array<{ preferenceOrder: number; horseName: string; dorsalNumber?: number; label?: string }>,
  extMarks: Array<{ preferenceOrder: number; horseName: string; dorsalNumber?: number; rawLabel?: string; confidence: number }>,
  raceNumber: number,
  raceId: string | null
): RaceDiff {
  const hasDbData = dbMarks.length > 0;
  if (!hasDbData) {
    return {
      raceNumber, raceId, dbMarks: [],
      extractedMarks: extMarks.map(m => ({ preferenceOrder: m.preferenceOrder, horseName: m.horseName, dorsalNumber: m.dorsalNumber, rawLabel: m.rawLabel, status: 'extra' as DiffStatus, confidence: m.confidence })),
      matchScore: 0, hasDbData: false,
    };
  }

  const usedDb = new Set<number>();
  const diffExt: DiffMark[] = [];

  for (const ext of extMarks) {
    let bestScore = 0; let bestIdx = -1; let bestName = '';
    for (let i = 0; i < dbMarks.length; i++) {
      if (usedDb.has(i)) continue;
      const sc = compareNames(ext.horseName, dbMarks[i].horseName);
      const dorsalBoost = (ext.dorsalNumber && dbMarks[i].dorsalNumber && ext.dorsalNumber === dbMarks[i].dorsalNumber) ? 0.95 : 0;
      const eff = Math.max(sc, dorsalBoost);
      if (eff > bestScore) { bestScore = eff; bestIdx = i; bestName = dbMarks[i].horseName; }
    }
    if (bestScore >= 0.9 && bestIdx >= 0) {
      usedDb.add(bestIdx);
      diffExt.push({ preferenceOrder: ext.preferenceOrder, horseName: ext.horseName, dorsalNumber: ext.dorsalNumber, rawLabel: ext.rawLabel, status: 'match', matchedWith: bestName, confidence: bestScore });
    } else if (bestScore >= 0.6 && bestIdx >= 0) {
      usedDb.add(bestIdx);
      diffExt.push({ preferenceOrder: ext.preferenceOrder, horseName: ext.horseName, dorsalNumber: ext.dorsalNumber, rawLabel: ext.rawLabel, status: 'similar', matchedWith: bestName, confidence: bestScore });
    } else {
      diffExt.push({ preferenceOrder: ext.preferenceOrder, horseName: ext.horseName, dorsalNumber: ext.dorsalNumber, rawLabel: ext.rawLabel, status: 'extra', confidence: bestScore });
    }
  }

  const diffDb: DiffMark[] = dbMarks.map((m, i) => ({
    preferenceOrder: m.preferenceOrder, horseName: m.horseName, dorsalNumber: m.dorsalNumber, label: m.label,
    status: usedDb.has(i) ? 'match' as DiffStatus : 'missing' as DiffStatus,
    confidence: usedDb.has(i) ? 1 : 0,
  }));

  const matchCount = diffExt.filter(m => m.status === 'match').length;
  const similarCount = diffExt.filter(m => m.status === 'similar').length;
  const matchScore = diffExt.length > 0
    ? Math.round(((matchCount + similarCount * 0.6) / diffExt.length) * 100)
    : 0;

  return { raceNumber, raceId, dbMarks: diffDb, extractedMarks: diffExt, matchScore, hasDbData: true };
}

async function assertAdminOrStaff(req: NextRequest): Promise<string[] | NextResponse> {
  const secure = req.nextUrl.protocol === 'https:';
  const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
  const roles: string[] = (token?.roles as string[]) ?? [];
  if (!token || !roles.some(r => ['admin', 'staff'].includes(r))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  return roles;
}

async function resolveChannelId(url: string): Promise<string | null> {
  // Direct channel ID
  const directMatch = url.match(/youtube\.com\/channel\/(UC[A-Za-z0-9_-]+)/);
  if (directMatch) return directMatch[1];

  // Extract handle from @handle, /c/, or /user/ URLs
  const handleMatch =
    url.match(/youtube\.com\/@([A-Za-z0-9_.-]+)/) ||
    url.match(/youtube\.com\/c\/([A-Za-z0-9_.-]+)/) ||
    url.match(/youtube\.com\/user\/([A-Za-z0-9_.-]+)/);
  if (!handleMatch) return null;

  const handle = handleMatch[1];
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('[shadow] YOUTUBE_API_KEY not set');
    return null;
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`
    );
    if (!res.ok) {
      console.error('[shadow] YouTube API error', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data?.items?.[0]?.id ?? null;
  } catch (e) {
    console.error('[shadow] resolveChannelId failed', e);
    return null;
  }
}

interface VideoItem {
  videoId: string;
  title: string;
  publishedAt: Date;
  videoUrl: string;
}

async function fetchRecentVideos(channelId: string, sinceDate: Date): Promise<VideoItem[]> {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    if (!res.ok) return [];
    const xml = await res.text();
    const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) ?? [];
    const videos: VideoItem[] = [];
    for (const entry of entries) {
      const vidId = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];
      const title = entry.match(/<title>(.*?)<\/title>/)?.[1];
      const pub = entry.match(/<published>(.*?)<\/published>/)?.[1];
      if (!vidId || !title || !pub) continue;
      const publishedAt = new Date(pub);
      if (publishedAt < sinceDate) continue;
      videos.push({
        videoId: vidId,
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
        publishedAt,
        videoUrl: `https://www.youtube.com/watch?v=${vidId}`,
      });
    }
    return videos;
  } catch { return []; }
}

async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'Accept-Language': 'es-VE,es;q=0.9', 'User-Agent': 'Mozilla/5.0' },
    });
    const html = await res.text();
    const captionMatch = html.match(/"captionTracks":\[.*?"baseUrl":"(.*?)"/);
    if (!captionMatch) return null;
    const captionUrl = captionMatch[1].replace(/\\u0026/g, '&');
    const captionRes = await fetch(captionUrl);
    const xml = await captionRes.text();
    const texts = xml.match(/<text[^>]*>(.*?)<\/text>/g) ?? [];
    const transcript = texts.map(t =>
      t.replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'")
    ).join(' ');
    return transcript.length > 100 ? transcript : null;
  } catch { return null; }
}

// ── Main POST handler ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const authResult = await assertAdminOrStaff(req);
    if (authResult instanceof NextResponse) return authResult;

    const body = await req.json().catch(() => null);
    if (!body?.meetingId) return NextResponse.json({ error: 'meetingId requerido.' }, { status: 400 });
    if (!body?.channelUrl?.trim()) return NextResponse.json({ error: 'channelUrl requerido.' }, { status: 400 });

    const { meetingId, channelUrl, expertSourceId } = body as {
      meetingId: string;
      channelUrl: string;
      expertSourceId?: string;
    };

    await dbConnect();

    const meeting = await Meeting.findById(meetingId).lean() as any;
    if (!meeting) return NextResponse.json({ error: 'Jornada no encontrada.' }, { status: 404 });

    const meetingDate = new Date(meeting.date);

    const races = await Race.find({ meetingId }).sort({ raceNumber: 1 }).lean() as any[];
    const totalRaces = races.length;
    const raceIdByNumber = new Map<number, string>(races.map((r: any) => [r.raceNumber, r._id.toString()]));

    const enrolledEntries: Array<{ raceNumber: number; entries: RaceEntryItem[] }> = [];
    for (const race of races) {
      const entries = await Entry.find({ raceId: race._id })
        .populate<{ horseId: { name: string } }>('horseId', 'name')
        .sort({ dorsalNumber: 1 }).lean() as any[];
      const items: RaceEntryItem[] = entries
        .map((e: any) => ({ dorsal: e.dorsalNumber, horseName: e.horseId?.name ?? '' }))
        .filter((e: RaceEntryItem) => e.horseName);
      if (items.length > 0) enrolledEntries.push({ raceNumber: race.raceNumber, entries: items });
    }

    const dbByRace = new Map<number, Array<{ preferenceOrder: number; horseName: string; dorsalNumber?: number; label?: string }>>();
    if (expertSourceId) {
      const profile = await HandicapperProfile.findOne({ expertSourceId }).lean() as any;
      if (profile) {
        const dbFcs = await Forecast.find({ meetingId, handicapperId: profile._id, isPublished: true }).lean() as any[];
        for (const f of dbFcs) {
          const raceNum = races.find((r: any) => r._id.toString() === f.raceId.toString())?.raceNumber;
          if (raceNum) {
            dbByRace.set(raceNum, (f.marks ?? []).map((m: any) => ({
              preferenceOrder: m.preferenceOrder,
              horseName: m.horseName,
              dorsalNumber: m.dorsalNumber,
              label: m.label,
            })));
          }
        }
      }
    }

    const channelId = await resolveChannelId(channelUrl);
    if (!channelId) {
      return NextResponse.json({ error: 'No se pudo resolver el canal. Usa formato youtube.com/@handle o youtube.com/channel/ID' }, { status: 422 });
    }

    const sinceDate = new Date(meetingDate);
    sinceDate.setDate(sinceDate.getDate() - 5);
    sinceDate.setHours(0, 0, 0, 0);

    const videos = await fetchRecentVideos(channelId, sinceDate);

    if (videos.length === 0) {
      return NextResponse.json({
        success: true,
        channelId,
        meetingLabel: `Reunión ${meeting.meetingNumber} · ${meetingDate.toLocaleDateString('es-VE')}`,
        videos: [],
        message: 'No se encontraron videos recientes para la semana de esta jornada.',
      });
    }

    interface VideoResult {
      videoId: string;
      title: string;
      videoUrl: string;
      publishedAt: string;
      transcriptAvailable: boolean;
      expertNames: string[];
      diffs: RaceDiff[];
      globalMatchScore: number;
      racesExtracted: number;
    }

    const videoResults: VideoResult[] = [];

    for (const video of videos.slice(0, 5)) {
      const transcript = await fetchTranscript(video.videoId);
      if (!transcript) {
        videoResults.push({ videoId: video.videoId, title: video.title, videoUrl: video.videoUrl, publishedAt: video.publishedAt.toISOString(), transcriptAvailable: false, expertNames: [], diffs: [], globalMatchScore: 0, racesExtracted: 0 });
        continue;
      }

      const prompt = buildMasterPrompt(transcript, enrolledEntries);
      let rawLLM = '';
      try { rawLLM = await callLLM(prompt); } catch {
        videoResults.push({ videoId: video.videoId, title: video.title, videoUrl: video.videoUrl, publishedAt: video.publishedAt.toISOString(), transcriptAvailable: true, expertNames: [], diffs: [], globalMatchScore: 0, racesExtracted: 0 });
        continue;
      }

      const extracted = parseLLMForecasts(rawLLM);
      const expertNames = [...new Set(extracted.map(f => f.expertName).filter(Boolean))] as string[];

      const allRaceNums = new Set<number>();
      for (const f of extracted) {
        const absNum = f.raceType === 'valida' ? Math.max(1, totalRaces - 6 + f.raceNumber) : f.raceNumber;
        allRaceNums.add(absNum);
      }
      for (const rn of dbByRace.keys()) allRaceNums.add(rn);

      const diffs: RaceDiff[] = [];
      for (const raceNum of [...allRaceNums].sort((a, b) => a - b)) {
        const dbMarks = dbByRace.get(raceNum) ?? [];
        const raceEnrolled = enrolledEntries.find(e => e.raceNumber === raceNum)?.entries ?? [];

        const extForRace = extracted.filter(f => {
          const absNum = f.raceType === 'valida' ? Math.max(1, totalRaces - 6 + f.raceNumber) : f.raceNumber;
          return absNum === raceNum;
        }).flatMap(f => f.marks);

        const resolvedExtMarks = extForRace.map(m => {
          let horseName = m.rawName ?? '';
          let confidence = 0;
          if (m.dorsalNumber && !m.rawName) {
            const byDorsal = raceEnrolled.find(e => e.dorsal === m.dorsalNumber);
            horseName = byDorsal?.horseName ?? `Dorsal ${m.dorsalNumber}`;
            confidence = byDorsal ? 1.0 : 0.5;
          } else if (m.rawName) {
            const best = findBestMatch(m.rawName, raceEnrolled);
            if (best) { horseName = best.horseName; confidence = best.confidence; }
            else confidence = 0.3;
          }
          return { preferenceOrder: m.preferenceOrder, horseName, dorsalNumber: m.dorsalNumber, rawLabel: m.rawLabel, confidence };
        });

        diffs.push(computeDiff(dbMarks, resolvedExtMarks, raceNum, raceIdByNumber.get(raceNum) ?? null));
      }

      const scored = diffs.filter(d => d.hasDbData);
      const globalMatchScore = scored.length > 0
        ? Math.round(scored.reduce((sum, d) => sum + d.matchScore, 0) / scored.length)
        : 0;

      videoResults.push({ videoId: video.videoId, title: video.title, videoUrl: video.videoUrl, publishedAt: video.publishedAt.toISOString(), transcriptAvailable: true, expertNames, diffs, globalMatchScore, racesExtracted: extracted.length });
    }

    const allScored = videoResults.flatMap(v => v.diffs.filter(d => d.hasDbData));
    const overallScore = allScored.length > 0
      ? Math.round(allScored.reduce((sum, d) => sum + d.matchScore, 0) / allScored.length)
      : null;

    return NextResponse.json({
      success: true,
      channelId,
      meetingLabel: `Reunión ${meeting.meetingNumber} · ${meetingDate.toLocaleDateString('es-VE')}`,
      videos: videoResults,
      overallMatchScore: overallScore,
    });
  } catch (err) {
    console.error('[intelligence/shadow]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
