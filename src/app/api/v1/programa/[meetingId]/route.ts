/**
 * GET /api/v1/programa/[meetingId]
 * Contrato estable para consumidores externos (Taquillero, futuros integradores).
 * No auth required — los datos del programa son información pública del INH.
 *
 * CONTRATO v1 — shape garantizado:
 * {
 *   meeting: {
 *     id, meetingNumber, date, trackName, trackLocation, trackAbbr, isValencia
 *   },
 *   races: [{
 *     raceId, raceNumber, annualRaceNumber, distance, scheduledTime,
 *     conditions, prizePool, games,
 *     entries: [{
 *       dorsalNumber, postPosition, weight, weightRaw, medication,
 *       implements, status, horseName, jockeyName, trainerName
 *     }],
 *     forecastCount, forecastPreview
 *   }]
 * }
 *
 * Para cambios incompatibles crear /api/v2/programa/[meetingId]
 * y notificar a los consumidores antes de deprecar esta ruta.
 */

import { NextRequest, NextResponse } from 'next/server';
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
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
