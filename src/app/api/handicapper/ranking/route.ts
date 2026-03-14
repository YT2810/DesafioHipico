import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HandicapperProfile from '@/models/HandicapperProfile';

export const dynamic = 'force-dynamic';

export interface RankingEntry {
  id: string;
  pseudonym: string;
  isGhost: boolean;
  totalRaces: number;
  orderedRaces: number;
  e1: number | null;
  e1_2: number | null;
  e1_3: number | null;
  eGeneral: number;
  roi1st: number | null;
}

const MIN_RACES = 5;

export async function GET() {
  try {
    await dbConnect();

    // Single lightweight query — reads precomputed stats from HandicapperProfile
    const profiles = await HandicapperProfile.find({
      isActive: true,
      'stats.totalRaces': { $gte: MIN_RACES },
    })
      .select('pseudonym isGhost stats')
      .lean();

    const entries: RankingEntry[] = profiles.map((p: any) => ({
      id: p._id.toString(),
      pseudonym: p.pseudonym,
      isGhost: p.isGhost ?? false,
      totalRaces: p.stats?.totalRaces ?? 0,
      orderedRaces: p.stats?.orderedRaces ?? 0,
      e1: p.stats?.e1 ?? null,
      e1_2: p.stats?.e1_2 ?? null,
      e1_3: p.stats?.e1_3 ?? null,
      eGeneral: p.stats?.eGeneral ?? 0,
      roi1st: p.stats?.roi1st ?? null,
    }));

    // Sort: E1 desc (nulls last), then eGeneral desc
    entries.sort((a, b) => {
      const aE1 = a.e1 ?? -1;
      const bE1 = b.e1 ?? -1;
      if (bE1 !== aE1) return bE1 - aE1;
      return b.eGeneral - a.eGeneral;
    });

    return NextResponse.json({ ranking: entries, minRaces: MIN_RACES });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
