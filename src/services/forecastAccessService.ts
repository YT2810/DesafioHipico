/**
 * forecastAccessService.ts
 *
 * Freemium access rules per MEETING (not per day):
 *   - customer  → dynamic free races per meeting (1 if ≤10 races, 2 if >10)
 *   - staff     → sees all FREE-tier forecasts at no cost
 *   - handicapper / admin → full access, no cost
 *
 * Quota is permanent per meeting — no time-based reset.
 * Once a race is unlocked it stays unlocked for that user+meeting forever.
 *
 * Meeting Pass → unlocks ALL races in a meeting for MEETING_PASS_COST Golds.
 * VIP forecasts (isVip=true) always cost 1 Gold regardless of free quota.
 */

import dbConnect from '@/lib/mongodb';
import User, { GOLD_COST_PER_RACE, MEETING_PASS_COST, getFreeRacesAllowance } from '@/models/User';
import GoldTransaction from '@/models/GoldTransaction';
import { Types } from 'mongoose';
import { notifyGoldLow } from '@/services/notificationService';

const GOLD_LOW_THRESHOLD = 3;

export type AccessResult =
  | { granted: true; free: true; freeRemaining: number }
  | { granted: true; free: false; goldSpent: number; balanceAfter: number }
  | { granted: false; reason: 'insufficient_gold'; goldRequired: number; currentBalance: number }
  | { granted: false; reason: 'already_unlocked' };

/**
 * Attempt to unlock a race for a user within a meeting.
 * Idempotent: if already unlocked, returns already_unlocked (no charge).
 */
export async function requestRaceAccess(
  userId: string,
  meetingId: string,
  raceId: string,
  totalRaces: number = 10,
): Promise<AccessResult> {
  await dbConnect();

  const user = await User.findById(userId);
  if (!user) throw new Error('Usuario no encontrado.');

  // staff / handicapper / admin → free access always
  const roles = user.roles ?? [];
  if (roles.some((r: string) => ['staff', 'handicapper', 'admin'].includes(r))) {
    return { granted: true, free: true, freeRemaining: Infinity };
  }

  // Find or create meeting consumption record
  let mc = user.meetingConsumptions.find((c: { meetingId: string }) => c.meetingId === meetingId);
  if (!mc) {
    user.meetingConsumptions.push({ meetingId, freeUsed: 0, unlockedRaceIds: [], passUnlocked: false });
    mc = user.meetingConsumptions[user.meetingConsumptions.length - 1];
  }

  // Already unlocked → idempotent
  if (mc.unlockedRaceIds.includes(raceId)) {
    return { granted: false, reason: 'already_unlocked' };
  }

  // Meeting Pass → free access to all races
  if (mc.passUnlocked) {
    mc.unlockedRaceIds.push(raceId);
    await user.save();
    return { granted: true, free: true, freeRemaining: Infinity };
  }

  // Dynamic free quota based on total races in meeting
  const freeAllowance = getFreeRacesAllowance(totalRaces);

  // Within free quota
  if (mc.freeUsed < freeAllowance) {
    mc.freeUsed += 1;
    mc.unlockedRaceIds.push(raceId);
    await user.save();
    return {
      granted: true,
      free: true,
      freeRemaining: freeAllowance - mc.freeUsed,
    };
  }

  // Paid access — deduct 1 Gold
  const currentGolds = user.balance.golds;
  if (currentGolds < GOLD_COST_PER_RACE) {
    return {
      granted: false,
      reason: 'insufficient_gold',
      goldRequired: GOLD_COST_PER_RACE,
      currentBalance: currentGolds,
    };
  }

  user.balance.golds -= GOLD_COST_PER_RACE;
  mc.unlockedRaceIds.push(raceId);
  const balanceAfter = user.balance.golds;
  await user.save();

  await GoldTransaction.create({
    userId: user._id,
    type: 'race_unlock',
    amount: -GOLD_COST_PER_RACE,
    balanceAfter,
    description: `Desbloqueo pronósticos — Reunión ${meetingId} · Carrera ${raceId}`,
    raceId: new Types.ObjectId(raceId),
  });

  // Warn user if balance is now low (fire-and-forget)
  if (balanceAfter < GOLD_LOW_THRESHOLD) {
    notifyGoldLow(userId, balanceAfter).catch(() => {});
  }

  return { granted: true, free: false, goldSpent: GOLD_COST_PER_RACE, balanceAfter };
}

