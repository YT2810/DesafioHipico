import { auth } from '@/auth';
import { NextResponse } from 'next/server';

const PROTECTED_ROUTES: Record<string, string[]> = {
  '/admin': ['admin', 'staff'],
  '/handicapper': ['handicapper', 'admin'],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  for (const [prefix, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      if (!session) {
        const signInUrl = new URL('/auth/signin', req.url);
        signInUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(signInUrl);
      }
      const userRoles: string[] = (session.user as any)?.roles ?? [];
      const hasRole = allowedRoles.some(r => userRoles.includes(r));
      if (!hasRole) {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*', '/handicapper/:path*'],
};
