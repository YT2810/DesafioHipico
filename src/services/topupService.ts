/**
 * topupService — paquetes de recarga/pases con precios vigentes.
 *
 * Los precios pueden sobreescribirse en SiteConfig key 'goldPackagePrices'
 * (pantalla /admin/gold-packages). Si no hay override, se usan TOPUP_PACKAGES.
 *
 * resolveTopUpPackageId() determina si una TopUpRequest corresponde a un Pase:
 *   1. packageId guardado en la solicitud (nuevas)
 *   2. amountBs exacto contra los precios vigentes (solicitudes viejas sin packageId)
 *   3. amountBs >= precio mensual vigente → mensual (cubre pagos de más)
 *   4. null → solicitud legacy de Golds (se acreditan Golds como antes)
 */

import dbConnect from '@/lib/mongodb';
import { getSiteConfig } from '@/models/SiteConfig';
import { TOPUP_PACKAGES, type TopUpPackageId, type PassType } from '@/lib/constants';

export interface LiveTopUpPackage {
  id: TopUpPackageId;
  label: string;
  description: string;
  priceBs: number;
  passType: PassType;
  badge: string | null;
  saving: string | null;
}

export async function getLiveTopUpPackages(): Promise<LiveTopUpPackage[]> {
  let overrides: { id: string; priceBs: number }[] = [];
  try {
    await dbConnect();
    overrides = await getSiteConfig<{ id: string; priceBs: number }[]>('goldPackagePrices', []);
  } catch { /* fallback a constants si falla la DB */ }

  const overrideMap = Object.fromEntries((overrides ?? []).map(o => [o.id, o.priceBs]));
  const packages: LiveTopUpPackage[] = TOPUP_PACKAGES.map(pkg => ({
    id: pkg.id as TopUpPackageId,
    label: pkg.label,
    description: pkg.description,
    priceBs: overrideMap[pkg.id] ?? pkg.priceBs,
    passType: pkg.passType as PassType,
    badge: pkg.badge ?? null,
    saving: pkg.saving ?? null,
  }));

  // Ahorro del mensual calculado con precios vigentes: 4 × semanal − mensual
  const weekly = packages.find(p => p.passType === 'national_weekly');
  for (const pkg of packages) {
    if (pkg.passType === 'national_monthly' && weekly) {
      const saved = weekly.priceBs * 4 - pkg.priceBs;
      pkg.saving = saved > 0 ? `Ahorras ${saved.toLocaleString('es-VE')} Bs` : null;
    }
  }
  return packages;
}

export function getTopUpPackageById(id: string | null | undefined) {
  return TOPUP_PACKAGES.find(p => p.id === id) ?? null;
}

/** Versión sync — usa cuando ya tienes la lista de paquetes vigentes cargada */
export function resolveTopUpPackageIdSync(
  request: { packageId?: string | null; amountBs: number },
  livePackages: LiveTopUpPackage[],
): TopUpPackageId | null {
  if (request.packageId && TOPUP_PACKAGES.some(p => p.id === request.packageId)) {
    return request.packageId as TopUpPackageId;
  }
  const monthly = livePackages.find(p => p.passType === 'national_monthly');
  if (monthly && request.amountBs >= monthly.priceBs) return monthly.id;
  const exact = livePackages.find(p => p.priceBs === request.amountBs);
  return exact?.id ?? null;
}

export async function resolveTopUpPackageId(
  request: { packageId?: string | null; amountBs: number },
): Promise<TopUpPackageId | null> {
  const live = await getLiveTopUpPackages();
  return resolveTopUpPackageIdSync(request, live);
}
