import { NextRequest, NextResponse } from 'next/server';
import { processDocument } from '@/services/pdfProcessor';
import { ingestDocument } from '@/services/ingestService';

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
          // Use pdfjs-dist with worker file path (server-side safe)
          const arrayBuffer = await file.arrayBuffer();
          const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
          const { resolve } = await import('path');
          const workerPath = resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;
          const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer), useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true });
          const pdfDoc = await loadingTask.promise;
          const pages: string[] = [];
          for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const content = await page.getTextContent();
            // Group text items by Y position to reconstruct lines
            const lineMap = new Map<number, string[]>();
            for (const item of content.items) {
              if (!('str' in item) || !item.str.trim()) continue;
              const y = Math.round((item as { transform: number[] }).transform[5]);
              if (!lineMap.has(y)) lineMap.set(y, []);
              lineMap.get(y)!.push(item.str);
            }
            // Sort lines top-to-bottom (descending Y in PDF coords)
            const sortedLines = [...lineMap.entries()]
              .sort((a, b) => b[0] - a[0])
              .map(([, parts]) => parts.join('  '));
            pages.push(sortedLines.join('\n'));
          }
          rawText = pages.join('\n');
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
