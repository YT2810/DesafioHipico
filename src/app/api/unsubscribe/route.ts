/**
 * GET /api/unsubscribe?e=<email>&t=<hmac-token>
 * One-click email marketing opt-out. Marks the user unsubscribed and shows
 * a confirmation page. Also hit by List-Unsubscribe email clients.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { isValidUnsubscribeToken } from '@/lib/unsubscribe';

export const dynamic = 'force-dynamic';

function page(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Desafío Hípico</title></head>
    <body style="background:#030712;color:#e5e7eb;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
      <div style="max-width:380px;text-align:center;padding:24px">
        <div style="font-size:42px;margin-bottom:12px">🏇</div>
        <h1 style="font-size:18px;font-weight:800;margin:0 0 8px">${title}</h1>
        <p style="font-size:13px;color:#9ca3af;line-height:1.5;margin:0">${body}</p>
        <a href="https://www.desafiohipico.com" style="display:inline-block;margin-top:20px;padding:10px 22px;background:#D4AF37;color:#000;font-weight:800;font-size:13px;border-radius:12px;text-decoration:none">Volver a Desafío Hípico</a>
      </div>
    </body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export async function GET(req: NextRequest) {
  const email = (req.nextUrl.searchParams.get('e') ?? '').toLowerCase().trim();
  const token = req.nextUrl.searchParams.get('t') ?? '';

  if (!email || !isValidUnsubscribeToken(email, token)) {
    return page('Enlace inválido', 'Este enlace de baja no es válido o ya fue utilizado.', 400);
  }

  await dbConnect();
  await User.findOneAndUpdate({ email }, { $set: { unsubscribed: true } });

  return page('Baja confirmada', `No volverás a recibir correos de marketing en <b>${email}</b>. Seguirás pudiendo entrar a la plataforma normalmente.`);
}
