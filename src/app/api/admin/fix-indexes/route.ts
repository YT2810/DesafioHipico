/**
 * ONE-TIME migration route — DELETE this file after running once.
 * GET /api/admin/fix-indexes
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secure = req.nextUrl.protocol === 'https:';
  const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
  const roles: string[] = (token?.roles as string[]) ?? [];
  if (!token || !roles.includes('admin')) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  await dbConnect();
  const db = mongoose.connection.db!;
  const col = db.collection('handicapperprofiles');
  const indexes = await col.indexes();
  const log: string[] = [];

  log.push('Indexes found: ' + indexes.map((i: any) => `${i.name}(sparse=${i.sparse})`).join(', '));

  const badIndex = indexes.find((i: any) => i.name === 'userId_1' && !i.sparse);
  if (badIndex) {
    await col.dropIndex('userId_1');
    log.push('✓ Dropped non-sparse userId_1');
  } else {
    log.push('userId_1 not found or already sparse — nothing dropped');
  }

  // Also check pseudonym unique index — ghost profiles with duplicate pseudonyms will fail
  const pseudonymIdx = indexes.find((i: any) => i.name === 'pseudonym_1' && i.unique);
  if (pseudonymIdx) {
    log.push('WARNING: pseudonym_1 is unique — duplicate ghost names will fail');
  }

  return NextResponse.json({ ok: true, log });
}
