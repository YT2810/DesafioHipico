import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PROTECTED_ROUTES: Record<string, string[]> = {
  '/admin':      ['admin', 'staff'],
  '/handicapper': ['handicapper', 'admin'],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  for (const [prefix, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      const secure = req.nextUrl.protocol === 'https:';
      const cookieName = secure
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token';

      const token = await getToken({
        req,
        secret: process.env.AUTH_SECRET,
        cookieName,
      });

      if (!token) {
        const signInUrl = new URL('/auth/signin', req.url);
        signInUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(signInUrl);
      }

      const userRoles: string[] = (token.roles as string[]) ?? [];
      if (!allowedRoles.some(r => userRoles.includes(r))) {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/handicapper/:path*'],
};
