/**
 * notificationService — central place to create notifications.
 * All callers import from here; never create Notification docs directly.
 *
 * Audience routing:
 *   notifyAdmins()      → all users with role admin or staff
 *   notifyUser()        → one specific user
 *   notifyHandicappers()→ all active handicappers
 *   notifyFollowers()   → all users following a specific handicapper
 */

import dbConnect from '@/lib/mongodb';
import Notification, { NotificationType } from '@/models/Notification';
import User from '@/models/User';
import { Types } from 'mongoose';

interface NotifPayload {
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  data?: Record<string, string>;
}

/** Send to a single user */
export async function notifyUser(userId: string | Types.ObjectId, payload: NotifPayload) {
  await dbConnect();
  await Notification.create({ userId, ...payload });
}

/** Send to all admin + staff users */
export async function notifyAdmins(payload: NotifPayload) {
  await dbConnect();
  const admins = await User.find(
    { roles: { $in: ['admin', 'staff'] } },
    { _id: 1 }
  ).lean();
  if (!admins.length) return;
  await Notification.insertMany(admins.map(a => ({ userId: a._id, ...payload })));
}

/** Send to all active handicappers */
export async function notifyHandicappers(payload: NotifPayload) {
  await dbConnect();
  const hcps = await User.find(
    { roles: 'handicapper' },
    { _id: 1 }
  ).lean();
  if (!hcps.length) return;
  await Notification.insertMany(hcps.map(h => ({ userId: h._id, ...payload })));
}

/** Send to all users who follow a specific handicapper profile */
export async function notifyFollowers(handicapperProfileId: string | Types.ObjectId, payload: NotifPayload) {
  await dbConnect();
  const followers = await User.find(
    { followedHandicappers: handicapperProfileId },
    { _id: 1 }
  ).lean();
  if (!followers.length) return;
  await Notification.insertMany(followers.map(f => ({ userId: f._id, ...payload })));
}

/** Send to all users (e.g. new meeting announcement) */
export async function notifyAllUsers(payload: NotifPayload) {
  await dbConnect();
  const users = await User.find({}, { _id: 1 }).lean();
  if (!users.length) return;
  // Insert in batches of 500 to avoid memory issues
  const BATCH = 500;
  for (let i = 0; i < users.length; i += BATCH) {
    const batch = users.slice(i, i + BATCH);
    await Notification.insertMany(batch.map(u => ({ userId: u._id, ...payload })));
  }
}

// ── Convenience helpers ────────────────────────────────────────────────────

export async function notifyTopUpPending(userId: string, goldAmount: number, ref: string) {
  await notifyAdmins({
    type: 'topup_pending',
    title: '💰 Nueva recarga pendiente',
    body: `${goldAmount} Golds · Ref: ${ref}`,
    link: '/admin/topup',
    data: { userId, ref, goldAmount: String(goldAmount) },
  });
}

export async function notifyTopUpApproved(userId: string, goldAmount: number) {
  await notifyUser(userId, {
    type: 'topup_approved',
    title: '✅ Recarga aprobada',
    body: `Se acreditaron ${goldAmount} Golds a tu cuenta. ¡A jugar!`,
    link: '/pronosticos',
    data: { goldAmount: String(goldAmount) },
  });
}

export async function notifyTopUpRejected(userId: string, reason: string) {
  await notifyUser(userId, {
    type: 'topup_rejected',
    title: '❌ Recarga rechazada',
    body: `Tu recarga fue rechazada. Motivo: ${reason}`,
    link: '/perfil',
    data: { reason },
  });
}

export async function notifyHandicapperRequestPending(requesterId: string, pseudonym: string) {
  await notifyAdmins({
    type: 'handicapper_request',
    title: '🎯 Nueva solicitud de Handicapper',
    body: `"${pseudonym}" quiere ser handicapper`,
    link: '/admin/handicapper-request',
    data: { requesterId, pseudonym },
  });
}

export async function notifyHandicapperRequestApproved(userId: string, pseudonym: string) {
  await notifyUser(userId, {
    type: 'request_approved',
    title: '🎉 ¡Solicitud aprobada!',
    body: `Ya eres handicapper como "${pseudonym}". Puedes subir tus primeros pronósticos.`,
    link: '/handicapper/forecast',
    data: { pseudonym },
  });
}

export async function notifyHandicapperRequestRejected(userId: string, reason: string) {
  await notifyUser(userId, {
    type: 'request_rejected',
    title: '❌ Solicitud de Handicapper rechazada',
    body: reason || 'Tu solicitud no fue aprobada en esta ocasión.',
    link: '/perfil',
  });
}

export async function notifyFollowersNewForecast(
  handicapperProfileId: string,
  pseudonym: string,
  meetingNumber: number,
  raceNumber: number,
) {
  await notifyFollowers(handicapperProfileId, {
    type: 'followed_forecast',
    title: `🏇 ${pseudonym} publicó un pronóstico`,
    body: `Reunión ${meetingNumber} · Carrera ${raceNumber}`,
    link: '/pronosticos',
    data: { handicapperProfileId, pseudonym, meetingNumber: String(meetingNumber), raceNumber: String(raceNumber) },
  });
}

export async function notifyNewMeeting(meetingNumber: number, trackName: string, date: string) {
  // Users
  await notifyAllUsers({
    type: 'new_meeting',
    title: `📅 Nueva reunión programada`,
    body: `Reunión ${meetingNumber} en ${trackName} · ${date}`,
    link: '/pronosticos',
    data: { meetingNumber: String(meetingNumber), trackName, date },
  });
  // Handicappers (separate type for their feed)
  await notifyHandicappers({
    type: 'new_meeting_hcp',
    title: `📋 Nueva jornada disponible`,
    body: `Reunión ${meetingNumber} en ${trackName} · ${date}. ¡Sube tus pronósticos!`,
    link: '/handicapper/forecast',
    data: { meetingNumber: String(meetingNumber), trackName, date },
  });
}

export async function notifyVipPurchase(handicapperUserId: string, pseudonym: string, buyerAlias: string) {
  await notifyUser(handicapperUserId, {
    type: 'vip_purchase',
    title: '💎 Nuevo suscriptor VIP',
    body: `${buyerAlias} compró tu plan VIP`,
    link: '/handicapper/forecast',
    data: { buyerAlias, pseudonym },
  });
}

export async function notifyGoldLow(userId: string, balance: number) {
  await notifyUser(userId, {
    type: 'gold_low',
    title: '⚠️ Saldo bajo',
    body: `Te quedan solo ${balance} Gold${balance !== 1 ? 's' : ''}. Recarga para seguir desbloqueando carreras.`,
    link: '/',
    data: { balance: String(balance) },
  });
}
