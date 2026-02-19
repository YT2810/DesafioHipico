/**
 * GET  /api/exchange-rate        — public, returns current rate + staleness
 * POST /api/exchange-rate        — admin only, updates the rate
 * Body: { rateVes: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import ExchangeRate from '@/models/ExchangeRate';
import { Types } from 'mongoose';

const STALE_HOURS = 24;

export async function GET() {
  try {
    await dbConnect();
    const rate = await ExchangeRate.findOne({ key: 'bcv' }).lean() as any;

    if (!rate) {
      return NextResponse.json({ rate: null, stale: true, message: 'Tasa no configurada' });
    }

    const ageMs = Date.now() - new Date(rate.updatedAt).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    const stale = ageHours > STALE_HOURS;

    return NextResponse.json({
      rateVes:    rate.rateVes,
      updatedAt:  rate.updatedAt,
      ageHours:   Math.round(ageHours * 10) / 10,
      stale,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    const roles: string[] = (session.user as any).roles ?? [];
    if (!roles.some(r => ['admin', 'staff'].includes(r))) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { rateVes } = await req.json();
    if (!rateVes || isNaN(Number(rateVes)) || Number(rateVes) <= 0) {
      return NextResponse.json({ error: 'Tasa inválida.' }, { status: 400 });
    }

    await dbConnect();
    const rate = await ExchangeRate.findOneAndUpdate(
      { key: 'bcv' },
      { $set: { rateVes: Number(rateVes), updatedBy: new Types.ObjectId(session.user.id) } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, rateVes: rate.rateVes, updatedAt: rate.updatedAt });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
