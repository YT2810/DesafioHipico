/**
 * GET /api/auth/magic/verify?token=xxx
 * Validates the magic token (existence + expiry) WITHOUT consuming it, then
 * redirects to /auth/magic-complete which performs the actual signIn.
 * Consumption happens atomically inside the magic-verified authorize() call —
 * a plain GET here must never burn the token (link-preview bots issue GETs).
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MagicToken from '@/models/MagicToken';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const baseUrl = process.env.AUTH_URL ?? 'http://localhost:3000';

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/auth/error?error=Verification`);
  }

  try {
    await dbConnect();

    const record = await MagicToken.findOne({ token, used: false });

    if (!record) {
      return NextResponse.redirect(`${baseUrl}/auth/error?error=Verification`);
    }

    if (record.expiresAt < new Date()) {
      await MagicToken.updateOne({ _id: record._id }, { $set: { used: true } });
      return NextResponse.redirect(`${baseUrl}/auth/error?error=Verification`);
    }

    // Do NOT consume the token here — link-preview bots (WhatsApp, email scanners)
    // issue GETs and would burn the single-use token before the real user opens it.
    // The token is consumed atomically inside the magic-verified authorize() call.
    const callbackUrl = record.callbackUrl ?? '/';
    const redirectUrl = `${baseUrl}/auth/magic-complete?token=${encodeURIComponent(token)}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
    return NextResponse.redirect(redirectUrl);

  } catch (err) {
    console.error('[magic/verify]', err);
    return NextResponse.redirect(`${baseUrl}/auth/error?error=Default`);
  }
}
