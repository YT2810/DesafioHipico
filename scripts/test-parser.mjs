// Test parser with real PDF text
import { createRequire } from 'module';
import { readFileSync, writeFileSync } from 'fs';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const buf = readFileSync('Ejemplares inscritos reunión 9.pdf');
const r = await pdfParse(buf);
writeFileSync('/tmp/pdf-raw.txt', r.text);
console.log('✅ PDF text extracted, length:', r.text.length);
console.log('First 500 chars:\n', r.text.slice(0, 500));
