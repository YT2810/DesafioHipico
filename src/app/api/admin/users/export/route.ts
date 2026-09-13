import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import TopUpRequest from '@/models/TopUpRequest';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const roles: string[] = (session?.user as any)?.roles ?? [];
  if (!session?.user?.id || !roles.includes('admin')) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  await dbConnect();

  const [users, buyers] = await Promise.all([
    User.find({ email: { $exists: true, $nin: [null, ''] } })
      .select('email alias googleId telegramId createdAt lastLoginDate')
      .sort({ createdAt: -1 })
      .lean(),
    TopUpRequest.distinct('userId', { status: 'approved' }),
  ]);

  const buyerSet = new Set(buyers.map((id: any) => String(id)));

  const rows = [
    ['email', 'alias', 'proveedor', 'registrado', 'ultimo_login', 'comprador'],
    ...users.map((u: any) => [
      u.email,
      u.alias ?? '',
      u.googleId ? 'google' : 'magic_link',
      u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : '',
      u.lastLoginDate ?? '',
      buyerSet.has(String(u._id)) ? 'si' : 'no',
    ]),
  ];

  const csv = rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="usuarios_${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
