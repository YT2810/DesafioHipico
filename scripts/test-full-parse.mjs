import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// Inline the key parser logic to test without TypeScript compilation
const MED_PATTERN = /(?:BUT-LAX|BUT|LAX|COR|FUR|ACE|DIC|OXY|[A-Z]{2,5}(?:-[A-Z]{2,5})+)/;
const IMPL_PATTERN = /(?:[A-Z]{1,3}\.){2,}/;

function clean(s) { return s.replace(/\s+/g, ' ').trim(); }

function parseEntryLine(line) {
  const dorsalMatch = line.match(/^(\d{1,2})([A-ZÁÉÍÓÚÑ'(].*)/);
  if (!dorsalMatch) return null;
  const dorsal = parseInt(dorsalMatch[1]);
  const rest = dorsalMatch[2];

  const medMatch = rest.match(new RegExp(`(.*?)(${MED_PATTERN.source})(\\d+(?:[\\.,]\\d+)?(?:-\\d+(?:[\\.,]\\d+)?)?)(.*)`));
  if (!medMatch) return null;

  const horseName = clean(medMatch[1]);
  const medication = clean(medMatch[2]);
  const weightRaw = medMatch[3].replace(',', '.');
  const afterWeight = medMatch[4];

  const implMatch = afterWeight.match(new RegExp(`(.*?)(${IMPL_PATTERN.source})(.*)`));
  if (!implMatch) return null;

  const jockeyName = clean(implMatch[1]);
  const implements_ = clean(implMatch[2]);
  const trainerAndPP = implMatch[3];

  const ppMatch = trainerAndPP.match(/^(.*?)(\d{1,2})\s*$/);
  if (!ppMatch) return null;

  const trainerName = clean(ppMatch[1]);
  const pp = parseInt(ppMatch[2]);

  if (!horseName || !jockeyName || !trainerName || isNaN(pp) || pp > 30) return null;

  return { dorsal, horseName, medication, weightRaw, jockeyName, implements: implements_, trainerName, pp };
}

const buf = readFileSync('Ejemplares inscritos reunión 9.pdf');
const r = await pdfParse(buf);
const text = r.text;

// Split into race blocks
const blocks = text.split(/(?=Carrera Programada:)/i).filter(p => /Carrera Programada:/i.test(p));
console.log(`\n📋 Bloques de carrera encontrados: ${blocks.length}`);

let totalEntries = 0;
let failedEntries = 0;

for (const block of blocks) {
  // Extract race number from "1400 mts.1" pattern
  const distMatch = block.match(/(\d{3,4})\s*mts\.(\d{1,2})(?:\s|$)/);
  const raceNum = distMatch ? parseInt(distMatch[2]) : '?';
  const dist = distMatch ? parseInt(distMatch[1]) : '?';

  // Extract time
  const horaMatch = block.match(/Carrera\s+Anual\s+Nro\.:Hora:\s*\n?(\d{1,2}:\d{2}\s*[aApP]\.\s*[mM]\.)/i);
  const hora = horaMatch ? horaMatch[1].trim() : '?';

  // Parse entries
  const rawLines = block.split('\n');
  const joinedLines = [];
  for (const raw of rawLines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^\d{1,2}[A-ZÁÉÍÓÚÑ'(]/.test(line)) {
      joinedLines.push(line);
    } else if (joinedLines.length > 0 && !/^(JUEGOS|OBSERVACI|GANADOR|Carrera\s+Prog|N[°o]Ejemplar)/i.test(line)) {
      // Continuation of previous line
      joinedLines[joinedLines.length - 1] += line;
    }
  }

  const entries = [];
  const failed = [];
  for (const line of joinedLines) {
    if (/JUEGOS|OBSERVACI[OÓ]N/i.test(line)) continue;
    const entry = parseEntryLine(line);
    if (entry) entries.push(entry);
    else failed.push(line);
  }

  console.log(`\n  C${raceNum} (${dist}m, ${hora}): ${entries.length} inscritos`);
  for (const e of entries) {
    console.log(`    ${e.dorsal}. ${e.horseName} | ${e.medication} ${e.weightRaw}kg | ${e.jockeyName} | ${e.implements} | ${e.trainerName} | PP:${e.pp}`);
  }
  if (failed.length) {
    console.log(`    ⚠️  No parseadas (${failed.length}):`);
    for (const f of failed) console.log(`      → ${f.slice(0,80)}`);
  }
  totalEntries += entries.length;
  failedEntries += failed.length;
}

console.log(`\n✅ Total: ${totalEntries} inscritos parseados, ${failedEntries} fallidos`);
