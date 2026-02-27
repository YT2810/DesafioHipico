export interface KnownSource {
  name: string;
  handle?: string;
  link?: string;
  platform: string;
  priority: string;
  note?: string;
}

export const KNOWN_SOURCES: KnownSource[] = [
  { name: 'Manuel Rodríguez', handle: 'mrodoficial', platform: 'X', priority: 'alta' },
  { name: 'Erick Pignoloni', handle: 'epignoloni', platform: 'X', priority: 'alta' },
  { name: 'Alfredo Iglesias', handle: 'cosasdeiglesias', platform: 'X', priority: 'alta', note: 'También en YouTube' },
  { name: 'Alfonso Rodríguez Vera', handle: 'ARodriguezVera', platform: 'X', priority: 'alta' },
  { name: 'Jorge Pignoloni', handle: 'aaapignoloni', platform: 'X', priority: 'media' },
  { name: 'Premonición Hípica', handle: 'dalialopezr1', platform: 'X', priority: 'media' },
  { name: 'Gustavo Izaguirre', handle: 'Guadizmi', platform: 'X', priority: 'media' },
  { name: 'Leyenda Hípica', handle: 'leyenda_hipica', platform: 'X', priority: 'media' },
  { name: 'Un Hípico', handle: 'UnHipico', platform: 'X', priority: 'media' },
  { name: 'Exacto y Preciso', handle: 'exactoypreciso', platform: 'X', priority: 'baja', note: 'Lista plana, asignación manual' },
  { name: 'Guardi', link: 'https://www.youtube.com/@guardi19', platform: 'YouTube', priority: 'alta' },
  { name: 'Javier Flores', link: 'https://www.youtube.com/@JavierFlores-f4x1o', platform: 'YouTube', priority: 'alta' },
  { name: 'Braulio Inciarte', link: 'https://www.youtube.com/@BraulioInciarteTV', platform: 'YouTube', priority: 'alta' },
  { name: 'Omar Aponte y Jaime Aponte', link: 'https://www.youtube.com/@HipismosAlGalope2', platform: 'YouTube', priority: 'alta' },
  { name: 'Pirela Espina', link: 'https://www.youtube.com/@LeoPirelaVip', platform: 'YouTube', priority: 'alta' },
  { name: 'Enio Valbuena', link: 'https://www.youtube.com/@ValbuenaEnioLaRinconada1', platform: 'YouTube', priority: 'alta' },
  { name: 'Bob Lovera', link: 'https://www.youtube.com/@BobLoveraTVOficial', platform: 'YouTube', priority: 'alta' },
  { name: 'Alfredo Iglesias TV', link: 'https://www.youtube.com/@cosasdeiglesiastv', platform: 'YouTube', priority: 'alta', note: 'También en X' },
  { name: 'Rasevi', link: 'https://www.youtube.com/@raseviarrollador5015', platform: 'YouTube', priority: 'media' },
  { name: 'Científico Hípico', link: 'https://www.youtube.com/@ecancro', platform: 'YouTube', priority: 'media' },
  { name: 'Línea Brava (J.G. Hernández Vignieri)', link: 'https://www.youtube.com/@lineabrava8346', platform: 'YouTube', priority: 'media' },
  { name: 'Certeza Hípica', link: 'https://www.youtube.com/@certezahipicasports', platform: 'YouTube', priority: 'media' },
  { name: 'Uruguayo en La Rinconada', link: 'https://www.youtube.com/@URUGUAYOENLARINCONADA2', platform: 'YouTube', priority: 'media' },
  { name: 'Cordialito (José Gregorio Guillot)', link: 'https://www.youtube.com/@Cordialitola', platform: 'YouTube', priority: 'media' },
  { name: 'Darío Piccinini', link: 'https://www.youtube.com/@dariopiccinini', platform: 'YouTube', priority: 'media' },
  { name: 'Marcos Ysea', link: 'https://www.youtube.com/@Marcosysea2', platform: 'YouTube', priority: 'media' },
  { name: 'DimensiónHípica (A. Medina)', link: 'https://www.youtube.com/@dimensionhipicatv', platform: 'YouTube', priority: 'media' },
];
