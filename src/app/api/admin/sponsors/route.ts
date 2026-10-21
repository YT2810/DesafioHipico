/**
 * GET   /api/admin/sponsors       → list all campaigns (with 30d totals)
 * POST  /api/admin/sponsors       → create a campaign
 * PATCH /api/admin/sponsors       → update a campaign (body must include slug)
 * Admin/staff only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import SponsorCampaign from '@/models/SponsorCampaign';
import AdDailyStat from '@/models/AdDailyStat';

export const dynamic = 'force-dynamic';

function isPrivileged(session: any) {
  const roles: string[] = session?.user?.roles ?? [];
  return roles.includes('admin') || roles.includes('staff');
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !isPrivileged(session)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  await dbConnect();

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceKey = since.toISOString().slice(0, 10);

  const [campaigns, stats] = await Promise.all([
    SponsorCampaign.find().sort({ createdAt: -1 }).lean(),
    AdDailyStat.aggregate([
      { $match: { date: { $gte: sinceKey } } },
      {
        $group: {
          _id: { campaign: '$campaignSlug', slot: '$slot' },
          impressions: { $sum: '$impressions' },
          clicks: { $sum: '$clicks' },
        },
      },
    ]),
  ]);

  const statMap: Record<string, any> = {};
  for (const s of stats as any[]) {
    const k = s._id.campaign;
    statMap[k] = statMap[k] ?? { impressions: 0, clicks: 0, bySlot: {} };
    statMap[k].impressions += s.impressions;
    statMap[k].clicks += s.clicks;
    statMap[k].bySlot[s._id.slot] = {
      impressions: s.impressions,
      clicks: s.clicks,
      ctr: s.impressions > 0 ? Math.round((s.clicks / s.impressions) * 1000) / 10 : 0,
    };
  }

  return NextResponse.json({
    campaigns: campaigns.map((c: any) => ({
      ...c,
      stats30d: statMap[c.slug] ?? { impressions: 0, clicks: 0, bySlot: {} },
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !isPrivileged(session)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.slug || !body?.brand || !body?.targetUrl || !body?.creative?.title) {
    return NextResponse.json(
      { error: 'Faltan campos: slug, brand, targetUrl, creative.title' },
      { status: 400 }
    );
  }
  if (!/^https?:\/\//.test(body.targetUrl)) {
    return NextResponse.json({ error: 'targetUrl debe ser URL http(s) válida.' }, { status: 400 });
  }
  await dbConnect();
  const campaign = await SponsorCampaign.findOneAndUpdate(
    { slug: String(body.slug).toLowerCase().trim() },
    {
      $set: {
        brand: body.brand,
        targetUrl: body.targetUrl,
        slots: Array.isArray(body.slots) ? body.slots : [],
        active: body.active !== false,
        creative: {
          badgeText: body.creative.badgeText ?? 'Publicidad',
          title: body.creative.title,
          subtitle: body.creative.subtitle ?? '',
          ctaText: body.creative.ctaText ?? 'Ver más',
          logoUrl: body.creative.logoUrl ?? '',
          accentColor: body.creative.accentColor ?? '#D4AF37',
        },
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
        notes: body.notes ?? '',
      },
    },
    { upsert: true, new: true }
  );
  return NextResponse.json({ ok: true, campaign });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !isPrivileged(session)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.slug) {
    return NextResponse.json({ error: 'Falta slug.' }, { status: 400 });
  }
  const allowed = ['active', 'targetUrl', 'slots', 'brand', 'notes', 'startsAt', 'endsAt', 'creative'];
  const $set: Record<string, any> = {};
  for (const k of allowed) {
    if (body[k] !== undefined) $set[k] = body[k];
  }
  await dbConnect();
  const campaign = await SponsorCampaign.findOneAndUpdate(
    { slug: String(body.slug).toLowerCase().trim() },
    { $set },
    { new: true }
  );
  if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada.' }, { status: 404 });
  return NextResponse.json({ ok: true, campaign });
}
