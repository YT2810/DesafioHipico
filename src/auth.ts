import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import MagicToken from '@/models/MagicToken';
import type { NextAuthConfig } from 'next-auth';

const ADMIN_EMAILS = ['yolfry@gmail.com'];

export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt' },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  providers: [
    // ── 1. Google OAuth ────────────────────────────────────────────────────
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? '',
      allowDangerousEmailAccountLinking: true,
    }),

    // ── 2. Magic Link — verified token (token already validated by /api/auth/magic/verify) ──
    Credentials({
      id: 'magic-verified',
      name: 'Magic Link',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const email = (credentials.email as string).toLowerCase().trim();
        await dbConnect();
        const user = await User.findOne({ email }).lean() as any;
        if (!user) return null;
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.alias,
          roles: user.roles,
          balance: user.balance,
        };
      },
    }),

    // ── 3. Telegram Mini App (initData verification) ───────────────────────
    Credentials({
      id: 'telegram',
      name: 'Telegram',
      credentials: {
        initData: { label: 'Telegram initData', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.initData) return null;
        const telegramUser = verifyTelegramInitData(credentials.initData as string);
        if (!telegramUser) return null;

        await dbConnect();
        const user = await User.findOneAndUpdate(
          { telegramId: String(telegramUser.id) },
          {
            $set: {
              telegramId: String(telegramUser.id),
              alias: telegramUser.username ?? telegramUser.first_name ?? `tg_${telegramUser.id}`,
            },
            $setOnInsert: {
              roles: ['customer'],
              balance: { golds: 0, diamonds: 0 },
              meetingConsumptions: [],
              followedHandicappers: [],
            },
          },
          { upsert: true, new: true }
        );

        return {
          id: user._id.toString(),
          name: user.alias,
          telegramId: user.telegramId,
          roles: user.roles,
          balance: user.balance,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' || account?.provider === 'magic-verified') {
        await dbConnect();
        const email = (user.email ?? '').toLowerCase();

        // Auto-assign admin role for known admin emails
        const extraRoles = ADMIN_EMAILS.includes(email) ? ['admin', 'customer'] : ['customer'];

        await User.findOneAndUpdate(
          { $or: [{ email }, { googleId: account.providerAccountId }] },
          {
            $set: {
              email,
              ...(account.provider === 'google' && { googleId: account.providerAccountId }),
            },
            $setOnInsert: {
              alias: user.name ?? email.split('@')[0],
              roles: extraRoles,
              balance: { golds: 0, diamonds: 0 },
              meetingConsumptions: [],
              followedHandicappers: [],
            },
          },
          { upsert: true, new: true }
        );

        // Ensure admin emails always have admin role (even if user pre-existed)
        if (ADMIN_EMAILS.includes(email)) {
          await User.updateOne({ email }, { $addToSet: { roles: 'admin' } });
        }
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        await dbConnect();
        const dbUser = await User.findOne({
          $or: [
            ...(user.email ? [{ email: user.email.toLowerCase() }] : []),
            ...((user as any).telegramId ? [{ telegramId: (user as any).telegramId }] : []),
          ],
        }).lean() as any;

        if (dbUser) {
          token.userId    = dbUser._id.toString();
          token.roles     = dbUser.roles;
          token.balance   = dbUser.balance;
          token.alias     = dbUser.alias;
          token.phone     = dbUser.phone;
          token.legalId   = dbUser.legalId;
          token.fullName  = dbUser.fullName;
          token.identityDocument = dbUser.identityDocument;
          token.phoneNumber      = dbUser.phoneNumber;
          token.billingComplete  = !!(dbUser.fullName && dbUser.identityDocument && dbUser.phoneNumber);
        }
      }

      if (trigger === 'update') {
        if (session?.balance)  token.balance  = session.balance;
        if (session?.alias)    token.alias    = session.alias;
        if (session?.billing)  {
          token.fullName         = session.billing.fullName;
          token.identityDocument = session.billing.identityDocument;
          token.phoneNumber      = session.billing.phoneNumber;
          token.billingComplete  = !!(session.billing.fullName && session.billing.identityDocument && session.billing.phoneNumber);
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id               = token.userId as string;
      session.user.roles            = token.roles as string[];
      session.user.balance          = token.balance as { golds: number; diamonds: number };
      session.user.alias            = token.alias as string;
      session.user.phone            = token.phone as string | undefined;
      session.user.legalId          = token.legalId as string | undefined;
      session.user.fullName         = token.fullName as string | undefined;
      session.user.identityDocument = token.identityDocument as string | undefined;
      session.user.phoneNumber      = token.phoneNumber as string | undefined;
      session.user.billingComplete  = token.billingComplete as boolean | undefined;
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// ─── Telegram initData verification ──────────────────────────────────────────

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

function verifyTelegramInitData(initData: string): TelegramUser | null {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return null;

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const crypto = require('crypto');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (expectedHash !== hash) return null;

    const userStr = params.get('user');
    if (!userStr) return null;
    return JSON.parse(userStr) as TelegramUser;
  } catch {
    return null;
  }
}
