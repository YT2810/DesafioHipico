import type { MetadataRoute } from 'next';
import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import '@/models/Track';

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.desafiohipico.com';

// Venezuela race days are Saturday and Sunday.
// During race weekends, high-frequency pages update every hour.
function isRaceWeekend(): boolean {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 6=Sat in UTC; VE is UTC-4 so shift
  const veHour = (now.getUTCHours() - 4 + 24) % 24;
  const veDayOffset = now.getUTCHours() < 4 ? -1 : 0;
  const veDay = ((now.getUTCDay() + veDayOffset + 7) % 7);
  return veDay === 0 || veDay === 6; // Sat or Sun
}

function raceFrequency(): MetadataRoute.Sitemap[number]['changeFrequency'] {
  return isRaceWeekend() ? 'hourly' : 'daily';
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const freq = raceFrequency();
  const now = new Date();

  // ── Static pages ──────────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE,
      lastModified: now,
      changeFrequency: freq,
      priority: 1.0,
    },
    {
      url: `${BASE}/pronosticos`,
      lastModified: now,
      changeFrequency: freq,
      priority: 0.95,
    },
    {
      url: `${BASE}/retirados`,
      lastModified: now,
      changeFrequency: freq,
      priority: 0.9,
    },
  ];

  // ── Dynamic: recent + upcoming meetings ───────────────────────────────────
  let meetingPages: MetadataRoute.Sitemap = [];
  try {
    await dbConnect();

    // Get meetings from last 30 days and next 14 days
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    const to = new Date(now);
    to.setDate(to.getDate() + 14);

    const meetings = await Meeting.find({ date: { $gte: from, $lte: to } })
      .sort({ date: -1 })
      .limit(30)
      .populate('trackId', 'name')
      .lean() as any[];

    meetingPages = meetings.flatMap(m => {
      const meetingDate = new Date(m.date);
      const isRecent = (now.getTime() - meetingDate.getTime()) < 3 * 24 * 60 * 60 * 1000;
      const mFreq: MetadataRoute.Sitemap[number]['changeFrequency'] = isRecent ? freq : 'weekly';
      const entries: MetadataRoute.Sitemap = [];

      // /programa/[meetingId] — inscritos page
      entries.push({
        url: `${BASE}/programa/${m._id.toString()}`,
        lastModified: m.updatedAt ?? meetingDate,
        changeFrequency: mFreq,
        priority: isRecent ? 0.9 : 0.7,
      });

      // /pronosticos?reunion=ID — forecasts for this meeting
      entries.push({
        url: `${BASE}/pronosticos?reunion=${m._id.toString()}`,
        lastModified: m.updatedAt ?? meetingDate,
        changeFrequency: mFreq,
        priority: isRecent ? 0.88 : 0.65,
      });

      // /retirados?reunion=ID — scratches for this meeting
      entries.push({
        url: `${BASE}/retirados?reunion=${m._id.toString()}`,
        lastModified: m.updatedAt ?? meetingDate,
        changeFrequency: mFreq,
        priority: isRecent ? 0.85 : 0.6,
      });

      return entries;
    });
  } catch {
    // DB unavailable during build — return only static pages
  }

  return [...staticPages, ...meetingPages];
}
