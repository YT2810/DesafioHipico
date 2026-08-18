/**
 * GET /api/activity/recent
 * Public endpoint — returns anonymized recent Gold activity for social proof.
 * No auth required. No PII exposed: alias is truncated, no amounts shown.
 *
 * Types included: purchases, race_unlock, meeting_pass, welcome_bonus (new registrations).
 * Purchase events are weighted 2x in the rotation for higher persuasion frequency.
 */

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import GoldTransaction from '@/models/GoldTransaction';
import User from '@/models/User';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Multiple copy variants per type — index cycles through them for variety
const TYPE_COPY: Record<string, string[]> = {
  purchase: [
    'acaba de comprar Gold 🪙',
    'recargó su cuenta con Gold',
    'activó un plan Gold para ver pronósticos',
    'compró Gold y desbloqueó el Factor de Victoria',
  ],
  race_unlock: [
    'desbloqueó una carrera con Gold',
    'consultó el Factor de Victoria',
    'usó Gold para ver el consenso de handicappers',
  ],
  meeting_pass: [
    'desbloqueó la jornada completa 🏇',
    'activó el pase de jornada — todas las carreras',
    'desbloqueó todas las carreras del día con Gold',
  ],
  welcome_bonus: [
    'acaba de registrarse en la plataforma',
    'se unió y recibió sus primeros Golds',
    'se acaba de crear una cuenta',
  ],
};

// Emoji prefix per type for quick visual scanning on mobile
const TYPE_EMOJI: Record<string, string> = {
  purchase:      '🟡',
  race_unlock:   '🔓',
  meeting_pass:  '🏇',
  welcome_bonus: '👤',
};

function maskAlias(alias: string): string {
  if (!alias || alias.length < 2) return 'Alguien';
  const visible = alias.slice(0, Math.min(5, alias.length));
  return visible[0].toUpperCase() + visible.slice(1) + '***';
}

export async function GET() {
  try {
    await dbConnect();

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const txs = await GoldTransaction.find(
      { type: { $in: ['purchase', 'race_unlock', 'meeting_pass', 'welcome_bonus'] }, createdAt: { $gte: since } },
      { userId: 1, type: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    if (!txs.length) return NextResponse.json({ events: [] });

    const userIds = [...new Set(txs.map(t => t.userId.toString()))];
    const users = await User.find(
      { _id: { $in: userIds } },
      { _id: 1, alias: 1 }
    ).lean();

    const aliasMap = new Map(users.map(u => [u._id.toString(), u.alias as string]));

    const baseEvents = txs
      .filter(t => TYPE_COPY[t.type])
      .map((t, i) => ({
        alias: maskAlias(aliasMap.get(t.userId.toString()) ?? 'Usuario'),
        action: TYPE_COPY[t.type][i % TYPE_COPY[t.type].length],
        emoji: TYPE_EMOJI[t.type] ?? '🪙',
        type: t.type,
        minutesAgo: Math.round((Date.now() - new Date(t.createdAt).getTime()) / 60000),
      }));

    // Purchases appear twice in rotation — higher persuasion weight
    const purchases = baseEvents.filter(e => e.type === 'purchase');
    const combined = [...baseEvents, ...purchases];

    // Shuffle so sequence isn't always chronological
    for (let i = combined.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combined[i], combined[j]] = [combined[j], combined[i]];
    }

    return NextResponse.json({ events: combined.slice(0, 60) }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
