/**
 * GET  /api/admin/ga4-metrics          → current GA4 snapshot (auto-refresh if stale)
 * POST /api/admin/ga4-metrics          → force refresh from the GA4 Data API
 * Admin/staff only.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getGa4Metrics } from '@/services/ga4Service';

export const dynamic = 'force-dynamic';

function isPrivileged(session: any) {
  const roles: string[] = session?.user?.roles ?? [];
  return roles.includes('admin') || roles.includes('staff');
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !isPrivileged(session)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const metrics = await getGa4Metrics(false);
  if (!metrics) return NextResponse.json({ error: 'Sin datos GA4 todavía.' }, { status: 503 });
  return NextResponse.json(metrics);
}

export async function POST() {
  const session = await auth();
  if (!session?.user || !isPrivileged(session)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const metrics = await getGa4Metrics(true);
  if (!metrics) return NextResponse.json({ error: 'No se pudo refrescar GA4.' }, { status: 503 });
  return NextResponse.json(metrics);
}
