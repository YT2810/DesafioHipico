/**
 * POST /api/auth/magic/send
 * Generates a magic link token and sends it via Resend API.
 * Body: { email, callbackUrl? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import dbConnect from '@/lib/mongodb';
import MagicToken from '@/models/MagicToken';

export async function POST(req: NextRequest) {
  try {
    const { email, callbackUrl = '/' } = await req.json();
    if (!email?.trim()) return NextResponse.json({ error: 'Email requerido.' }, { status: 400 });

    const normalizedEmail = email.trim().toLowerCase();
    await dbConnect();

    // Invalidate previous unused tokens for this email
    await MagicToken.updateMany(
      { email: normalizedEmail, used: false },
      { $set: { used: true } }
    );

    // Create new token — expires in 15 minutes
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await MagicToken.create({ email: normalizedEmail, token, callbackUrl, expiresAt });

    const baseUrl = process.env.AUTH_URL ?? 'http://localhost:3000';
    const magicUrl = `${baseUrl}/api/auth/magic/verify?token=${token}`;

    // Send via Resend API
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
      },
      body: JSON.stringify({
        from: 'Desafío Hípico <noreply@desafiohipico.com>',
        to: [normalizedEmail],
        subject: '🏇 Tu enlace de acceso a Desafío Hípico',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#111;color:#f1f1f1;border-radius:16px">
            <div style="text-align:center;margin-bottom:24px">
              <div style="font-size:40px">🏇</div>
              <h1 style="font-size:20px;font-weight:800;color:#fff;margin:8px 0 4px">Desafío Hípico</h1>
              <p style="font-size:13px;color:#888;margin:0">Tu enlace de acceso</p>
            </div>
            <p style="font-size:14px;color:#ccc;margin-bottom:24px">
              Haz clic en el botón para entrar a tu cuenta. El enlace expira en <strong style="color:#fff">15 minutos</strong>.
            </p>
            <div style="text-align:center;margin-bottom:24px">
              <a href="${magicUrl}"
                style="display:inline-block;background:#D4AF37;color:#000;font-weight:800;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none">
                Entrar a Desafío Hípico
              </a>
            </div>
            <p style="font-size:11px;color:#555;text-align:center">
              Si no solicitaste este enlace, ignora este correo.<br/>
              <a href="${magicUrl}" style="color:#666;word-break:break-all">${magicUrl}</a>
            </p>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.json().catch(() => ({}));
      console.error('[magic/send] Resend error:', err);
      return NextResponse.json({ error: 'No se pudo enviar el correo. Intenta de nuevo.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[magic/send]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
