const pdfParse = require('pdf-parse');
const fs = require('fs');
const { execSync } = require('child_process');

const buf = fs.readFileSync('Ejemplares inscritos reunión 9.pdf');
pdfParse(buf).then(r => {
  // Write text to temp file and run through the compiled processor
  fs.writeFileSync('/tmp/pdf-text.txt', r.text);
  console.log('PDF text length:', r.text.length);
  console.log('First 200 chars:', JSON.stringify(r.text.slice(0, 200)));
}).catch(e => console.error(e));
