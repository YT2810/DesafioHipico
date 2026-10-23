/**
 * GET /api/admin/email-marketing/export?list=active|all_valid|vip5y6_week|vip5y6_all|suppressed
 * Downloads a Resend-compatible CSV of the selected audience.
 * Columns: email,first_name,unsubscribed — opt-outs are exported flagged
 * `true` so a Resend import (upsert) also propagates our unsubscribes there.
 * Junk emails and the bounce/suppression list are excluded from marketing lists.
 * `suppressed` exports the suppression list itself (for auditing/Resend cleanup).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import MarketingEvent from '@/models/MarketingEvent';
import { getSiteConfig } from '@/models/SiteConfig';
import { getCurrentWeekMondayStartUTC } from '@/services/forecastAccessService';
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ListKey = 'active' | 'all_valid' | 'vip5y6_week' | 'vip5y6_all' | 'suppressed';
const VALID_LISTS: ListKey[] = ['active', 'all_valid', 'vip5y6_week', 'vip5y6_all', 'suppressed'];

function isJunkEmail(email: string): boolean {
  const e = email.toLowerCase().trim();
  if (!EMAIL_REGEX.test(e)) return true;
  const junkDomains = ['example.com', 'test.com', 'mailinator.com', 'yopmail.com', 'tempmail.com', '10minutemail.com'];
  return junkDomains.includes(e.split('@')[1] ?? '');
}

function csvCell(v: string): string {
  const s = v.replace(/"/g, '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const roles: string[] = (session?.user as any)?.roles ?? [];
  if (!roles.includes('admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const rawList = req.nextUrl.searchParams.get('list') ?? 'active';
  const list: ListKey = (VALID_LISTS as string[]).includes(rawList) ? (rawList as ListKey) : 'active';

  await dbConnect();
  const suppressed = await getSiteConfig<string[]>('emailSuppressedList', []);
  const suppressedSet = new Set((suppressed ?? []).map(s => s.toLowerCase().trim()));

  const rows: string[] = ['email,first_name,unsubscribed'];
  let included = 0;

  if (list === 'suppressed') {
    // Export the suppression list itself — importable into Resend to mark them
    // unsubscribed there too, or just for auditing.
    for (const em of [...suppressedSet].sort()) {
      rows.push(`${csvCell(em)},,true`);
      included++;
    }
  } else {
    let userFilter: Record<string, any> = { email: { $exists: true, $ne: '' } };

    if (list === 'vip5y6_week' || list === 'vip5y6_all') {
      // Users identified by clicks on the 👑 VIP 5y6 button
      const match: Record<string, any> = { event: 'vip5y6_open', userId: { $ne: null } };
      if (list === 'vip5y6_week') match.weekStart = getCurrentWeekMondayStartUTC();
      const userIds = (await MarketingEvent.distinct('userId', match)) as Types.ObjectId[];
      if (userIds.length === 0) {
        return new NextResponse(rows.join('\n'), {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="desafiohipico-${list}-empty.csv"`,
            'X-Exported-Count': '0',
          },
        });
      }
      userFilter._id = { $in: userIds };
    }

    const users = (await User.find(userFilter)
      .select('email alias unsubscribed balance lastLoginDate createdAt')
      .lean()) as any[];

    const cutoff60d = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const cutoff30dMs = Date.now() - 30 * 24 * 3600 * 1000;

    for (const u of users) {
      const em = (u.email ?? '').toLowerCase().trim();
      if (isJunkEmail(em) || suppressedSet.has(em)) continue;
      if (list === 'active') {
        const isRecentLogin = u.lastLoginDate && u.lastLoginDate >= cutoff60d;
        const hasGolds = (u.balance?.golds ?? 0) > 0;
        const isNewUser = u.createdAt && new Date(u.createdAt).getTime() >= cutoff30dMs;
        if (!isRecentLogin && !hasGolds && !isNewUser) continue;
      }
      const firstName = (u.alias ?? '').trim().split(/\s+/)[0] || 'Hípico';
      rows.push(`${csvCell(em)},${csvCell(firstName)},${u.unsubscribed === true ? 'true' : 'false'}`);
      included++;
    }
  }

  const filename = `desafiohipico-${list}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Exported-Count': String(included),
    },
  });
}
