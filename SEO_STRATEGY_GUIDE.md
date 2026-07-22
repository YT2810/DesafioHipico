# Guía de Estrategia SEO — Desafío Hípico
### Plantilla reutilizable para proyectos Next.js de nicho deportivo/hipismo

> Esta guía documenta exactamente lo que fue implementado en **desafiohipico.com** y puede ser
> adaptada íntegramente a proyectos similares (por ejemplo, un sitio de hipismo en Reino Unido en inglés).

---

## 1. Arquitectura de Metadata en Next.js App Router

### Metadata global en `layout.tsx`

Define el título base con template y descripción global en el `RootLayout`.
El `template: '%s | Desafío Hípico'` aplica automáticamente el sufijo de marca a todas las páginas hijas.

```tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://www.tusitio.com'),
  title: {
    default: 'Nombre del Sitio · Subtítulo principal',
    template: '%s | Nombre del Sitio',
  },
  description: 'Descripción principal. Incluye las 2-3 palabras clave más importantes al inicio.',
  keywords: [ /* ver sección 2 */ ],
  authors: [{ name: 'Nombre del Sitio', url: 'https://www.tusitio.com' }],
  creator: 'Nombre del Sitio',
  publisher: 'Nombre del Sitio',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_TOKEN ?? '',
  },
};
```

### Metadata dinámica por página (`generateMetadata`)

Para páginas de contenido dinámico (reuniones, eventos, personas), usa `generateMetadata` que
hace fetch del dato al momento de la solicitud y genera metadata específica.

```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const data = await fetchData(params.id);
  if (!data) return { title: 'Fallback title' };

  return {
    title: `Título específico de ${data.name}`,
    description: `Descripción específica con datos reales: ${data.date}, ${data.location}.`,
    keywords: [
      `keyword específica ${data.name}`,
      'keyword general del sitio',
    ],
    openGraph: { /* ver sección 4 */ },
    twitter: { /* ver sección 4 */ },
    alternates: { canonical: `https://www.tusitio.com/ruta/${params.id}` },
  };
}
```

**Patrón clave:** Los títulos siguen el formato `Contenido específico · Categoría · Fecha`.
Ejemplo real: `La Rinconada Reunión 29 · Datos e Inscritos · 26 julio 2026`


---

## 2. Estrategia de Keywords

### Taxonomía de keywords usada en Desafío Hípico

Se organizaron en 6 categorías para cubrir todo el embudo:

#### A. Navegacionales / alta intención
Usuarios que ya saben qué buscan — priorizadas en la homepage.

```
'inscritos La Rinconada'
'inscritos La Rinconada hoy'
'inscritos Valencia hipódromo'
'programa carreras La Rinconada'
```

#### B. Informacionales / comparativas
Usuarios buscando información antes de decidir.

```
'pronósticos hípicos Venezuela'
'pronósticos La Rinconada hoy'
'expertos hípicos Venezuela'
'handicappers Venezuela'
```

#### C. Transaccionales inmediatas (alta conversión)
Usuarios que quieren actuar YA.

```
'retirados La Rinconada'
'retirados hipódromo hoy'
'ejemplares retirados carreras Venezuela'
```

#### D. Resultados / dividendos (post-evento)
Tráfico que llega los domingos y lunes buscando resultados.

```
'resultados La Rinconada'
'resultados inh hoy'
'dividendos La Rinconada hoy'
'cuánto pagó el 5y6 la rinconada'
'cuánto pagó el 5y6 hoy'
```

#### E. Marca competidora / publicaciones conocidas
Captura tráfico que va a buscar otras marcas del sector.

```
'Gaceta Hípica'
'Mundo Hípico Venezuela'
'INH hipódromo'
'HINAVA Valencia'
'Chicho Báez hípica'
```

#### F. Long-tail (baja competencia, intención específica)
Frases completas con fechas y números de reunión — muy fáciles de posicionar.

```
`datos la rinconada reunión ${meetingNumber}`
`inscritos la rinconada ${día} ${dd} de ${mes}`
`traqueos la rinconada ${dd} de ${mes}`
`retrospectos la rinconada ${dd} de ${mes}`
```

### Adaptación a Reino Unido (inglés)

| Venezuela (es-VE) | UK (en-GB) |
|---|---|
| `inscritos La Rinconada hoy` | `today's runners Cheltenham` |
| `cuánto pagó el 5y6` | `how much did the jackpot pay` |
| `resultados INH hoy` | `BHA results today` |
| `pronósticos hípicos Venezuela` | `horse racing tips UK today` |
| `retirados del día` | `today's non-runners` |
| `dividendos La Rinconada` | `dividends Cheltenham today` |
| `datos la rinconada reunión ${N}` | `runners Ascot meeting ${N}` |
| `Gaceta Hípica` | `Racing Post` (capturar tráfico marca conocida) |


