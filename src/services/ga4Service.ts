/**
 * GA4 Data API integration — fetches real audience metrics for the media kit.
 *
 * Credentials (either works):
 *   1. GA4_SERVICE_ACCOUNT_JSON env var — full service-account JSON as a string (Vercel/prod)
 *   2. ./ga4-service-account.json at project root (local dev — gitignored)
 *
 * GA_PROPERTY_ID env var, defaults to the Desafío Hípico property.
 * Snapshots are cached in SiteConfig ('ga4Metrics') and refreshed at most
 * once every SNAPSHOT_TTL_H hours to stay well inside the free API quota.
 */

import fs from 'fs';
import path from 'path';
import dbConnect from '@/lib/mongodb';
import { getSiteConfig, setSiteConfig } from '@/models/SiteConfig';

const PROPERTY_ID = process.env.GA_PROPERTY_ID ?? '429858983';
const SNAPSHOT_KEY = 'ga4Metrics-v2'; // v2: date-range mapping fixed (was positional)
const SNAPSHOT_TTL_H = 24;

export interface Ga4RangeMetrics {
  activeUsers: number;
  screenPageViews: number;
  sessions: number;
  avgSessionDurationSec: number;
  engagementRatePct: number;
}

export interface Ga4TopPage {
  path: string;
  views: number;
  users: number;
}

export interface Ga4Snapshot {
  fetchedAt: string;
  last28d: Ga4RangeMetrics;
  last90d: Ga4RangeMetrics;
  topPages: Ga4TopPage[];
}

function getClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { BetaAnalyticsDataClient } = require('@google-analytics/data');
  if (process.env.GA4_SERVICE_ACCOUNT_JSON) {
    return new BetaAnalyticsDataClient({
      credentials: JSON.parse(process.env.GA4_SERVICE_ACCOUNT_JSON),
    });
  }
  const localFile = path.join(process.cwd(), 'ga4-service-account.json');
  if (fs.existsSync(localFile)) {
    return new BetaAnalyticsDataClient({ keyFilename: localFile });
  }
  return null;
}

async function fetchFromGa4(): Promise<Ga4Snapshot> {
  const client = getClient();
  if (!client) throw new Error('GA4 no configurado: falta service account');
  const property = `properties/${PROPERTY_ID}`;

  const [totals] = await client.runReport({
    property,
    dateRanges: [
      { startDate: '28daysAgo', endDate: 'yesterday' },
      { startDate: '90daysAgo', endDate: 'yesterday' },
    ],
    metrics: [
      { name: 'activeUsers' },
      { name: 'screenPageViews' },
      { name: 'sessions' },
      { name: 'averageSessionDuration' },
      { name: 'engagementRate' },
    ],
  });

  // GA4 returns a 'dateRange' dimension value per row (date_range_0 = first
  // requested range). Row ORDER is not guaranteed — map by the dimension value.
  const rows = totals.rows ?? [];
  const rangeByDim = (dim: string): Ga4RangeMetrics => {
    const r = rows.find((row: any) => row.dimensionValues?.[0]?.value === dim) ?? { metricValues: [] };
    return {
      activeUsers:           Number(r.metricValues?.[0]?.value ?? 0),
      screenPageViews:       Number(r.metricValues?.[1]?.value ?? 0),
      sessions:              Number(r.metricValues?.[2]?.value ?? 0),
      avgSessionDurationSec: Math.round(Number(r.metricValues?.[3]?.value ?? 0)),
      engagementRatePct:     Math.round(Number(r.metricValues?.[4]?.value ?? 0) * 1000) / 10,
    };
  };

  const [pages] = await client.runReport({
    property,
    dateRanges: [{ startDate: '90daysAgo', endDate: 'yesterday' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 12,
  });

  return {
    fetchedAt: new Date().toISOString(),
    last28d: rangeByDim('date_range_0'),
    last90d: rangeByDim('date_range_1'),
    topPages: (pages.rows ?? []).map((r: any) => ({
      path: r.dimensionValues?.[0]?.value ?? '',
      views: Number(r.metricValues?.[0]?.value ?? 0),
      users: Number(r.metricValues?.[1]?.value ?? 0),
    })),
  };
}

/** Returns the cached snapshot, refreshing from GA4 when stale (>24h) or forced. */
export async function getGa4Metrics(forceRefresh = false): Promise<Ga4Snapshot | null> {
  try {
    await dbConnect();
    const cached = await getSiteConfig<Ga4Snapshot | null>(SNAPSHOT_KEY, null);
    const ageH = cached ? (Date.now() - new Date(cached.fetchedAt).getTime()) / 3600000 : Infinity;
    if (cached && !forceRefresh && ageH < SNAPSHOT_TTL_H) return cached;

    const fresh = await fetchFromGa4();
    await setSiteConfig(SNAPSHOT_KEY, fresh);
    return fresh;
  } catch {
    // On any failure, return whatever snapshot exists (or null → caller uses defaults)
    try {
      return await getSiteConfig<Ga4Snapshot | null>(SNAPSHOT_KEY, null);
    } catch {
      return null;
    }
  }
}
