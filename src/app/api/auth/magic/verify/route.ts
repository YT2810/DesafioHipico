/**
 * GET /api/auth/magic/verify?token=xxx
 * Validates the magic token, upserts the user, signs them in via NextAuth signIn,
 * then redirects to callbackUrl.
 */

import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/auth';
import dbConnect from '@/lib/mongodb';
import MagicToken from '@/models/MagicToken';
import User from '@/models/User';

const ADMIN_EMAILS = ['yolfry@gmail.com'];

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

    // Mark token as used
    await MagicToken.updateOne({ _id: record._id }, { $set: { used: true } });

    const email = record.email;
    const isAdmin = ADMIN_EMAILS.includes(email);

    // Upsert user
    await User.findOneAndUpdate(
      { email },
      {
        $set:         { email, alias: email.split('@')[0] },
        $setOnInsert: {
          roles: isAdmin ? ['admin', 'customer'] : ['customer'],
          balance: { golds: 0, diamonds: 0 },
          meetingConsumptions: [],
          followedHandicappers: [],
        },
      },
      { upsert: true, new: true }
    );

    // Ensure admin always has admin role
    if (isAdmin) {
      await User.updateOne({ email }, { $addToSet: { roles: 'admin' } });
    }

    // Sign in via NextAuth credentials (telegram provider reused as 'magic' here)
    // We use a redirect-based approach: sign in with the magic-verified email
    // by calling the credentials provider we already have, passing the verified email.
    // Simplest: redirect to a special page that calls signIn('credentials', {verifiedEmail})
    const callbackUrl = record.callbackUrl ?? '/';
    const redirectUrl = `${baseUrl}/auth/magic-complete?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
    return NextResponse.redirect(redirectUrl);

  } catch (err) {
    console.error('[magic/verify]', err);
    return NextResponse.redirect(`${baseUrl}/auth/error?error=Default`);
  }
}