---

## 3. Structured Data / JSON-LD por tipo de página

Cada tipo de página tiene su propio schema de Schema.org. Se inyectan como `<script type="application/ld+json">` en el Server Component del page.tsx.

### 3.1 — Homepage: `WebSite` + `SportsOrganization`

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Desafío Hípico",
  "url": "https://www.tusitio.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://www.tusitio.com/buscar?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}

{
  "@context": "https://schema.org",
  "@type": "SportsOrganization",
  "name": "Nombre del Sitio",
  "url": "https://www.tusitio.com",
  "logo": "https://www.tusitio.com/logo.png",
  "description": "Descripción de la plataforma.",
  "sport": "Horse Racing",
  "areaServed": { "@type": "Country", "name": "Venezuela" },
  "sameAs": [
    "https://www.instagram.com/tucuenta",
    "https://t.me/tucanal"
  ]
}
```

### 3.2 — Página de evento/reunión: `SportsEvent`

```json
{
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  "name": "Reunión Hípica 29 · La Rinconada",
  "startDate": "2026-07-26",
  "location": {
    "@type": "SportsActivityLocation",
    "name": "Hipódromo La Rinconada",
    "address": { "@type": "PostalAddress", "addressCountry": "VE" }
  },
  "organizer": {
    "@type": "Organization",
    "name": "Instituto Nacional de Hipismo (INH)",
    "url": "https://www.inh.gob.ve"
  },
  "url": "https://www.tusitio.com/revista/ID",
  "description": "Descripción del evento."
}
```

### 3.3 — Página de programa (múltiples carreras): Array de `SportsEvent`

Genera un JSON-LD por cada carrera de la reunión. Permite que Google muestre las carreras individuales en resultados enriquecidos.

```tsx
const sportsEvents = races.map(race => ({
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: `Carrera ${race.raceNumber} — ${trackName} Reunión ${meetingNumber}`,
  description: `${race.distance} metros. ${race.conditions}`,
  startDate: `${meetingDate}T${race.scheduledTime}`,
  location: {
    '@type': 'SportsActivityLocation',
    name: trackName,
    address: { '@type': 'PostalAddress', addressLocality: city, addressCountry: 'VE' },
  },
  competitor: entries.slice(0, 10).map(e => ({
    '@type': 'Person',
    name: e.horseName,
    description: `Dorsal ${e.dorsalNumber} · Jockey: ${e.jockeyName}`,
  })),
}));
```

### 3.4 — Página de transmisión en vivo: `BroadcastEvent`

```json
{
  "@context": "https://schema.org",
  "@type": "BroadcastEvent",
  "name": "Transmisión en Vivo · Hipódromo La Rinconada",
  "isLiveBroadcast": true,
  "broadcastOfEvent": {
    "@type": "SportsEvent",
    "name": "Carreras de Caballos La Rinconada",
    "location": {
      "@type": "SportsActivityLocation",
      "name": "Hipódromo La Rinconada"
    }
  }
}
```

### 3.5 — Página de datos de entrenamiento: `Dataset`

```json
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "Traqueos La Rinconada 26 de julio 2026",
  "description": "Tiempos y parciales oficiales de los caballos.",
  "url": "https://www.tusitio.com/traqueos/2026-07-26",
  "datePublished": "2026-07-26",
  "creator": {
    "@type": "Organization",
    "name": "INH",
    "url": "https://www.inh.gob.ve"
  },
  "variableMeasured": [
    { "@type": "PropertyValue", "name": "Tiempo parcial", "unitCode": "SEC" },
    { "@type": "PropertyValue", "name": "Distancia", "unitCode": "MTR" }
  ]
}
```

### 3.6 — Página de persona/handicapper: `profile` OG + keywords personalizadas

```tsx
return {
  title: `${profile.pseudonym} — Horse Racing Tips Venezuela`,
  description: `Picks by ${profile.pseudonym}. Win rate: ${stats.pct1st}%.`,
  keywords: [
    `tips ${profile.pseudonym}`,
    `${profile.pseudonym} horse racing Venezuela`,
    'horse racing tips Venezuela',
  ],
  openGraph: {
    type: 'profile',
  },
};
```

### 3.7 — BreadcrumbList

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://www.tusitio.com" },
    { "@type": "ListItem", "position": 2, "name": "Retrospectos", "item": "https://www.tusitio.com/retrospectos" },
    { "@type": "ListItem", "position": 3, "name": "Reunión 29 · La Rinconada", "item": "https://www.tusitio.com/revista/ID" }
  ]
}
```

