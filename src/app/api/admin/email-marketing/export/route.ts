/**
 * GET /api/admin/email-marketing/export?list=active|all_valid
 * Downloads a Resend-compatible CSV of the selected audience.
 * Columns: email,first_name,unsubscribed — opt-outs are exported flagged
 * `true` so a Resend import (upsert) also propagates our unsubscribes there.
 * Junk emails and the bounce/suppression list are excluded entirely.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getSiteConfig } from '@/models/SiteConfig';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const list = req.nextUrl.searchParams.get('list') === 'all_valid' ? 'all_valid' : 'active';

  await dbConnect();
  const suppressed = await getSiteConfig<string[]>('emailSuppressedList', []);
  const suppressedSet = new Set((suppressed ?? []).map(s => s.toLowerCase().trim()));

  const allUsers = (await User.find({ email: { $exists: true, $ne: '' } })
    .select('email alias unsubscribed balance lastLoginDate createdAt')
    .lean()) as any[];

  const cutoff60d = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const cutoff30dMs = Date.now() - 30 * 24 * 3600 * 1000;

  const rows: string[] = ['email,first_name,unsubscribed'];
  let included = 0;

  for (const u of allUsers) {
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

  const filename = `desafiohipico-${list}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Exported-Count': String(included),
    },
  });
}
