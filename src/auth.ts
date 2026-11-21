import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import MagicToken from '@/models/MagicToken';
import SiteConfig, { getSiteConfig } from '@/models/SiteConfig';
import GoldTransaction from '@/models/GoldTransaction';
import { hasActiveNationalPass } from '@/services/forecastAccessService';
import type { NextAuthConfig } from 'next-auth';

const ADMIN_EMAILS = ['yolfry@gmail.com'];
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function populateToken(token: any, dbUser: any) {
  token.userId            = dbUser._id.toString();
  token.roles             = dbUser.roles;
  token.balance           = dbUser.balance;
  token.alias             = dbUser.alias;
  token.phone             = dbUser.phone;
  token.legalId           = dbUser.legalId;
  token.fullName          = dbUser.fullName;
  token.identityDocument  = dbUser.identityDocument;
  token.phoneNumber       = dbUser.phoneNumber;
  token.billingComplete   = !!(dbUser.fullName && dbUser.identityDocument);
}

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

    // ── 2. Magic Link — token consumed atomically here, NOT in the GET verify ──
    //    (a GET cannot consume it: link-preview bots would burn the token)
    Credentials({
      id: 'magic-verified',
      name: 'Magic Link',
      credentials: {
        token: { label: 'Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.token) return null;
        await dbConnect();
        // findOneAndUpdate is atomic: only the first signIn with this token succeeds
        const record = await MagicToken.findOneAndUpdate(
          { token: String(credentials.token), used: false, expiresAt: { $gt: new Date() } },
          { $set: { used: true } },
          { new: true }
        ).lean() as any;
        if (!record) return null;
        const user = await User.findOne({ email: record.email }).lean() as any;
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
        void SiteConfig; // ensure model registered

        const user = await User.findOneAndUpdate(
          { telegramId: String(telegramUser.id) },
          {
            $set: {
              telegramId: String(telegramUser.id),
              alias: telegramUser.username ?? telegramUser.first_name ?? `tg_${telegramUser.id}`,
              lastLoginDate: new Date().toISOString().slice(0, 10),
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

        void SiteConfig; // ensure model registered

        await User.findOneAndUpdate(
          { $or: [{ email }, { googleId: account.providerAccountId }] },
          {
            $set: {
              email,
              ...(account.provider === 'google' && { googleId: account.providerAccountId }),
              lastLoginDate: new Date().toISOString().slice(0, 10),
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
        try {
          await dbConnect();
          const or: any[] = [
            ...(user.email ? [{ email: user.email.toLowerCase() }] : []),
            ...((user as any).telegramId ? [{ telegramId: (user as any).telegramId }] : []),
          ];

          if (or.length > 0) {
            const dbUser = await User.findOne({ $or: or }).lean() as any;
            if (dbUser) populateToken(token, dbUser);
          }
        } catch {
          // DB timeout during login — recovery block below retries on next request
        }
      }

      // Recover userId when the login-time DB lookup failed (cold start timeout)
      // or when the provider returned no email/telegramId. token.sub holds the
      // user id returned by authorize(); token.email covers Google users.
      if (!token.userId) {
        try {
          await dbConnect();
          const or: any[] = [];
          if (token.email) or.push({ email: String(token.email).toLowerCase() });
          if (token.sub && OBJECT_ID_RE.test(String(token.sub))) or.push({ _id: token.sub });
          if (or.length > 0) {
            const dbUser = await User.findOne({ $or: or }).lean() as any;
            if (dbUser) populateToken(token, dbUser);
          }
        } catch {
          // still no DB — keep token as-is, request will 401 until it recovers
        }
      }

      if (trigger === 'update') {
        if (session?.balance)  token.balance  = session.balance;
        if (session?.alias)    token.alias    = session.alias;
        if (session?.billing)  {
          token.fullName         = session.billing.fullName;
          token.identityDocument = session.billing.identityDocument;
          token.phoneNumber      = session.billing.phoneNumber;
          token.billingComplete  = !!(session.billing.fullName && session.billing.identityDocument);
        }
      }

      // Always sync balance from DB so admin Gold assignments are reflected immediately
      if (!user && token.userId) {
        try {
          await dbConnect();
          const [fresh, recentPurchase, hasPass] = await Promise.all([
            User.findById(token.userId).select('balance').lean() as any,
            GoldTransaction.findOne({
              userId: token.userId,
              type: 'purchase',
              createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            }).select('_id').lean(),
            hasActiveNationalPass(token.userId as string),
          ]);
          if (fresh?.balance) token.balance = fresh.balance;
          token.hasPurchasedThisWeek = !!recentPurchase;
          token.hasActivePass = hasPass;
        } catch {
          // silent — keep existing token value
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id               = (token.userId as string) ?? (OBJECT_ID_RE.test(String(token.sub ?? '')) ? (token.sub as string) : '');
      session.user.roles            = token.roles as string[];
      session.user.balance          = token.balance as { golds: number; diamonds: number };
      session.user.alias            = token.alias as string;
      session.user.phone            = token.phone as string | undefined;
      session.user.legalId          = token.legalId as string | undefined;
      session.user.fullName         = token.fullName as string | undefined;
      session.user.identityDocument = token.identityDocument as string | undefined;
      session.user.phoneNumber      = token.phoneNumber as string | undefined;
      session.user.billingComplete      = token.billingComplete as boolean | undefined;
      session.user.hasPurchasedThisWeek = token.hasPurchasedThisWeek as boolean | undefined;
      session.user.hasActivePass        = token.hasActivePass as boolean | undefined;
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