### 3.8 — CollectionPage

```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Programa y Retrospectos · Desafío Hípico",
  "url": "https://www.tusitio.com/retrospectos",
  "hasPart": [
    { "@type": "SportsEvent", "name": "Reunión 29 · La Rinconada", "startDate": "2026-07-26", "url": "..." },
    { "@type": "SportsEvent", "name": "Reunión 28 · Valencia", "startDate": "2026-07-19", "url": "..." }
  ]
}
```


---

## 4. Open Graph y Twitter Cards

### Patrón estándar

```tsx
openGraph: {
  title: 'Título sin el sufijo de marca',
  description: 'Descripción optimizada para redes.',
  url: `https://www.tusitio.com/ruta`,
  siteName: 'Nombre del Sitio',
  locale: 'es_VE',
  type: 'website',
  images: [{
    url: `https://www.tusitio.com/api/og`,
    width: 1200,
    height: 630,
    alt: 'Descripción de la imagen',
  }],
},
twitter: {
  card: 'summary_large_image',
  site: '@TuCuentaTwitter',
  title: 'Título para Twitter',
  description: 'Descripción para Twitter.',
  images: [`https://www.tusitio.com/api/og`],
},
```

### Tipos OG por página

| Tipo de página | `type` |
|---|---|
| Homepage, listados, herramientas | `'website'` |
| Artículos, revista, resultados (con fecha) | `'article'` |
| Perfiles de personas | `'profile'` |

---

## 5. OG Images Dinámicas

Implementado con `@vercel/og` (ImageResponse) en Edge Runtime.

```tsx
import { ImageResponse } from '@vercel/og';
export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title') ?? 'Título por defecto';
  const subtitle = req.nextUrl.searchParams.get('subtitle') ?? 'Subtítulo';

  return new ImageResponse(<TuComponente title={title} subtitle={subtitle} />, {
    width: 1200,
    height: 630,
  });
}
```

Uso en páginas:

```tsx
const ogImg = `${BASE}/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(dateStr)}`;
images: [{ url: ogImg, width: 1200, height: 630 }]
```

Para perfiles se usa un endpoint separado con portrait 1080×1350 optimizado para WhatsApp/Stories.

---

## 6. Sitemap dinámico con frecuencia inteligente

```ts
function isRaceWeekend(): boolean {
  // Detecta si hoy es sábado o domingo en la zona horaria del hipódromo
  const veDay = /* cálculo con offset de timezone */;
  return veDay === 0 || veDay === 6;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const freq = isRaceWeekend() ? 'hourly' : 'daily';

  const staticPages = [
    { url: BASE, priority: 1.0, changeFrequency: freq },
    { url: `${BASE}/pronosticos`, priority: 0.95, changeFrequency: freq },
    { url: `${BASE}/retirados`, priority: 0.9, changeFrequency: freq },
    { url: `${BASE}/resultados`, priority: 0.92, changeFrequency: freq },
    { url: `${BASE}/en-vivo`, priority: 0.95, changeFrequency: 'daily' },
    { url: `${BASE}/retrospectos`, priority: 0.88, changeFrequency: 'weekly' },
  ];

  // Páginas dinámicas: reuniones recientes + próximas
  const meetingPages = meetings.map(m => ({
    url: `${BASE}/programa/${m._id}`,
    priority: isRecent ? 0.9 : 0.7,
    changeFrequency: isRecent ? freq : 'weekly',
  }));

  return [...staticPages, ...meetingPages, ...traqueoPages];
}
```

### Tabla de prioridades usada

| Página | Prioridad | Frecuencia |
|---|---|---|
| Homepage | 1.0 | hourly (race day) / daily |
| Pronósticos | 0.95 | hourly (race day) / daily |
| En Vivo | 0.95 | daily |
| Resultados | 0.92 | hourly (race day) / daily |
| Traqueos | 0.92 | hourly (race day) / daily |
| Retirados | 0.9 | hourly (race day) / daily |
| Reuniones recientes | 0.9 | hourly / weekly |
| Retrospectos | 0.88 | weekly |
| Ranking | 0.88 | daily |
| Reuniones antiguas | 0.7 | weekly |


---

## 7. Robots.txt — acceso a AI crawlers

Permitir explícitamente el acceso a crawlers de LLMs (GPT, Claude, Perplexity) para que el contenido sea indexado en respuestas de IA.

```ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pronosticos', '/retirados', '/programa/', '/resultados', '/revista/', '/retrospectos', '/traqueos', '/en-vivo', '/handicapper/'],
        disallow: ['/admin/', '/api/', '/perfil', '/auth/'],
      },
      {
        userAgent: ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Googlebot-News'],
        allow: ['/', '/pronosticos', '/retirados', '/programa/', '/resultados', '/revista/', '/retrospectos', '/handicapper/'],
        disallow: ['/admin/', '/api/', '/staff/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
```

---

## 8. Técnica del Párrafo Invisible (Ghost Text)

Párrafo en el HTML con keywords, en color prácticamente igual al fondo.
Visible para crawlers, invisible para usuarios.

```tsx
<p className="text-[11px] text-gray-800 text-center leading-relaxed px-4 pb-4">
  Resultados La Rinconada hoy · Cuánto pagó el 5y6 La Rinconada · Dividendos La Rinconada ·
  Resultados Valencia hoy · Cuánto pagó el 5y6 Valencia · Datos INH Venezuela ·
  Ganadores carreras La Rinconada · Posiciones oficiales INH
</p>
```

Versión dinámica por reunión:

```tsx
<p className="text-[11px] text-gray-800 text-center leading-relaxed px-4 pt-1">
  Datos {trackShort} Reunión {m.meetingNumber} ·
  Inscritos {trackShort} {dayName} {dd} de {mon} ·
  Cuánto pagó el 5y6 La Rinconada · Retrospectos La Rinconada · Gaceta hípica · Datos INH
</p>
```

---

## 9. H1 oculto accesible (sr-only)

```tsx
<h1 className="sr-only">
  La Rinconada · Reunión 29 · Domingo 26 de julio de 2026 · Datos e Inscritos
</h1>
```

El H1 contiene la keyword principal + lugar + fecha. Es invisible visualmente pero indexado por Google.

---

## 10. Canonical URLs

Todas las páginas tienen canonical URL para evitar contenido duplicado.

```tsx
alternates: {
  canonical: `https://www.tusitio.com/ruta/especifica`,
  languages: { 'es-VE': 'https://www.tusitio.com' },
},
```

---

## 11. Google Analytics / GSC

### Google Analytics 4

```tsx
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? 'G-XXXXXXXXXX';

<Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
<Script id="gtag-init" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_ID}');
  `}
</Script>
```

### Google Search Console

```tsx
verification: {
  google: process.env.NEXT_PUBLIC_GSC_TOKEN ?? '',
},
```

---

## 12. Revalidación y caché por tipo de página

| Tipo de dato | Estrategia | Valor |
|---|---|---|
| En vivo / resultados del día | `force-dynamic` | — |
| Datos que cambian cada hora | `revalidate` | 300 (5 min) |
| Datos semanales | `revalidate` | 3600 (1 hora) |
| Datos estáticos (pasados) | `revalidate` | 86400 (24 horas) |
| Snapshots de reuniones pasadas | Servir desde DB sin expirar | — |


---

## 13. Estructura de URLs

```
/                          → Homepage
/pronosticos               → Pronósticos del día
/resultados                → Resultados
/retirados                 → Retirados del día
/en-vivo                   → Transmisión en vivo
/retrospectos              → Índice de reuniones
/traqueos                  → Índice de traqueos
/ranking                   → Ranking de handicappers
/programa/[meetingId]      → Programa de una reunión específica
/revista/[meetingId]       → Revista/datos completos de una reunión
/traqueos/[date]           → Traqueos de una fecha específica (YYYY-MM-DD)
/resultados/[meetingId]    → Resultados de una reunión
/handicapper/[id]          → Perfil público de un handicapper
```

**Principios:** URLs cortas, semánticas, en minúsculas, sin acentos. Jerarquía `/categoría/[id]`.

---

## 14. Checklist de adaptación a otro idioma/país

### Variables a cambiar

- [ ] `lang="es-VE"` → `lang="en-GB"` en `<html>`
- [ ] `locale: 'es_VE'` → `locale: 'en_GB'` en OG
- [ ] `addressCountry: 'VE'` → `addressCountry: 'GB'` en JSON-LD
- [ ] Zona horaria del sitemap
- [ ] `twitter: { site: '@TuCuentaTwitter' }`
- [ ] GSC token y GA_ID

### Keywords a reemplazar

| Es-VE | En-GB |
|---|---|
| `inscritos La Rinconada hoy` | `today's runners Cheltenham` |
| `retirados del día` | `today's non-runners` |
| `resultados INH hoy` | `BHA results today` |
| `cuánto pagó el 5y6` | `how much did the jackpot pay` |
| `dividendos La Rinconada` | `tote returns Cheltenham` |
| `pronósticos hípicos` | `horse racing tips today` |
| `datos la rinconada reunión ${N}` | `runners Ascot meeting ${N}` |
| `gaceta hípica` | `Racing Post` |
| `traqueos INH` | `morning workout times` |
| `retrospectos hípicos` | `form guide` |

### Checklist de páginas a crear

- [ ] Homepage
- [ ] `/runners/[meetingId]` (programa)
- [ ] `/form/[meetingId]` (revista completa)
- [ ] `/results`
- [ ] `/non-runners`
- [ ] `/tips`
- [ ] `/live`
- [ ] `/workouts/[date]`
- [ ] `/past-meetings`

### Ghost text en inglés

```tsx
<p className="text-[11px] text-gray-800 text-center leading-relaxed px-4 pb-4">
  Cheltenham results today · today's non-runners · horse racing tips UK ·
  how much did the tote pay · BHA results · runners and riders today ·
  best horse racing tips today · free horse racing tips
</p>
```

---

## Resumen de técnicas por impacto

| Técnica | Impacto | Dificultad |
|---|---|---|
| `generateMetadata` dinámico | Alto | Medio |
| Keywords dinámicas con fecha + reunión | Alto | Bajo |
| Ghost text paragraph | Alto | Muy bajo |
| JSON-LD `SportsEvent` por carrera | Medio | Medio |
| H1 sr-only | Medio | Muy bajo |
| Sitemap dinámico | Medio | Medio |
| OG Images dinámicas | Medio | Medio |
| robots.txt con AI crawlers | Bajo-Medio | Muy bajo |
| BreadcrumbList | Bajo-Medio | Bajo |
| Canonical URLs | Bajo | Bajo |

---

*Guía generada desde el código real de desafiohipico.com — julio 2026.*
