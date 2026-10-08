/**
 * GET /api/programa/[meetingId]
 * Public endpoint — returns meeting info, races with entries (inscribed horses),
 * and a blurred preview of published forecasts per race.
 * No auth required.
 *
 * Lógica centralizada en src/lib/programa-handler.ts
 * Consumidores externos deben usar /api/v1/programa/[meetingId] (contrato estable).
 */

import { NextRequest } from 'next/server';
import { getProgramaResponse } from '@/lib/programa-handler';

export const revalidate = 120;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await context.params;
    return await getProgramaResponse(meetingId);
  } catch (err) {
    const { NextResponse } = await import('next/server');
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
