import { NextRequest, NextResponse } from 'next/server';
import { processDocument } from '@/services/pdfProcessor';
import { ingestDocument } from '@/services/ingestService';
import { notifyNewMeeting } from '@/services/notificationService';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let rawText = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const text = formData.get('text') as string | null;

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

    const preview = request.nextUrl.searchParams.get('preview') === 'true';
    if (preview) {
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
