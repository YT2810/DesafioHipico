import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

function clean(s) { return s.replace(/\s+/g, ' ').trim(); }
function parseWeight(raw) {
  const s = raw.replace(',', '.').trim();
  const m = s.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (m) return parseFloat(m[1]) - parseFloat(m[2]);
  return parseFloat(s) || 0;
}

function parseHinavaBlock(block) {
  const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const carreraMatch = block.match(/^CARRERA DEL DIA:\s*\n(\d+)/m);
  const distMatch    = block.match(/^DISTANCIA:\s*\n([\d.]+)/m);
  const horaMatch    = block.match(/^HORA:\s*(\d{1,2}:\d{2}\s*[aApP]\.\s*[mM]\.)/m);

  const raceNumber = carreraMatch ? parseInt(carreraMatch[1]) : 0;
  if (!raceNumber) return null;

  const distance = distMatch ? parseInt(distMatch[1].replace('.', '')) : 0;
  const hora = horaMatch ? horaMatch[1].trim() : '?';

  // Find table start and end
  // º is char 186, not standard °
  const tableStart = lines.findIndex(l => /^N.EJEMPLAR/i.test(l));
  const tableEnd   = lines.findIndex(l => /^OBSERVACIONES/i.test(l));
  if (tableStart < 0) return { raceNumber, distance, hora, entries: [], note: 'no table header' };

  const allLines = lines.slice(tableStart + 1, tableEnd > 0 ? tableEnd : undefined);

  // Skip repeated header block (PROGRAMACION, INSTITUTO, %, etc.) — ends after "% 5º" + value
  let entryStart = 0;
  for (let j = 0; j < allLines.length; j++) {
    if (/^% 5/.test(allLines[j])) { entryStart = j + 2; break; }
  }
  const entryLines = allLines.slice(entryStart);

  const entries = [];
  const failed = [];
  let i = 0;
  while (i < entryLines.length) {
    const line = entryLines[i];
    if (!/^\d{1,2}$/.test(line)) { i++; continue; }
    const dorsal = parseInt(line);
    if (dorsal < 1 || dorsal > 30) { i++; continue; }

    const horseName  = entryLines[i + 1] ? clean(entryLines[i + 1]) : '';
    if (!horseName || /^(PROGRAMACION|INSTITUTO|HIPODROMO|JUNTA|CARRERA|%|Mtrs)/i.test(horseName)) { i++; continue; }

    // Find weight dynamically — skip optional med marker and price (0,00)
    let wi = i + 3;
    while (wi < entryLines.length) {
      if (entryLines[wi].trim() === '0,00') { wi++; break; }
      wi++;
    }
    const weightRaw  = entryLines[wi]     ? entryLines[wi].trim()     : '';
    const jockeyName = entryLines[wi + 1] ? clean(entryLines[wi + 1]) : '';
    const implements_= entryLines[wi + 2] ? clean(entryLines[wi + 2]) : '';
    const trainerName= entryLines[wi + 3] ? clean(entryLines[wi + 3]) : '';
    const ppRaw      = entryLines[wi + 4] ? entryLines[wi + 4].trim() : '';
    const pp         = parseInt(ppRaw);

    if (!weightRaw.match(/^\d/) || isNaN(pp) || pp < 1 || pp > 30 || !jockeyName || !trainerName) {
      failed.push({ dorsal, horseName, weightRaw, jockeyName, trainerName, ppRaw, context: entryLines.slice(i, i+12) });
      i++;
      continue;
    }

    entries.push({ dorsal, horseName, weightRaw, weight: parseWeight(weightRaw), jockeyName, implements: implements_, trainerName, pp });
    i = wi + 5;
  }

  return { raceNumber, distance, hora, entries, failed };
}

const buf = readFileSync('R05-1.pdf');
const r = await pdfParse(buf);
const text = r.text;

// Split into race blocks
const blocks = text.split(/(?=^REUNION:)/m).filter(b => /^REUNION:/m.test(b));
console.log(`\n📋 Bloques encontrados: ${blocks.length}`);

let totalEntries = 0, totalFailed = 0;
for (const block of blocks) {
  const result = parseHinavaBlock(block);
  if (!result) { console.log('  ⚠️  bloque sin carrera'); continue; }
  console.log(`\n  C${result.raceNumber} (${result.distance}m, ${result.hora}): ${result.entries.length} inscritos`);
  for (const e of result.entries) {
    console.log(`    ${e.dorsal}. ${e.horseName} | ${e.weightRaw}kg | ${e.jockeyName} | ${e.implements} | ${e.trainerName} | PP:${e.pp}`);
  }
  if (result.failed?.length) {
    console.log(`    ⚠️  Fallidos (${result.failed.length}):`);
    for (const f of result.failed) {
      console.log(`      dorsal=${f.dorsal} horse=${f.horseName} weight="${f.weightRaw}" jockey="${f.jockeyName}" pp="${f.ppRaw}"`);
      console.log(`      context: ${JSON.stringify(f.context?.slice(0,12))}`);
    }
  }
  totalEntries += result.entries.length;
  totalFailed += result.failed?.length ?? 0;
}
console.log(`\n✅ Total: ${totalEntries} inscritos, ${totalFailed} fallidos`);
