import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const key = process.env.OPENROUTER_API_KEY ?? '';

  if (!key) {
    return NextResponse.json({ ok: false, error: 'OPENROUTER_API_KEY not set' });
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': 'https://desafiohipico.com',
        'X-Title': 'Desafio Hipico',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001',
        messages: [{
          role: 'user',
          content: 'Separa estos 3 nombres de caballos venezolanos escritos juntos sin separador: "LA AZURRA PAPRIKA FRIDA". Responde SOLO con un JSON array de 3 strings.',
        }],
        temperature: 0.1,
        max_tokens: 100,
      }),
    });

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content ?? null;

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      model: process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001',
      keyPrefix: key.slice(0, 20) + '...',
      reply,
      error: data?.error ?? null,
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
