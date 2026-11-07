/**
 * GET /api/admin/users/[id]/vista
 * Vista de solo lectura de lo que el usuario vería: estado del pase, balance,
 * historial de recargas, notificaciones recibidas y consumo de carreras.
 *
 * SEGURIDAD: solo rol 'admin' (ni staff) — expone datos privados del usuario.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import TopUpRequest from '@/models/TopUpRequest';
import Notification from '@/models/Notification';
import { Types } from 'mongoose';
import { getPassInfoForUser } from '@/services/passService';
import { getLiveTopUpPackages, resolveTopUpPackageIdSync } from '@/services/topupService';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const roles: string[] = (session?.user as any)?.roles ?? [];
    if (!session?.user?.id || !roles.includes('admin')) {
      return NextResponse.json({ error: 'No autorizado. Solo el administrador puede ver la vista del usuario.' }, { status: 403 });
    }

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }
    const userId = new Types.ObjectId(id);

    await dbConnect();

    const user = await User.findById(userId)
      .select('alias email roles balance fullName identityDocument phoneNumber telegramId meetingConsumptions followedHandicappers lastLoginDate loginStreak unsubscribed createdAt')
      .lean();
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });

    const [pass, topups, notifications, livePackages] = await Promise.all([
      getPassInfoForUser(userId),
      TopUpRequest.find({ userId })
        .sort({ createdAt: -1 }).limit(8)
        .select('packageId amountBs goldAmount referenceNumber bank status adminNote paymentDate reviewedAt createdAt')
        .lean(),
      Notification.find({ userId })
        .sort({ createdAt: -1 }).limit(10)
        .select('type title body read createdAt')
        .lean(),
      getLiveTopUpPackages(),
    ]);

    const enrichedTopups = (topups as any[]).map(t => {
      const packageId = resolveTopUpPackageIdSync({ packageId: t.packageId, amountBs: t.amountBs }, livePackages);
      const pkg = packageId ? livePackages.find(p => p.id === packageId) ?? null : null;
      return { ...t, packageLabel: pkg?.label ?? null };
    });

    const consumptions = (user.meetingConsumptions ?? []) as any[];
    const racesUnlocked = consumptions.reduce((a, c) => a + (c.unlockedRaceIds?.length ?? 0), 0);

    return NextResponse.json({
      user: {
        alias: user.alias,
        email: user.email ?? null,
        roles: user.roles,
        balance: user.balance,
        billingComplete: !!(user.fullName && user.identityDocument && user.phoneNumber),
        lastLoginDate: (user as any).lastLoginDate ?? null,
        loginStreak: (user as any).loginStreak ?? 0,
        unsubscribed: (user as any).unsubscribed ?? false,
        followedCount: (user.followedHandicappers ?? []).length,
        createdAt: (user as any).createdAt,
      },
      pass,
      topups: enrichedTopups,
      notifications,
      usage: { meetingsConsumed: consumptions.length, racesUnlocked },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
