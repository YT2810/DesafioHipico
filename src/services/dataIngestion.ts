/**
 * Unified Data Ingestion Service
 * Accepts two input modes:
 *   1. rawText  — plain text extracted from a PDF (programa oficial INH)
 *   2. imageJson — structured JSON from an image analysis result (foto finish / dividendos)
 */

import { processDocument, type ProcessedDocument } from './pdfProcessor';

// ─── Types for image/JSON input ───────────────────────────────────────────────

export interface ImageResultEntry {
  dorsalNumber: number;
  finishPosition: number;
  distanceMargin?: string;
  isScratched?: boolean;
  scratchReason?: string;
  officialTime?: string;
  finalOdds?: number;
}

export interface ImagePayoutRow {
  combination: string;
  amount: number;
}

export interface ImageRaceResult {
  raceNumber: number;
  officialTime?: string;
  timeSplits?: { distance: number; time: string }[];
  entries: ImageResultEntry[];
  payouts?: {
    winner?: ImagePayoutRow[];
    exacta?: ImagePayoutRow[];
    trifecta?: ImagePayoutRow[];
    superfecta?: ImagePayoutRow[];
    quinela?: ImagePayoutRow[];
    dobleSeleccion?: ImagePayoutRow[];
  };
}

export interface ImageResultDocument {
  meetingNumber: number;
  trackName: string;
  date: string;
  races: ImageRaceResult[];
}

// ─── Unified ingestion payload ────────────────────────────────────────────────

export type IngestionMode = 'program' | 'results';

export interface IngestionPayload {
  mode: IngestionMode;
  /** For mode='program': raw text from PDF */
  rawText?: string;
  /** For mode='results': structured JSON from image analysis */
  imageJson?: ImageResultDocument;
}

export interface IngestionResult {
  mode: IngestionMode;
  hash: string;
  warnings: string[];
  /** Populated when mode='program' */
  program?: ProcessedDocument;
  /** Populated when mode='results' */
  results?: ImageResultDocument;
}

// ─── Hash utility ─────────────────────────────────────────────────────────────

function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(31, h) + input.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(16);
}

// ─── Validators ───────────────────────────────────────────────────────────────

function validateImageJson(doc: ImageResultDocument, warnings: string[]): void {
  if (!doc.meetingNumber) warnings.push('imageJson: falta meetingNumber.');
  if (!doc.trackName) warnings.push('imageJson: falta trackName.');
  if (!doc.date) warnings.push('imageJson: falta date.');
  if (!Array.isArray(doc.races) || doc.races.length === 0) {
    warnings.push('imageJson: no se encontraron carreras.');
    return;
  }
  for (const race of doc.races) {
    if (!race.raceNumber) warnings.push(`imageJson: carrera sin raceNumber.`);
    if (!Array.isArray(race.entries) || race.entries.length === 0) {
      warnings.push(`imageJson: carrera ${race.raceNumber} sin entries.`);
    }
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function ingest(payload: IngestionPayload): IngestionResult {
  const warnings: string[] = [];

  if (payload.mode === 'program') {
    if (!payload.rawText?.trim()) {
      return { mode: 'program', hash: '', warnings: ['rawText vacío.'] };
    }
    const program = processDocument(payload.rawText);
    return {
      mode: 'program',
      hash: program.hash,
      warnings: program.warnings,
      program,
    };
  }

  if (payload.mode === 'results') {
    if (!payload.imageJson) {
      return { mode: 'results', hash: '', warnings: ['imageJson no proporcionado.'] };
    }
    validateImageJson(payload.imageJson, warnings);
    const hash = hashString(JSON.stringify(payload.imageJson));
    return {
      mode: 'results',
      hash,
      warnings,
      results: payload.imageJson,
    };
  }

  return { mode: payload.mode, hash: '', warnings: ['Modo de ingestión desconocido.'] };
}
