/**
 * POST /api/contact
 * Receives a contact form submission and forwards it to the admin via Resend.
 * Body: { name, email, subject, message }
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'yolfry@gmail.com';
const FROM = 'Desafío Hípico <noreply@desafiohipico.com>';

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Nombre, email y mensaje son requeridos.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }

    if (message.trim().length > 2000) {
      return NextResponse.json({ error: 'El mensaje no puede superar 2000 caracteres.' }, { status: 400 });
    }

    const subjectLine = subject?.trim() ? `[Contacto DH] ${subject.trim()}` : `[Contacto DH] Mensaje de ${name.trim()}`;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [ADMIN_EMAIL],
        reply_to: email.trim(),
        subject: subjectLine,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#111;color:#f1f1f1;border-radius:16px">
            <div style="text-align:center;margin-bottom:24px">
              <div style="font-size:36px">🏇</div>
              <h1 style="font-size:18px;font-weight:800;color:#fff;margin:8px 0 4px">Nuevo mensaje de contacto</h1>
              <p style="font-size:12px;color:#888;margin:0">Desafío Hípico</p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              <tr>
                <td style="padding:8px 0;color:#888;font-size:12px;width:80px">Nombre</td>
                <td style="padding:8px 0;color:#fff;font-size:13px;font-weight:600">${escapeHtml(name.trim())}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#888;font-size:12px">Email</td>
                <td style="padding:8px 0;font-size:13px">
                  <a href="mailto:${escapeHtml(email.trim())}" style="color:#D4AF37">${escapeHtml(email.trim())}</a>
                </td>
              </tr>
              ${subject?.trim() ? `
              <tr>
                <td style="padding:8px 0;color:#888;font-size:12px">Asunto</td>
                <td style="padding:8px 0;color:#fff;font-size:13px">${escapeHtml(subject.trim())}</td>
              </tr>` : ''}
            </table>
            <div style="background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:16px;margin-bottom:20px">
              <p style="font-size:12px;color:#888;margin:0 0 8px;text-transform:uppercase;letter-spacing:.05em">Mensaje</p>
              <p style="font-size:14px;color:#e5e5e5;margin:0;white-space:pre-wrap;line-height:1.6">${escapeHtml(message.trim())}</p>
            </div>
            <p style="font-size:11px;color:#555;text-align:center;margin:0">
              Responde directamente a este correo para contactar al usuario.
            </p>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.json().catch(() => ({}));
      console.error('[api/contact] Resend error:', err);
      return NextResponse.json({ error: 'No se pudo enviar el mensaje. Intenta de nuevo.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/contact]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
