/**
 * GET /api/ticker/today
 *
 * Hybrid ticker data:
 * 1. Handicappers with published forecasts for the most recent active meeting
 *    → include their "fijo" (preferenceOrder=1 mark with dorsalNumber if available)
 *    → flagged as activeToday=true, shown first
 * 2. Filled up to TARGET_ENTRIES with top-ranked handicappers (by E1) who have no
 *    forecast today → activeToday=false, shown as discovery cards
 *
 * Returns up to TARGET_ENTRIES entries total.
 */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import Forecast from '@/models/Forecast';
import HandicapperProfile from '@/models/HandicapperProfile';

export const dynamic = 'force-dynamic';

const TARGET_ENTRIES = 12;
const MIN_RACES_FOR_RANKING = 5;

export interface TickerTodayEntry {
  id: string;               // HandicapperProfile._id
  pseudonym: string;
  isGhost: boolean;
  e1: number | null;
  eGeneral: number;
  totalRaces: number;
  contactNumber?: string;
  activeToday: boolean;     // has published forecasts for today's meeting
  // fijo fields — only when activeToday=true and a dorsal is available
  fijoDorsal?: number;
  fijoHorseName?: string;
  fijoLabel?: string;       // 'Línea', 'Casi Fijo', etc.
}

export async function GET() {
  try {
    await dbConnect();

    // ── 1. Find the most recent active (or upcoming) meeting ──────────────
    const now = new Date();
    const recentMeeting = await Meeting.findOne({
      date: {
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString().slice(0, 10),
      },
    })
      .sort({ date: -1 })
      .select('_id date trackName')
      .lean() as any;

    const activeEntries: TickerTodayEntry[] = [];
    const activeHandicapperIds = new Set<string>();

    if (recentMeeting) {
      // ── 2. Distinct handicappers with ≥1 published forecast this meeting ──
      const publishedForecasts = await Forecast.find({
        meetingId: recentMeeting._id,
        isPublished: true,
      })
        .select('handicapperId marks')
        .lean() as any[];

      // Group by handicapper, collect all their marks
      const byHandicapper = new Map<string, any[]>();
      for (const f of publishedForecasts) {
        const hid = f.handicapperId.toString();
        if (!byHandicapper.has(hid)) byHandicapper.set(hid, []);
        byHandicapper.get(hid)!.push(...(f.marks ?? []));
      }

      if (byHandicapper.size > 0) {
        const hIds = Array.from(byHandicapper.keys());
        const profiles = await HandicapperProfile.find({ _id: { $in: hIds }, isActive: true })
          .select('pseudonym isGhost stats contactNumber revenueSharePct')
          .lean() as any[];

        for (const p of profiles) {
          const pid = p._id.toString();
          activeHandicapperIds.add(pid);
          const allMarks = byHandicapper.get(pid) ?? [];

          // Best "fijo": prefer label==='Línea' with dorsalNumber, else preferenceOrder===1
          const lineas = allMarks.filter((m: any) => m.label === 'Línea' && m.dorsalNumber != null);
          const fijo = lineas[0] ?? allMarks.find((m: any) => m.preferenceOrder === 1 && m.dorsalNumber != null) ?? allMarks[0];

          activeEntries.push({
            id: pid,
            pseudonym: p.pseudonym,
            isGhost: p.isGhost ?? false,
            e1: p.stats?.e1 ?? null,
            eGeneral: p.stats?.eGeneral ?? 0,
            totalRaces: p.stats?.totalRaces ?? 0,
            contactNumber: p.contactNumber,
            activeToday: true,
            fijoDorsal: fijo?.dorsalNumber,
            fijoHorseName: fijo?.horseName,
            fijoLabel: fijo?.label,
          });
        }

        // Sort active entries: E1 desc (nulls last)
        activeEntries.sort((a, b) => {
          const ae = a.e1 ?? -1;
          const be = b.e1 ?? -1;
          return be - ae;
        });
      }
    }

    // ── 3. Fill remaining slots with top-ranked handicappers (no forecast today) ──
    const needed = TARGET_ENTRIES - activeEntries.length;
    const rankingEntries: TickerTodayEntry[] = [];

    if (needed > 0) {
      const rankingProfiles = await HandicapperProfile.find({
        isActive: true,
        'stats.totalRaces': { $gte: MIN_RACES_FOR_RANKING },
        ...(activeHandicapperIds.size > 0
          ? { _id: { $nin: Array.from(activeHandicapperIds) } }
          : {}),
      })
        .select('pseudonym isGhost stats contactNumber')
        .sort({ 'stats.e1': -1, 'stats.eGeneral': -1 })
        .limit(needed)
        .lean() as any[];

      for (const p of rankingProfiles) {
        rankingEntries.push({
          id: p._id.toString(),
          pseudonym: p.pseudonym,
          isGhost: p.isGhost ?? false,
          e1: p.stats?.e1 ?? null,
          eGeneral: p.stats?.eGeneral ?? 0,
          totalRaces: p.stats?.totalRaces ?? 0,
          contactNumber: p.contactNumber,
          activeToday: false,
        });
      }
    }

    // ── 4. If zero active AND zero ranking (new platform), include ALL active profiles ──
    if (activeEntries.length === 0 && rankingEntries.length === 0) {
      const allProfiles = await HandicapperProfile.find({ isActive: true })
        .select('pseudonym isGhost stats contactNumber')
        .sort({ 'stats.e1': -1 })
        .limit(TARGET_ENTRIES)
        .lean() as any[];

      for (const p of allProfiles) {
        rankingEntries.push({
          id: p._id.toString(),
          pseudonym: p.pseudonym,
          isGhost: p.isGhost ?? false,
          e1: p.stats?.e1 ?? null,
          eGeneral: p.stats?.eGeneral ?? 0,
          totalRaces: p.stats?.totalRaces ?? 0,
          contactNumber: p.contactNumber,
          activeToday: false,
        });
      }
    }

    return NextResponse.json({
      entries: [...activeEntries, ...rankingEntries],
      meetingId: recentMeeting?._id?.toString() ?? null,
      activeCount: activeEntries.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg, entries: [] }, { status: 500 });
  }
}
