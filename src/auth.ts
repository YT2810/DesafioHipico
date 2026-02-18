import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Nodemailer from 'next-auth/providers/nodemailer';
import Credentials from 'next-auth/providers/credentials';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import type { NextAuthConfig } from 'next-auth';

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
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      allowDangerousEmailAccountLinking: true,
    }),

    // ── 2. Magic Link via Email ────────────────────────────────────────────
    Nodemailer({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM ?? 'noreply@desafiohipico.com',
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
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' || account?.provider === 'nodemailer') {
        await dbConnect();
        const email = user.email ?? '';

        await User.findOneAndUpdate(
          { $or: [{ email }, { googleId: account.providerAccountId }] },
          {
            $set: {
              email,
              alias: user.name ?? email.split('@')[0],
              ...(account.provider === 'google' && { googleId: account.providerAccountId }),
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
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        // First sign-in — enrich token from DB
        await dbConnect();
        const dbUser = await User.findOne({
          $or: [
            { email: user.email ?? '' },
            { telegramId: (user as any).telegramId ?? '' },
          ],
        }).lean();

        if (dbUser) {
          token.userId = dbUser._id.toString();
          token.roles = dbUser.roles;
          token.balance = dbUser.balance;
          token.alias = dbUser.alias;
          token.phone = dbUser.phone;
          token.legalId = dbUser.legalId;
        }
      }

      if (trigger === 'update' && session?.balance) {
        token.balance = session.balance;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.roles = token.roles as string[];
      session.user.balance = token.balance as { golds: number; diamonds: number };
      session.user.alias = token.alias as string;
      session.user.phone = token.phone as string | undefined;
      session.user.legalId = token.legalId as string | undefined;
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
