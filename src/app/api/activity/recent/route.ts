/**
 * GET /api/activity/recent
 * Public endpoint — returns anonymized recent Gold activity for social proof.
 * No auth required. No PII exposed: alias is truncated, no amounts shown.
 */

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import GoldTransaction from '@/models/GoldTransaction';
import User from '@/models/User';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TYPE_LABELS: Record<string, string> = {
  purchase:     'recargó Gold',
  race_unlock:  'desbloqueó una carrera',
  meeting_pass: 'desbloqueó la jornada completa',
};

function maskAlias(alias: string): string {
  if (!alias || alias.length < 2) return 'Alguien';
  return alias[0].toUpperCase() + alias.slice(1, 3) + '***';
}

export async function GET() {
  try {
    await dbConnect();

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const txs = await GoldTransaction.find(
      { type: { $in: ['purchase', 'race_unlock', 'meeting_pass'] }, createdAt: { $gte: since } },
      { userId: 1, type: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    if (!txs.length) return NextResponse.json({ events: [] });

    const userIds = [...new Set(txs.map(t => t.userId.toString()))];
    const users = await User.find(
      { _id: { $in: userIds } },
      { _id: 1, alias: 1 }
    ).lean();

    const aliasMap = new Map(users.map(u => [u._id.toString(), u.alias as string]));

    const events = txs
      .filter(t => TYPE_LABELS[t.type])
      .map(t => ({
        alias: maskAlias(aliasMap.get(t.userId.toString()) ?? 'Usuario'),
        action: TYPE_LABELS[t.type],
        minutesAgo: Math.round((Date.now() - new Date(t.createdAt).getTime()) / 60000),
      }));

    return NextResponse.json({ events }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
