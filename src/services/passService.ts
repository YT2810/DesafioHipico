/**
 * passService.ts — estado del Pase Nacional por usuario (batch + individual).
 *
 * Replica las mismas reglas de hasActiveNationalPass() para poder
 * clasificar usuarios sin N consultas:
 *   - Semanal: topup aprobado con reviewedAt/createdAt desde el lunes de esta semana,
 *              o compra de Golds esta semana (legacy)
 *   - Mensual: packageId 'padrillo' o amountBs >= 20.000 con reviewedAt en últimos 30d,
 *              o compra de >= 50 Golds en últimos 30d (legacy)
 */
import TopUpRequest from '@/models/TopUpRequest';
import GoldTransaction from '@/models/GoldTransaction';
import { getCurrentWeekMondayStartUTC } from './forecastAccessService';
import { Types } from 'mongoose';

const MONTHLY_PKG = 'padrillo';
const MONTHLY_MIN_BS = 20000;
const LEGACY_MONTHLY_GOLD = 50;
const DAY_MS = 24 * 3600 * 1000;

export type PassStatus = 'monthly' | 'weekly' | 'expired' | 'never';

export interface PassInfo {
  status: PassStatus;
  kind: 'monthly' | 'weekly' | null;
  expiresAt: string | null; // ISO — domingo 24:00 VE para semanal, reviewedAt+30d para mensual
}

type TopupDoc = { packageId?: string; amountBs: number; reviewedAt?: Date; createdAt: Date };
type GoldDoc = { amount: number; createdAt: Date };

function isMonthlyTopup(t: TopupDoc, days30Ago: number): boolean {
  const ts = t.reviewedAt?.getTime() ?? 0;
  return (t.packageId === MONTHLY_PKG || t.amountBs >= MONTHLY_MIN_BS) && ts >= days30Ago;
}

function isWeeklyTopup(t: TopupDoc, weekStart: number): boolean {
  return (t.reviewedAt?.getTime() ?? 0) >= weekStart || t.createdAt.getTime() >= weekStart;
}

export function computePassInfo(
  topups: TopupDoc[],
  goldTxs: GoldDoc[],
  everHad: boolean,
): PassInfo {
  const now = Date.now();
  const weekStart = getCurrentWeekMondayStartUTC().getTime();
  const days30Ago = now - 30 * DAY_MS;
  const weekEnd = weekStart + 7 * DAY_MS; // lunes próximo 04:00 UTC = fin de domingo VE

  // Mensual gana sobre semanal si ambos aplican
  const monthlyTopup = topups
    .filter(t => isMonthlyTopup(t, days30Ago))
    .sort((a, b) => (b.reviewedAt?.getTime() ?? 0) - (a.reviewedAt?.getTime() ?? 0))[0];
  const monthlyGold = goldTxs
    .filter(g => g.amount >= LEGACY_MONTHLY_GOLD && g.createdAt.getTime() >= days30Ago)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  const monthlyExp = Math.max(
    monthlyTopup ? (monthlyTopup.reviewedAt!.getTime() + 30 * DAY_MS) : 0,
    monthlyGold ? monthlyGold.createdAt.getTime() + 30 * DAY_MS : 0,
  );
  if (monthlyExp > now) {
    return { status: 'monthly', kind: 'monthly', expiresAt: new Date(monthlyExp).toISOString() };
  }

  const weekly = topups.some(t => isWeeklyTopup(t, weekStart)) ||
    goldTxs.some(g => g.createdAt.getTime() >= weekStart);
  if (weekly) {
    return { status: 'weekly', kind: 'weekly', expiresAt: new Date(weekEnd).toISOString() };
  }

  return { status: everHad ? 'expired' : 'never', kind: null, expiresAt: null };
}