/**
 * Purchase a Meeting Pass for a user, unlocking all races in a meeting.
 * Costs MEETING_PASS_COST Golds. Idempotent if already purchased.
 */
export async function purchaseMeetingPass(
  userId: string,
  meetingId: string,
): Promise<
  | { success: true; balanceAfter: number }
  | { success: false; reason: 'already_unlocked' | 'insufficient_gold'; currentBalance?: number }
> {
  await dbConnect();

  const user = await User.findById(userId);
  if (!user) throw new Error('Usuario no encontrado.');

  let mc = user.meetingConsumptions.find((c: { meetingId: string }) => c.meetingId === meetingId);
  if (!mc) {
    user.meetingConsumptions.push({ meetingId, freeUsed: 0, unlockedRaceIds: [], passUnlocked: false });
    mc = user.meetingConsumptions[user.meetingConsumptions.length - 1];
  }

  if (mc.passUnlocked) return { success: false, reason: 'already_unlocked' };

  const currentGolds = user.balance.golds;
  if (currentGolds < MEETING_PASS_COST) {
    return { success: false, reason: 'insufficient_gold', currentBalance: currentGolds };
  }

  user.balance.golds -= MEETING_PASS_COST;
  mc.passUnlocked = true;
  const balanceAfter = user.balance.golds;
  await user.save();

  await GoldTransaction.create({
    userId: user._id,
    type: 'meeting_pass',
    amount: -MEETING_PASS_COST,
    balanceAfter,
    description: `Meeting Pass — Reunión ${meetingId}`,
  });

  if (balanceAfter < GOLD_LOW_THRESHOLD) {
    notifyGoldLow(userId, balanceAfter).catch(() => {});
  }

  return { success: true, balanceAfter };
}

/**
 * Batch access map for all races in a meeting — used to render the dashboard.
 * Does NOT consume quota; purely reads current state.
 *
 * Returns for each raceId:
 *   unlocked  → user can see forecasts
 *   free      → was unlocked without Gold cost
 *   freeRemaining → how many more free unlocks left in this meeting
 *   passUnlocked  → Meeting Pass was purchased for this meeting
 */
export async function getMeetingAccessMap(
  userId: string,
  meetingId: string,
  raceIds: string[],
  totalRaces?: number,
): Promise<{
  map: Record<string, { unlocked: boolean; free: boolean }>;
  freeRemaining: number;
  goldBalance: number;
  isPrivileged: boolean;
  passUnlocked: boolean;
}> {
  await dbConnect();

  const user = await User.findById(userId).lean();
  if (!user) throw new Error('Usuario no encontrado.');

  const roles = user.roles ?? [];
  const isPrivileged = roles.some((r: string) => ['staff', 'handicapper', 'admin'].includes(r));

  if (isPrivileged) {
    const map: Record<string, { unlocked: boolean; free: boolean }> = {};
    for (const raceId of raceIds) map[raceId] = { unlocked: true, free: true };
    return { map, freeRemaining: Infinity, goldBalance: user.balance?.golds ?? 0, isPrivileged: true, passUnlocked: false };
  }

  const mc = (user.meetingConsumptions ?? []).find((c: { meetingId: string }) => c.meetingId === meetingId);
  const passUnlocked = mc?.passUnlocked ?? false;
  const freeUsed = mc?.freeUsed ?? 0;
  const unlockedIds = new Set<string>(mc?.unlockedRaceIds ?? []);
  const freeAllowance = getFreeRacesAllowance(totalRaces ?? raceIds.length);
  const freeRemaining = passUnlocked ? Infinity : Math.max(0, freeAllowance - freeUsed);

  const map: Record<string, { unlocked: boolean; free: boolean }> = {};
  let slotsLeft = passUnlocked ? Infinity : freeRemaining;

  for (const raceId of raceIds) {
    if (passUnlocked || unlockedIds.has(raceId)) {
      map[raceId] = { unlocked: true, free: true };
    } else if (slotsLeft > 0) {
      // Not yet consumed but within quota — show as unlocked in UI (will be consumed on first open)
      map[raceId] = { unlocked: true, free: true };
      if (slotsLeft !== Infinity) slotsLeft--;
    } else {
      map[raceId] = { unlocked: false, free: false };
    }
  }

  return { map, freeRemaining, goldBalance: user.balance?.golds ?? 0, isPrivileged: false, passUnlocked };
}
