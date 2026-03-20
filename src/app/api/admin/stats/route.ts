/**
 * GET /api/admin/stats
 * Returns dashboard metrics for the admin panel.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    const roles: string[] = (session?.user as any)?.roles ?? [];
    if (!session?.user?.id || !roles.includes('admin')) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    await dbConnect();

    const now = new Date();
    const days7 = new Date(now);
    days7.setDate(days7.getDate() - 6);
    days7.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      byRole,
      goldStats,
      registrationsByDay,
      loginsByDay,
      recentUsers,
    ] = await Promise.all([
      // Total users
      User.countDocuments(),

      // Count by role
      User.aggregate([
        { $unwind: '$roles' },
        { $group: { _id: '$roles', count: { $sum: 1 } } },
      ]),

      // Gold stats: total in circulation, users with gold > 0
      User.aggregate([
        {
          $group: {
            _id: null,
            totalGold: { $sum: '$balance.golds' },
            usersWithGold: { $sum: { $cond: [{ $gt: ['$balance.golds', 0] }, 1, 0] } },
            usersNoGold: { $sum: { $cond: [{ $lte: ['$balance.golds', 0] }, 1, 0] } },
            avgGold: { $avg: '$balance.golds' },
          },
        },
      ]),

      // Registrations per day for last 7 days
      User.aggregate([
        { $match: { createdAt: { $gte: days7 } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Logins per day for last 7 days (lastLoginDate)
      User.aggregate([
        {
          $match: {
            lastLoginDate: {
              $gte: days7.toISOString().slice(0, 10),
            },
          },
        },
        {
          $group: {
            _id: '$lastLoginDate',
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 10 most recent users
      User.find()
        .select('email alias roles balance createdAt lastLoginDate')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    // Build last 7 days array
    const last7: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      last7.push(d.toISOString().slice(0, 10));
    }

    const regMap = Object.fromEntries(registrationsByDay.map((r: any) => [r._id, r.count]));
    const loginMap = Object.fromEntries(loginsByDay.map((r: any) => [r._id, r.count]));

    const dailyStats = last7.map(date => ({
      date,
      registrations: regMap[date] ?? 0,
      logins: loginMap[date] ?? 0,
    }));

    const roleMap = Object.fromEntries(byRole.map((r: any) => [r._id, r.count]));
    const gold = goldStats[0] ?? { totalGold: 0, usersWithGold: 0, usersNoGold: 0, avgGold: 0 };

    return NextResponse.json({
      totalUsers,
      roles: {
        customer:    roleMap['customer']    ?? 0,
        handicapper: roleMap['handicapper'] ?? 0,
        staff:       roleMap['staff']       ?? 0,
        admin:       roleMap['admin']       ?? 0,
      },
      gold: {
        total:        Math.round(gold.totalGold ?? 0),
        usersWithGold: gold.usersWithGold ?? 0,
        usersNoGold:   gold.usersNoGold   ?? 0,
        avg:          Math.round((gold.avgGold ?? 0) * 10) / 10,
      },
      dailyStats,
      recentUsers,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
