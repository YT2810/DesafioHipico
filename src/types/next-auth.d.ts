import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      alias: string;
      roles: string[];
      balance: { golds: number; diamonds: number };
      phone?: string;
      legalId?: string;
    };
  }

  interface User {
    id?: string;
    telegramId?: string;
    roles?: string[];
    balance?: { golds: number; diamonds: number };
    alias?: string;
    phone?: string;
    legalId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    roles?: string[];
    balance?: { golds: number; diamonds: number };
    alias?: string;
    phone?: string;
    legalId?: string;
  }
}
