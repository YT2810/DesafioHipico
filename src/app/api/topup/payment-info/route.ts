/**
 * GET /api/topup/payment-info
 * Returns payment destination data (bank accounts) for Pago Móvil.
 * Requires authentication — data is NEVER exposed in client bundle.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secure = req.nextUrl.protocol === 'https:';
  const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
  if (!token?.sub) {
    return NextResponse.json(
      { error: 'Debes iniciar sesión para ver los datos de pago.', unauthenticated: true },
      { status: 401 }
    );
  }

  const banks = [
    {
      priority: 1,
      bankName: process.env.PAYMENT_BANK_1_NAME ?? '',
      phone: process.env.PAYMENT_BANK_1_PHONE ?? '',
      legalId: process.env.PAYMENT_BANK_1_CEDULA ?? '',
      holderName: process.env.PAYMENT_BANK_1_HOLDER ?? '',
    },
    {
      priority: 2,
      bankName: process.env.PAYMENT_BANK_2_NAME ?? '',
      phone: process.env.PAYMENT_BANK_2_PHONE ?? '',
      legalId: process.env.PAYMENT_BANK_2_CEDULA ?? '',
      holderName: process.env.PAYMENT_BANK_2_HOLDER ?? '',
    },
  ].filter(b => b.bankName && b.phone);

  return NextResponse.json({ banks });
}
