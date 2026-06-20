/**
 * GET /api/admin/stats
 * Returns dashboard metrics for the admin panel.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import GoldTransaction from '@/models/GoldTransaction';
import TopUpRequest from '@/models/TopUpRequest';
import Meeting from '@/models/Meeting';
import Forecast from '@/models/Forecast';

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
    const days30 = new Date(now.getTime() - 30 * 86400000);

    const [
      totalUsers,
      byRole,
      goldStats,
      registrationsByDay,
      loginsByDay,
      recentUsers,
      txStats,
      txByType,
      topupStats,
      topupPendingCount,
      meetingCount,
      forecastCount,
    ] = await Promise.all([
      User.countDocuments(),

      User.aggregate([
        { $unwind: '$roles' },
        { $group: { _id: '$roles', count: { $sum: 1 } } },
      ]),

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

      User.aggregate([
        {
          $match: {
            lastLoginDate: { $gte: days7.toISOString().slice(0, 10) },
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

      User.find()
        .select('email alias roles balance createdAt lastLoginDate')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      GoldTransaction.aggregate([
        { $match: { createdAt: { $gte: days30 } } },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: { $cond: [{ $lt: ['$amount', 0] }, '$amount', 0] } },
            totalIncome: { $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] } },
            count: { $sum: 1 },
          },
        },
      ]),

      GoldTransaction.aggregate([
        { $match: { createdAt: { $gte: days30 } } },
        { $group: { _id: '$type', count: { $sum: 1 }, volume: { $sum: '$amount' } } },
        { $sort: { count: -1 } },
      ]),

      TopUpRequest.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            usd: { $sum: '$amountUsd' },
            gold: { $sum: '$goldAmount' },
          },
        },
      ]),

      TopUpRequest.countDocuments({ status: 'pending' }),

      Meeting.countDocuments(),

      Forecast.countDocuments(),
    ]);

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
    const tx = txStats[0] ?? { totalSpent: 0, totalIncome: 0, count: 0 };
    const topupMap = Object.fromEntries(topupStats.map((t: any) => [t._id, { count: t.count, usd: t.usd, gold: t.gold }]));

    return NextResponse.json({
      totalUsers,
      roles: {
        customer: roleMap['customer'] ?? 0,
        handicapper: roleMap['handicapper'] ?? 0,
        staff: roleMap['staff'] ?? 0,
        admin: roleMap['admin'] ?? 0,
      },
      gold: {
        total: Math.round(gold.totalGold ?? 0),
        usersWithGold: gold.usersWithGold ?? 0,
        usersNoGold: gold.usersNoGold ?? 0,
        avg: Math.round((gold.avgGold ?? 0) * 10) / 10,
      },
      dailyStats,
      recentUsers,
      tokenomics: {
        txVolume30d: {
          spent: Math.abs(Math.round(tx.totalSpent ?? 0)),
          income: Math.round(tx.totalIncome ?? 0),
          count: tx.count ?? 0,
        },
        txByType: txByType.map((t: any) => ({ type: t._id, count: t.count, volume: Math.round(t.volume) })),
        topups: {
          pending: topupPendingCount,
          approved: topupMap['approved'] ?? { count: 0, usd: 0, gold: 0 },
          rejected: topupMap['rejected'] ?? { count: 0, usd: 0, gold: 0 },
          total: { count: 0, usd: 0, gold: 0 },
        },
        meetings: meetingCount,
        forecasts: forecastCount,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
