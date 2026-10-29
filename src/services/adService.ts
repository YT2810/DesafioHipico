/**
 * Sponsored ad campaigns — first-party serving + tracking.
 *
 * Campaigns live in MongoDB (SponsorCampaign). Impressions and clicks are
 * aggregated daily in AdDailyStat so we can report real numbers to
 * advertisers without depending on their affiliate dashboards.
 */

import dbConnect from '@/lib/mongodb';
import SponsorCampaign, { ISponsorCampaign } from '@/models/SponsorCampaign';
import AdDailyStat from '@/models/AdDailyStat';

export type AdSlot =
  | 'retrospectos_inline'
  | 'revista_inline'
  | 'resultados_inline'
  | 'pronosticos_inline'
  | 'traqueos_inline'
  | 'header_leaderboard'
  | 'sticky_mobile';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Active campaign for a slot.
 * If multiple campaigns are active for the same slot (A/B/C testing),
 * one is selected at random on each call — giving each variant equal exposure.
 * Returns null if no campaign qualifies.
 */
export async function getActiveCampaign(slot: AdSlot | string): Promise<ISponsorCampaign | null> {
  try {
    await dbConnect();
    const now = new Date();
    const campaigns = await SponsorCampaign.find({
      active: true,
      slots: slot,
      $and: [
        { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    }).lean<ISponsorCampaign[]>();
    if (!campaigns.length) return null;
    // Random selection for A/B/C testing — fair impression distribution
    return campaigns[Math.floor(Math.random() * campaigns.length)];
  } catch {
    return null;
  }
}

export async function getCampaignBySlug(slug: string): Promise<ISponsorCampaign | null> {
  try {
    await dbConnect();
    return await SponsorCampaign.findOne({ slug }).lean<ISponsorCampaign>();
  } catch {
    return null;
  }
}

export async function trackImpression(campaignSlug: string, slot: string): Promise<void> {
  try {
    await dbConnect();
    await AdDailyStat.findOneAndUpdate(
      { campaignSlug, slot, date: todayKey() },
      { $inc: { impressions: 1 } },
      { upsert: true }
    );
  } catch { /* tracking must never break the page */ }
}

export async function trackClick(campaignSlug: string, slot: string): Promise<void> {
  try {
    await dbConnect();
    await AdDailyStat.findOneAndUpdate(
      { campaignSlug, slot, date: todayKey() },
      { $inc: { clicks: 1 } },
      { upsert: true }
    );
  } catch { /* tracking must never break the redirect */ }
}