/** IDs de usuarios con pase activo ahora mismo (mismas reglas que hasActiveNationalPass). */
export async function getActivePassUserIds(): Promise<Types.ObjectId[]> {
  const weekStart = getCurrentWeekMondayStartUTC();
  const days30Ago = new Date(Date.now() - 30 * DAY_MS);
  const [topupIds, goldIds] = await Promise.all([
    TopUpRequest.distinct('userId', {
      status: 'approved',
      $or: [
        { reviewedAt: { $gte: weekStart } },
        { createdAt: { $gte: weekStart } },
        { packageId: MONTHLY_PKG, reviewedAt: { $gte: days30Ago } },
        { amountBs: { $gte: MONTHLY_MIN_BS }, reviewedAt: { $gte: days30Ago } },
      ],
    }),
    GoldTransaction.distinct('userId', {
      type: 'purchase',
      $or: [
        { createdAt: { $gte: weekStart } },
        { amount: { $gte: LEGACY_MONTHLY_GOLD }, createdAt: { $gte: days30Ago } },
      ],
    }),
  ]);
  return [...topupIds, ...goldIds];
}

/** IDs de usuarios que alguna vez tuvieron pase (incluye los activos ahora). */
export async function getEverPassUserIds(): Promise<Types.ObjectId[]> {
  const [topupIds, goldIds] = await Promise.all([
    TopUpRequest.distinct('userId', { status: 'approved' }),
    GoldTransaction.distinct('userId', { type: 'purchase' }),
  ]);
  return [...topupIds, ...goldIds];
}

/** PassInfo de un solo usuario (para la vista admin). */
export async function getPassInfoForUser(userId: Types.ObjectId): Promise<PassInfo> {
  const days30Ago = new Date(Date.now() - 30 * DAY_MS);
  const [topups, goldTxs, everTopup, everGold] = await Promise.all([
    TopUpRequest.find({ userId, status: 'approved', $or: [{ reviewedAt: { $gte: days30Ago } }, { createdAt: { $gte: days30Ago } }] })
      .select('packageId amountBs reviewedAt createdAt').lean(),
    GoldTransaction.find({ userId, type: 'purchase', createdAt: { $gte: days30Ago } })
      .select('amount createdAt').lean(),
    TopUpRequest.exists({ userId, status: 'approved' }),
    GoldTransaction.exists({ userId, type: 'purchase' }),
  ]);
  return computePassInfo(topups as TopupDoc[], goldTxs as GoldDoc[], Boolean(everTopup || everGold));
}

/** PassInfo por lote para una página de usuarios — 4 queries totales, no N por usuario. */
export async function getPassInfoForUsers(userIds: Types.ObjectId[]): Promise<Map<string, PassInfo>> {
  const map = new Map<string, PassInfo>();
  if (userIds.length === 0) return map;
  const days30Ago = new Date(Date.now() - 30 * DAY_MS);

  const [topups, goldTxs, everTopups, everGolds] = await Promise.all([
    TopUpRequest.find({ userId: { $in: userIds }, status: 'approved', $or: [{ reviewedAt: { $gte: days30Ago } }, { createdAt: { $gte: days30Ago } }] })
      .select('userId packageId amountBs reviewedAt createdAt').lean(),
    GoldTransaction.find({ userId: { $in: userIds }, type: 'purchase', createdAt: { $gte: days30Ago } })
      .select('userId amount createdAt').lean(),
    TopUpRequest.distinct('userId', { userId: { $in: userIds }, status: 'approved' }),
    GoldTransaction.distinct('userId', { userId: { $in: userIds }, type: 'purchase' }),
  ]);

  const byUser = new Map<string, { topups: TopupDoc[]; golds: GoldDoc[] }>();
  for (const t of topups as any[]) {
    const k = t.userId.toString();
    if (!byUser.has(k)) byUser.set(k, { topups: [], golds: [] });
    byUser.get(k)!.topups.push(t);
  }
  for (const g of goldTxs as any[]) {
    const k = g.userId.toString();
    if (!byUser.has(k)) byUser.set(k, { topups: [], golds: [] });
    byUser.get(k)!.golds.push(g);
  }
  const ever = new Set([...everTopups, ...everGolds].map((id: any) => id.toString()));

  for (const id of userIds) {
    const k = id.toString();
    const d = byUser.get(k) ?? { topups: [], golds: [] };
    map.set(k, computePassInfo(d.topups, d.golds, ever.has(k)));
  }
  return map;
}
