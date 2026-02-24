const pdfParse = require('pdf-parse');
const fs = require('fs');
const buf = fs.readFileSync('Ejemplares inscritos reunión 9.pdf');
pdfParse(buf).then(r => {
  process.stdout.write(r.text.slice(0, 5000));
}).catch(e => console.error(e));
