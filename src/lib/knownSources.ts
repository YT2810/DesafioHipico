export interface KnownSource {
  name: string;
  aliases?: string[];   // Alternative names the ghost profile might have in DB
  handle?: string;
  link?: string;
  platform: string;
  priority: string;
  note?: string;
}

export const KNOWN_SOURCES: KnownSource[] = [
  // ── X / Twitter ──────────────────────────────────────────────────────────
  { name: 'Manuel Rodríguez', aliases: ['Manuel Rodriguez', 'mrodoficial'], handle: 'mrodoficial', platform: 'X', priority: 'alta' },
  { name: 'Erick Pignoloni', aliases: ['epignoloni'], handle: 'epignoloni', platform: 'X', priority: 'alta' },
  { name: 'Alfredo Iglesias', aliases: ['cosasdeiglesias', 'cosasdeiglesiastv', 'Alfredo Iglesias TV'], handle: 'cosasdeiglesias', link: 'https://www.youtube.com/@cosasdeiglesiastv', platform: 'X', priority: 'alta', note: 'También en YouTube @cosasdeiglesiastv' },
  { name: 'Alfonso Rodríguez Vera', aliases: ['Alfonso Rodriguez Vera', 'ARodriguezVera'], handle: 'ARodriguezVera', platform: 'X', priority: 'alta' },
  { name: 'Jorge Pignoloni', aliases: ['aaapignoloni'], handle: 'aaapignoloni', platform: 'X', priority: 'media' },
  { name: 'Premonición Hípica', aliases: ['Premonicion Hipica', 'dalialopezr1'], handle: 'dalialopezr1', platform: 'X', priority: 'media' },
  { name: 'Gustavo Izaguirre', aliases: ['Guadizmi'], handle: 'Guadizmi', platform: 'X', priority: 'media' },
  { name: 'Leyenda Hípica', aliases: ['Leyenda Hipica', 'leyenda_hipica'], handle: 'leyenda_hipica', platform: 'X', priority: 'media' },
  { name: 'Un Hípico', aliases: ['Un Hipico', 'UnHipico'], handle: 'UnHipico', platform: 'X', priority: 'media' },
  { name: 'Exacto y Preciso', aliases: ['exactoypreciso'], handle: 'exactoypreciso', platform: 'X', priority: 'baja', note: 'Lista plana, asignación manual' },
  // ── YouTube ──────────────────────────────────────────────────────────────
  { name: 'Guardi', aliases: ['guardi19', 'Guardi19'], link: 'https://www.youtube.com/@guardi19', platform: 'YouTube', priority: 'alta' },
  { name: 'Javier Flores', aliases: ['JavierFlores'], link: 'https://www.youtube.com/@JavierFlores-f4x1o', platform: 'YouTube', priority: 'alta' },
  { name: 'Braulio Inciarte', aliases: ['BraulioInciarte', 'BraulioInciarteTV'], link: 'https://www.youtube.com/@BraulioInciarteTV', platform: 'YouTube', priority: 'alta' },
  { name: 'Omar y Jaime Aponte', aliases: ['Omar Aponte', 'Jaime Aponte', 'HipismosAlGalope', 'Hipsimos Al Galope'], link: 'https://www.youtube.com/@HipismosAlGalope2', platform: 'YouTube', priority: 'alta' },
  { name: 'Pirela Espina', aliases: ['LeoPirela', 'Leo Pirela'], link: 'https://www.youtube.com/@LeoPirelaVip', platform: 'YouTube', priority: 'alta' },
  { name: 'Enio Valbuena', aliases: ['ValbuenaEnio'], link: 'https://www.youtube.com/@ValbuenaEnioLaRinconada1', platform: 'YouTube', priority: 'alta' },
  { name: 'Bob Lovera', aliases: ['BobLovera'], link: 'https://www.youtube.com/@BobLoveraTVOficial', platform: 'YouTube', priority: 'alta' },
  { name: 'Rasevi', aliases: ['raseviarrollador'], link: 'https://www.youtube.com/@raseviarrollador5015', platform: 'YouTube', priority: 'media' },
  { name: 'Científico Hípico', aliases: ['Cientifico Hipico', 'ecancro'], link: 'https://www.youtube.com/@ecancro', platform: 'YouTube', priority: 'media' },
  { name: 'Línea Brava', aliases: ['Linea Brava', 'José Gregorio Hernández Vignieri', 'Jose Gregorio Hernandez Vignieri', 'lineabrava'], link: 'https://www.youtube.com/@lineabrava8346', platform: 'YouTube', priority: 'media' },
  { name: 'Certeza Hípica', aliases: ['Certeza Hipica', 'certezahipica'], link: 'https://www.youtube.com/@certezahipicasports', platform: 'YouTube', priority: 'media' },
  { name: 'Uruguayo en La Rinconada', aliases: ['Uruguayo', 'URUGUAYOENLARINCONADA'], link: 'https://www.youtube.com/@URUGUAYOENLARINCONADA2', platform: 'YouTube', priority: 'media' },
  { name: 'Cordialito', aliases: ['José Gregorio Guillot', 'Jose Gregorio Guillot', 'Cordialitola'], link: 'https://www.youtube.com/@Cordialitola', platform: 'YouTube', priority: 'media' },
  { name: 'Darío Piccinini', aliases: ['Dario Piccinini', 'dariopiccinini'], link: 'https://www.youtube.com/@dariopiccinini', platform: 'YouTube', priority: 'media' },
  { name: 'Marcos Ysea', aliases: ['Marcosysea'], link: 'https://www.youtube.com/@Marcosysea2', platform: 'YouTube', priority: 'media' },
  { name: 'DimensiónHípica', aliases: ['Dimension Hipica', 'DimensionHipica', 'Antonio José Medina', 'Antonio Medina', 'dimensionhipica'], link: 'https://www.youtube.com/@dimensionhipicatv', platform: 'YouTube', priority: 'media' },
];
