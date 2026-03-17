import { NextRequest, NextResponse } from 'next/server';
import { processDocument } from '@/services/pdfProcessor';
import { ingestDocument } from '@/services/ingestService';
import { notifyNewMeeting } from '@/services/notificationService';
import connectDB from '@/lib/mongodb';
import Track from '@/models/Track';
import Meeting from '@/models/Meeting';
import Race from '@/models/Race';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let rawText = '';
    let annualOverrides: Record<string, number> = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const text = formData.get('text') as string | null;
      const annualOverridesRaw = formData.get('annualOverrides') as string | null;
      annualOverrides = annualOverridesRaw ? JSON.parse(annualOverridesRaw) : {};

      if (file) {
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          const arrayBuffer = await file.arrayBuffer();
          // Import from lib directly to avoid pdf-parse/index.js debug code (ENOENT bug)
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require('pdf-parse/lib/pdf-parse.js');
          const result = await pdfParse(Buffer.from(arrayBuffer));
          rawText = result.text;
        } else {
          rawText = await file.text();
        }
      } else if (text) {
        rawText = text;
      } else {
        return NextResponse.json({ error: 'No file or text provided' }, { status: 400 });
      }
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      rawText = body.text || '';
      if (!rawText) {
        return NextResponse.json({ error: 'No text provided in body.text' }, { status: 400 });
      }
    } else {
      rawText = await request.text();
    }

    if (!rawText.trim()) {
      return NextResponse.json({ error: 'Empty document provided' }, { status: 400 });
    }

    const debug = request.nextUrl.searchParams.get('debug') === 'true';
    if (debug) {
      return NextResponse.json({ rawText: rawText.slice(0, 5000), totalLength: rawText.length });
    }

    const processed = processDocument(rawText);

    // Apply manual annualRaceNumber overrides (raceNumber → annualRaceNumber)
    if (Object.keys(annualOverrides).length > 0) {
      for (const rb of processed.races) {
        const override = annualOverrides[rb.race.raceNumber];
        if (override) rb.race.annualRaceNumber = override;
      }
    }

    const preview = request.nextUrl.searchParams.get('preview') === 'true';
    if (preview) {
      // Auto-calculate annualRaceNumber for races that don't have it
      const hasAnyMissing = processed.races.some(rb => !rb.race.annualRaceNumber);
      if (hasAnyMissing && processed.meeting?.track?.name && processed.meeting?.date) {
        try {
          await connectDB();
          const track = await Track.findOne({ name: processed.meeting.track.name, country: processed.meeting.track.country }).lean() as any;
          if (track) {
            const meetingDate = new Date(processed.meeting.date);
            const yearStart = new Date(meetingDate.getFullYear(), 0, 1);
            const earlierMeetings = await Meeting.find({
              trackId: track._id,
              date: { $gte: yearStart, $lt: meetingDate },
            }).select('_id').lean() as any[];
            const earlierIds = earlierMeetings.map((m: any) => m._id);
            const racesBeforeThis = earlierIds.length > 0
              ? await Race.countDocuments({ meetingId: { $in: earlierIds } })
              : 0;
            for (const rb of processed.races) {
              if (!rb.race.annualRaceNumber) {
                rb.race.annualRaceNumber = racesBeforeThis + rb.race.raceNumber;
              }
            }
            processed.warnings.push(`[INFO] annualRaceNumber auto-calculado: base ${racesBeforeThis} carreras previas en ${meetingDate.getFullYear()}`);
          }
        } catch { /* non-critical */ }
      }
      return NextResponse.json({
        success: true,
        preview: true,
        hash: processed.hash,
        meeting: processed.meeting,
        races: processed.races,
        warnings: processed.warnings,
      });
    }

    const result = await ingestDocument(processed);

    // Notify all users + handicappers of the new meeting (fire-and-forget)
    const m = processed.meeting;
    if (m?.meetingNumber && m?.track?.name && m?.date) {
      const dateStr = new Date(m.date).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      notifyNewMeeting(m.meetingNumber, m.track.name, dateStr).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      preview: false,
      hash: processed.hash,
      ...result,
    });
  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
