/**
 * followService.ts
 *
 * Handles follow/unfollow of handicappers and fan-out notifications
 * when a handicapper publishes or updates a forecast.
 */

import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import HandicapperProfile from '@/models/HandicapperProfile';
import Notification from '@/models/Notification';
import { Types } from 'mongoose';

export async function followHandicapper(
  userId: string,
  handicapperProfileId: string,
): Promise<{ following: boolean }> {
  await dbConnect();

  const user = await User.findById(userId);
  if (!user) throw new Error('Usuario no encontrado.');

  const hid = new Types.ObjectId(handicapperProfileId);
  const alreadyFollowing = user.followedHandicappers.some((id: Types.ObjectId) => id.equals(hid));

  if (alreadyFollowing) {
    user.followedHandicappers = user.followedHandicappers.filter((id: Types.ObjectId) => !id.equals(hid));
    await user.save();
    return { following: false };
  }

  user.followedHandicappers.push(hid);
  await user.save();
  return { following: true };
}

export async function getFollowStatus(
  userId: string,
  handicapperProfileId: string,
): Promise<boolean> {
  await dbConnect();
  const user = await User.findById(userId).lean();
  if (!user) return false;
  const hid = new Types.ObjectId(handicapperProfileId);
  return (user.followedHandicappers ?? []).some((id: Types.ObjectId) => id.equals(hid));
}

/**
 * Called when a handicapper publishes or updates a forecast.
 * Sends a notification to all followers of that handicapper.
 */
export async function notifyFollowers(
  handicapperProfileId: string,
  meetingNumber: number,
  raceNumber: number,
  isUpdate: boolean,
): Promise<number> {
  await dbConnect();

  const profile = await HandicapperProfile.findById(handicapperProfileId).lean();
  if (!profile) return 0;

  const followers = await User.find({
    followedHandicappers: new Types.ObjectId(handicapperProfileId),
  }).select('_id').lean();

  if (followers.length === 0) return 0;

  const title = isUpdate
    ? `🔄 ${(profile as any).pseudonym} actualizó su pronóstico`
    : `🏇 ${(profile as any).pseudonym} publicó un pronóstico`;
  const body = `Reunión ${meetingNumber} · Carrera ${raceNumber}`;

  const notifications = followers.map(f => ({
    userId: f._id,
    type: 'followed_forecast',
    title,
    body,
    link: '/pronosticos',
    data: {
      handicapperProfileId,
      meetingNumber: String(meetingNumber),
      raceNumber: String(raceNumber),
    },
    read: false,
  }));

  await Notification.insertMany(notifications);
  return notifications.length;
}

export async function getUnreadCount(userId: string): Promise<number> {
  await dbConnect();
  return Notification.countDocuments({ userId: new Types.ObjectId(userId), read: false });
}

export async function markAllRead(userId: string): Promise<void> {
  await dbConnect();
  await Notification.updateMany(
    { userId: new Types.ObjectId(userId), read: false },
    { $set: { read: true, readAt: new Date() } },
  );
}
