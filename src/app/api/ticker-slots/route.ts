/**
 * GET /api/ticker-slots — public: returns active ticker slots (sponsors, promos)
 * POST /api/ticker-slots — admin only: create a slot
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import TickerSlot from '@/models/TickerSlot';

export async function GET() {
  try {
    await dbConnect();
    const now = new Date();
    const slots = await TickerSlot.find({
      isActive: true,
      $or: [
        { startsAt: { $exists: false } },
        { startsAt: null },
        { startsAt: { $lte: now } },
      ],
      $and: [
        {
          $or: [
            { endsAt: { $exists: false } },
            { endsAt: null },
            { endsAt: { $gte: now } },
          ],
        },
      ],
    })
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(10)
      .lean();

    // Map to TickerEntry shape
    const mapped = slots.map((s: any) => ({
      id: s._id.toString(),
      pseudonym: s.label,
      isGhost: false,
      e1: null,
      eGeneral: 0,
      totalRaces: 0,
      slotType: s.type as 'sponsor' | 'promo',
      sublabel: s.sublabel,
      badgeText: s.badgeText,
      accentColor: s.accentColor,
      logoUrl: s.logoUrl,
      actionUrl: s.actionUrl,
      actionLabel: s.actionLabel,
    }));

    return NextResponse.json({ slots: mapped });
  } catch (e) {
    return NextResponse.json({ slots: [] });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const roles: string[] = (session.user as any).roles ?? [];
  if (!roles.some(r => ['admin', 'staff'].includes(r))) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const body = await req.json();
  if (!body.label?.trim()) return NextResponse.json({ error: 'El label es requerido.' }, { status: 400 });
  if (!['sponsor', 'handicapper', 'promo'].includes(body.type)) {
    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
  }

  await dbConnect();
  const slot = await TickerSlot.create({
    type: body.type,
    label: body.label.trim(),
    sublabel: body.sublabel?.trim() || undefined,
    badgeText: body.badgeText?.trim() || undefined,
    accentColor: body.accentColor?.trim() || '#D4AF37',
    logoUrl: body.logoUrl?.trim() || undefined,
    actionUrl: body.actionUrl?.trim() || undefined,
    actionLabel: body.actionLabel?.trim() || undefined,
    isActive: body.isActive ?? true,
    startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
    endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
    sortOrder: body.sortOrder ?? 0,
  });

  return NextResponse.json({ success: true, slot });
}
