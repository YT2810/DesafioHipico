/**
 * GET /api/activity/recent
 * Public endpoint — returns anonymized recent activity for social proof.
 * No auth required. No PII exposed: alias is truncated, no amounts shown.
 *
 * Sources:
 *   GoldTransaction types: purchase, race_unlock, meeting_pass
 *   ActivityEvent types:   pass_activation, race_result
 * Purchase/pass events are weighted 2x in the rotation for higher persuasion frequency.
 */

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import GoldTransaction from '@/models/GoldTransaction';
import ActivityEvent from '@/models/ActivityEvent';
import User from '@/models/User';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Multiple copy variants per type — index cycles through them for variety
const TYPE_COPY: Record<string, string[]> = {
  purchase: [
    'consultó el Factor de Victoria esta semana',
    'accedió a todas las carreras con su Pase',
    'desbloqueó el diagnóstico de carreras esta semana',
  ],
  race_unlock: [
    'consultó el Factor de Victoria',
    'revisó el consenso de pronosticadores',
  ],
  meeting_pass: [
    'desbloqueó la jornada completa 🏇',
    'activó acceso completo a todas las carreras del día',
  ],
  pass_activation: [
    'activó su Pase Semanal Nacional 🎟️',
    'activó su Pase Nacional esta semana',
    'tiene acceso completo esta semana con su Pase',
    'acaba de activar el Pase Nacional',
  ],
  race_result: [],  // filled dynamically from ActivityEvent.message
};

// Emoji prefix per type for quick visual scanning on mobile
const TYPE_EMOJI: Record<string, string> = {
  purchase:         '🟡',
  race_unlock:      '🔓',
  meeting_pass:     '🏇',
  pass_activation:  '🎟️',
  race_result:      '🏆',
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

    // 1. GoldTransaction events (legacy race_unlock / meeting_pass + pass purchases)
    const txs = await GoldTransaction.find(
      { type: { $in: ['purchase', 'race_unlock', 'meeting_pass'] }, createdAt: { $gte: since } },
      { userId: 1, type: 1, createdAt: 1 }
    ).sort({ createdAt: -1 }).limit(80).lean();

    // 2. ActivityEvent: pass_activation + race_result (new system)
    const actEvts = await ActivityEvent.find(
      { type: { $in: ['pass_activation', 'race_result'] }, createdAt: { $gte: since } },
      { userId: 1, type: 1, message: 1, createdAt: 1 }
    ).sort({ createdAt: -1 }).limit(40).lean();

    // Resolve user aliases for GoldTransaction events
    const userIds = [...new Set(txs.map(t => t.userId.toString()))];
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } }, { _id: 1, alias: 1 }).lean()
      : [];
    const aliasMap = new Map(users.map(u => [u._id.toString(), u.alias as string]));

    // Resolve user aliases for ActivityEvent (userId may be null for race_result)
    const actUserIds = actEvts.filter(e => e.userId).map(e => e.userId!.toString());
    const actUsers = actUserIds.length
      ? await User.find({ _id: { $in: actUserIds } }, { _id: 1, alias: 1 }).lean()
      : [];
    const actAliasMap = new Map(actUsers.map(u => [u._id.toString(), u.alias as string]));

    const txBaseEvents = txs
      .filter(t => TYPE_COPY[t.type]?.length)
      .map((t, i) => ({
        alias: maskAlias(aliasMap.get(t.userId.toString()) ?? 'Usuario'),
        action: TYPE_COPY[t.type][i % TYPE_COPY[t.type].length],
        emoji: TYPE_EMOJI[t.type] ?? '🪙',
        type: t.type,
        minutesAgo: Math.round((Date.now() - new Date(t.createdAt).getTime()) / 60000),
      }));

    const actBaseEvents = actEvts.map((e, i) => {
      const copies = TYPE_COPY[e.type];
      const action = e.type === 'race_result'
        ? (e.message as string) ?? '🏆 Resultado verificado con el Factor de Victoria'
        : copies?.[i % (copies.length || 1)] ?? 'activó su acceso esta semana';
      return {
        alias: e.userId
          ? maskAlias(actAliasMap.get(e.userId.toString()) ?? 'Usuario')
          : 'Desafío Hípico',
        action,
        emoji: TYPE_EMOJI[e.type] ?? '📌',
        type: e.type,
        minutesAgo: Math.round((Date.now() - new Date(e.createdAt).getTime()) / 60000),
      };
    });

    const baseEvents = [...txBaseEvents, ...actBaseEvents];

    // Pass / activation events weighted 2x — higher persuasion signal
    const highWeight = baseEvents.filter(e => e.type === 'purchase' || e.type === 'pass_activation');
    const combined = [...baseEvents, ...highWeight];

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
