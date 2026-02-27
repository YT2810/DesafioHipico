'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const GOLD = '#D4AF37';

const KNOWN_SOURCES: {
  name: string;
  handle?: string;
  link?: string;
  platform: string;
  priority: string;
  note?: string;
}[] = [
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

interface SourceStatus {
  _id: string;
  name: string;
  platform: string;
  handle: string | null;
  link: string | null;
  isVerified: boolean;
  isGhost: boolean;
  totalForecasts: number;
  lastPublishedAt: string | null;
  hasForecastForMeeting: boolean;
  forecastCountForMeeting: number;
}

interface Meeting {
  _id: string;
  meetingNumber: number;
  date: string;
  trackName: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  alta: 'bg-red-900/40 text-red-300 border-red-700',
  media: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  baja: 'bg-gray-800 text-gray-400 border-gray-700',
};

export default function SourcesPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [sources, setSources] = useState<SourceStatus[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/meetings/upcoming?limit=10')
      .then(r => r.json())
      .then(d => {
        const list = d.meetings ?? [];
        setMeetings(list);
        if (list.length > 0) setSelectedMeetingId(list[0]._id);
      });
  }, []);

  useEffect(() => {
    if (!selectedMeetingId) return;
    setLoading(true);
    fetch(`/api/admin/sources?meetingId=${selectedMeetingId}`)
      .then(r => r.json())
      .then(d => setSources(d.sources ?? []))
      .finally(() => setLoading(false));
  }, [selectedMeetingId]);

  // Merge known sources list with DB status
  const knownWithStatus = KNOWN_SOURCES.map(k => {
    const db = sources.find(
      s => s.name.toLowerCase().includes(k.name.split(' ')[0].toLowerCase()) ||
           (k.handle && s.handle?.toLowerCase() === k.handle.toLowerCase())
    );
    return { ...k, db };
  });

  // DB sources not in known list
  const unknownSources = sources.filter(s =>
    !KNOWN_SOURCES.some(k =>
      s.name.toLowerCase().includes(k.name.split(' ')[0].toLowerCase()) ||
      (k.handle && s.handle?.toLowerCase() === k.handle.toLowerCase())
    )
  );

  const selectedMeeting = meetings.find(m => m._id === selectedMeetingId);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/intelligence" className="text-xs text-gray-500 hover:text-gray-300">← Ingestor IA</Link>
          <h1 className="text-xl font-bold text-white mt-1">Catálogo de Fuentes</h1>
          <p className="text-xs text-gray-500 mt-0.5">Estado de ingesta por reunión</p>
        </div>
        <Link
          href="/admin/intelligence"
          className="text-xs font-bold text-black px-4 py-2 rounded-xl"
          style={{ backgroundColor: GOLD }}
        >
          + Ingestar
        </Link>
      </div>

      {/* Meeting selector */}
      <div className="space-y-1">
        <label className="text-xs text-gray-500 uppercase tracking-wide">Reunión</label>
        <select
          value={selectedMeetingId}
          onChange={e => setSelectedMeetingId(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
        >
          {meetings.map(m => (
            <option key={m._id} value={m._id}>
              {m.trackName} · Reunión {m.meetingNumber} · {new Date(m.date).toLocaleDateString('es-VE')}
            </option>
          ))}
        </select>
      </div>

      {/* Stats bar */}
      {selectedMeeting && !loading && (
        <div className="flex gap-3 text-xs">
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex-1 text-center">
            <div className="text-2xl font-bold text-white">
              {knownWithStatus.filter(k => k.db?.hasForecastForMeeting).length}
            </div>
            <div className="text-gray-500 mt-0.5">subidos</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex-1 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {knownWithStatus.filter(k => !k.db?.hasForecastForMeeting && k.priority === 'alta').length}
            </div>
            <div className="text-gray-500 mt-0.5">pendientes prioritarios</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex-1 text-center">
            <div className="text-2xl font-bold text-gray-400">
              {knownWithStatus.filter(k => !k.db?.hasForecastForMeeting && k.priority !== 'alta').length}
            </div>
            <div className="text-gray-500 mt-0.5">pendientes resto</div>
          </div>
        </div>
      )}

      {/* Known sources list */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Fuentes conocidas</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-600 text-sm">Cargando...</div>
        ) : (
          knownWithStatus.map((k, i) => {
            const uploaded = k.db?.hasForecastForMeeting ?? false;
            const count = k.db?.forecastCountForMeeting ?? 0;
            return (
              <div
                key={i}
                className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
                  uploaded
                    ? 'bg-green-950/20 border-green-800/40'
                    : 'bg-gray-900 border-gray-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${uploaded ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{k.name}</span>
                      <span className={`text-xs border rounded px-1.5 py-0.5 leading-none flex-shrink-0 ${PRIORITY_COLORS[k.priority]}`}>
                        {k.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {k.handle && (
                        <a
                          href={`https://x.com/${k.handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sky-400 hover:text-sky-300 px-2 py-0.5 rounded-lg transition-colors font-medium"
                        >
                          𝕏 @{k.handle}
                        </a>
                      )}
                      {k.link && (
                        <a
                          href={k.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs bg-red-950/40 hover:bg-red-900/40 border border-red-800/50 text-red-400 hover:text-red-300 px-2 py-0.5 rounded-lg transition-colors font-medium"
                        >
                          ▶ YouTube
                        </a>
                      )}
                      {k.note && (
                        <span className="text-xs text-gray-600 italic">{k.note}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {uploaded ? (
                    <span className="text-xs text-green-400 font-medium">✓ {count} carreras</span>
                  ) : (
                    <Link
                      href="/admin/intelligence"
                      className="text-xs font-bold text-black px-3 py-1.5 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: GOLD }}
                    >
                      Subir
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Other sources in DB */}
      {unknownSources.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Otras fuentes en DB</h2>
          {unknownSources.map((s, i) => (
            <div
              key={i}
              className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
                s.hasForecastForMeeting
                  ? 'bg-green-950/20 border-green-800/40'
                  : 'bg-gray-900 border-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${s.hasForecastForMeeting ? 'bg-green-500' : 'bg-gray-600'}`} />
                <div>
                  <span className="text-sm font-medium text-white">{s.name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{s.platform}</span>
                    {s.handle && <span className="text-xs text-gray-600">@{s.handle}</span>}
                    <span className="text-xs text-gray-600">{s.totalForecasts} total</span>
                  </div>
                </div>
              </div>
              {s.hasForecastForMeeting && (
                <span className="text-xs text-green-400 font-medium">✓ {s.forecastCountForMeeting} carreras</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
