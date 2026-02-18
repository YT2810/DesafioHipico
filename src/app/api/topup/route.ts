/**
 * POST /api/topup
 * Submit a Pago Móvil top-up request.
 * Requires authenticated session with phone + legalId on profile.
 *
 * GET /api/topup?userId=  — list user's own requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import TopUpRequest from '@/models/TopUpRequest';
import User from '@/models/User';
import { GOLD_RATE } from '@/lib/constants';
import { Types } from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findById(session.user.id).lean();
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });

    const body = await req.json();
    const { referenceNumber, phone, legalId, bank, amountBs, amountUsd, paymentDate, receiptUrl } = body;

    if (!referenceNumber || !phone || !legalId || !bank || !amountBs || !amountUsd || !paymentDate) {
      return NextResponse.json({ error: 'Todos los campos son requeridos.' }, { status: 400 });
    }

    if (amountUsd < 10) {
      return NextResponse.json({ error: 'El monto mínimo es $10 USD (40 Golds).' }, { status: 400 });
    }

    // Check for duplicate reference number
    const existing = await TopUpRequest.findOne({ referenceNumber: referenceNumber.trim() });
    if (existing) {
      return NextResponse.json({ error: 'Ese número de referencia ya fue registrado.' }, { status: 409 });
    }

    const goldAmount = Math.floor((amountUsd / GOLD_RATE.usd) * GOLD_RATE.golds);

    const request = await TopUpRequest.create({
      userId: new Types.ObjectId(session.user.id),
      amountUsd,
      goldAmount,
      referenceNumber: referenceNumber.trim(),
      phone: phone.trim(),
      legalId: legalId.trim(),
      bank: bank.trim(),
      amountBs,
      paymentDate: paymentDate.trim(),
      receiptUrl: receiptUrl?.trim() || undefined,
      status: 'pending',
    });

    // Optionally save phone/legalId to user profile if not set
    const updates: Record<string, string> = {};
    if (!user.phone && phone) updates.phone = phone.trim();
    if (!user.legalId && legalId) updates.legalId = legalId.trim();
    if (Object.keys(updates).length > 0) {
      await User.findByIdAndUpdate(session.user.id, { $set: updates });
    }

    return NextResponse.json({
      success: true,
      requestId: request._id.toString(),
      goldAmount,
      status: 'pending',
      message: `Solicitud recibida. Se acreditarán ${goldAmount} Golds una vez verificado el pago.`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    await dbConnect();
    const requests = await TopUpRequest.find({ userId: new Types.ObjectId(session.user.id) })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({ requests });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
