/**
 * POST /api/admin/users/grant-pass
 * Otorga un Pase Nacional manualmente (pago en efectivo, regalo, cortesía).
 * Body: { identifier: string, packageId: 'arranque'|'padrillo', note: string, amountBs?: number, confirm?: boolean }
 *
 * SEGURIDAD: solo rol 'admin' — a diferencia de /api/admin/topup/[id]/review
 * (que acepta staff), este endpoint salta la verificación de pago por completo.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import TopUpRequest from '@/models/TopUpRequest';
import ActivityEvent from '@/models/ActivityEvent';
import { Types } from 'mongoose';
import { TOPUP_PACKAGES } from '@/lib/constants';
import { hasActiveNationalPass } from '@/services/forecastAccessService';
import { notifyTopUpApproved } from '@/services/notificationService';

export const dynamic = 'force-dynamic';

const VALID_PACKAGES = TOPUP_PACKAGES.map(p => p.id) as string[];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const roles: string[] = (session?.user as any)?.roles ?? [];
    if (!session?.user?.id || !roles.includes('admin')) {
      return NextResponse.json({ error: 'No autorizado. Solo el administrador puede otorgar pases.' }, { status: 403 });
    }

    const { identifier, packageId, note, amountBs, confirm } = await req.json();

    if (!identifier || !packageId || !note?.trim()) {
      return NextResponse.json({ error: 'identifier, packageId y note (motivo) son requeridos.' }, { status: 400 });
    }
    if (!VALID_PACKAGES.includes(packageId)) {
      return NextResponse.json({ error: 'packageId inválido.' }, { status: 400 });
    }

    const pkg = TOPUP_PACKAGES.find(p => p.id === packageId)!;
    const bs = typeof amountBs === 'number' && amountBs >= 0 ? Math.floor(amountBs) : 0;

    await dbConnect();

    const user = await User.findOne({
      $or: [
        { email:      { $regex: `^${identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
        { alias:      { $regex: `^${identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
        { telegramId: identifier },
      ],
    });
    if (!user) {
      return NextResponse.json({ error: `Usuario "${identifier}" no encontrado.` }, { status: 404 });
    }

    // Safety: no duplicar pases activos sin confirmación explícita
    if (!confirm && await hasActiveNationalPass(user._id.toString())) {
      return NextResponse.json({
        error: `${user.alias} ya tiene un Pase activo. Confirma para registrar otra asignación.`,
        requiresConfirm: true,
      }, { status: 409 });
    }

    const now = new Date();
    const request = await TopUpRequest.create({
      userId: user._id,
      packageId,
      goldAmount: 0,
      referenceNumber: `MANUAL-${now.getTime()}`,
      phone: user.phoneNumber ?? user.phone ?? 'MANUAL',
      legalId: user.identityDocument ?? user.legalId ?? '',
      bank: bs > 0 ? 'Efectivo' : 'Manual',
      amountBs: bs,
      paymentDate: now.toISOString().slice(0, 10),
      status: 'approved',
      reviewedBy: new Types.ObjectId(session.user.id),
      reviewedAt: now,
      adminNote: note.trim(),
    });

    ActivityEvent.create({
      type: 'pass_activation',
      userId: user._id,
      message: pkg.passType === 'national_monthly'
        ? 'activó su Pase Mensual Nacional 👑'
        : 'activó su Pase Semanal Nacional 🎟️',
      meta: { packageId, amountBs: bs, manual: true },
    }).catch(() => {});

    notifyTopUpApproved(user._id.toString(), pkg.label).catch(() => {});

    return NextResponse.json({
      ok: true,
      topupId: request._id.toString(),
      packageLabel: pkg.label,
      userId: user._id.toString(),
      alias: user.alias,
      email: user.email ?? null,
      amountBs: bs,
      note: note.trim(),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
