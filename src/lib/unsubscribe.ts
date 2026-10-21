import crypto from 'crypto';

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.desafiohipico.com';

function secret(): string {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'dh-fallback-secret';
}

export function unsubscribeToken(email: string): string {
  return crypto
    .createHmac('sha256', secret())
    .update(email.toLowerCase().trim())
    .digest('hex')
    .slice(0, 24);
}

export function buildUnsubscribeUrl(email: string): string {
  const e = encodeURIComponent(email.toLowerCase().trim());
  return `${BASE}/api/unsubscribe?e=${e}&t=${unsubscribeToken(email)}`;
}

export function isValidUnsubscribeToken(email: string, token: string): boolean {
  return unsubscribeToken(email) === token;
}
