import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Preguntas frecuentes · Desafío Hípico',
  description: 'Todo lo que necesitas saber sobre Gold, Factor de Victoria y cómo funciona Desafío Hípico.',
};

const GOLD = '#D4AF37';

const sections = [
  { title: '¿Qué es Desafío Hípico?', items: [
    { q: '¿Qué hace esta plataforma?', a: 'Reúne y analiza los pronósticos de los mejores analistas hípicos de Venezuela. En lugar de ver 20 videos de YouTube o seguir decenas de cuentas, aquí tienes todo resumido en el Factor de Victoria.' },
    { q: '¿Es una plataforma de apuestas?', a: 'No. Somos una plataforma de información y análisis. No gestionamos apuestas ni dinero de jugadas.' },
    { q: '¿Puedo registrarme desde Colombia u otro país?', a: 'Sí. El registro es gratis y abierto a cualquier país. El pago se procesa por transferencia en Venezuela (Bs). Si eres del exterior, escríbenos a desafiohipicoapp@gmail.com.' },
    { q: '¿El registro tiene algún costo?', a: 'No. Registrarse es totalmente gratis y recibes Gold de bienvenida para explorar el sistema.' },
  ]},
  { title: '¿Qué es el Factor de Victoria?', items: [
    { q: '¿Cómo se calcula el Factor de Victoria?', a: 'Es el consenso matemático de múltiples analistas especializados. El algoritmo evalúa cuántos lo marcan como fijo y en qué posición lo ubican. No es la opinión de una sola persona.' },
    { q: '¿Qué tan efectivo es?', a: 'En 8 de cada 10 carreras, el caballo ganador estuvo entre los 3 primeros del Factor de Victoria. Este porcentaje se actualiza automáticamente con los resultados oficiales del INH.' },
    { q: '¿Por qué los pronosticadores cambian según el día?', a: 'Los analistas publican en distintos días. Los domingos hay más fuentes activas. El Factor de Victoria se actualiza a medida que llegan más pronósticos durante el día.' },
    { q: '¿Los pronósticos individuales de los analistas son gratis?', a: 'Sí. Las marcas de cada analista son siempre visibles sin costo. Lo que se desbloquea con Gold es el Factor de Victoria: el consenso procesado y ordenado por el algoritmo.' },
  ]},
  { title: '¿Qué son los Gold?', items: [
    { q: '¿Para qué sirven los Gold?', a: 'Son el saldo para ver el Factor de Victoria. Ver una carrera suelta cuesta 2 Gold. Ver toda la jornada cuesta 1 Gold por cada carrera del programa del día.' },
    { q: '¿Los Gold vencen o tienen fecha de expiración?', a: 'No. Los Gold no tienen fecha de vencimiento. Se acumulan indefinidamente y los usas cuando quieras.' },
    { q: 'Compré 10 Gold, usé 6. ¿Qué pasa con los 4 restantes?', a: 'Te quedan disponibles sin límite de tiempo. Úsalos en la próxima jornada, en carreras sueltas, o acumúlalos para más adelante.' },
    { q: '¿Cuánto cuesta ver toda una jornada?', a: 'El costo es 1 Gold por cada carrera del programa del día. El sistema te muestra el total exacto antes de confirmar: sin sorpresas.' },
  ]},
  { title: 'Recargas y planes', items: [
    { q: '¿Cuál es el depósito mínimo?', a: 'El plan más pequeño es el Arranque (10 Gold). El monto exacto en Bs se muestra en tiempo real al momento de recargar.' },
    { q: '¿Cuál es la diferencia entre los planes?', a: 'Todos dan acceso a la misma información. La diferencia es cuántos Gold recibes: a mayor plan, mejor precio por Gold. Arranque: para probar el sistema. Jinete: el más elegido. Padrillo: para el que juega en serio.' },
    { q: '¿Los Gold de un plan son iguales a los de otro?', a: 'Sí. 1 Gold es 1 Gold sin importar el plan que elijas. Solo cambia la cantidad que recibes y el precio total.' },
    { q: 'Hice un depósito pero no veo mis Gold reflejados', a: 'Los Gold se acreditan en menos de 24 horas hábiles. Si han pasado más de 24h, escríbenos a desafiohipicoapp@gmail.com con tu número de referencia y te respondemos de inmediato.' },
  ]},
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-white text-sm transition-colors">← Inicio</Link>
          <h1 className="text-base font-bold text-white">Preguntas frecuentes</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <p className="text-2xl font-extrabold text-white">¿Tienes dudas?</p>
          <p className="text-sm text-gray-400">Aquí resolvemos las más comunes. Si no encuentras tu respuesta, escríbenos.</p>
        </div>
        {sections.map(section => (
          <div key={section.title} className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest font-bold text-gray-500 border-b border-gray-800 pb-2">{section.title}</h2>
            {section.items.map(item => (
              <details key={item.q} className="group bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer list-none">
                  <span className="text-sm font-semibold text-white group-open:text-yellow-300 transition-colors">{item.q}</span>
                  <span className="shrink-0 text-gray-600 group-open:text-yellow-500 text-xl leading-none select-none">+</span>
                </summary>
                <div className="px-4 pb-4 pt-3 text-sm text-gray-400 leading-relaxed border-t border-gray-800">{item.a}</div>
              </details>
            ))}
          </div>
        ))}
        <div className="rounded-2xl border border-yellow-800/40 bg-yellow-950/20 p-5 text-center space-y-3">
          <p className="text-sm font-bold text-white">¿No encontraste tu respuesta?</p>
          <p className="text-xs text-gray-400">Escríbenos y te respondemos en menos de 24 horas.</p>
          <a href="mailto:desafiohipicoapp@gmail.com"
            className="inline-block px-5 py-2.5 rounded-xl text-sm font-bold text-black"
            style={{ backgroundColor: GOLD }}>
            Contactar soporte →
          </a>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-bold text-white">¿Listo para ver el Factor de Victoria?</p>
            <p className="text-xs text-gray-500 mt-0.5">8 de cada 10 carreras — el ganador estuvo en el Top 3.</p>
          </div>
          <Link href="/pronosticos"
            className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold text-black whitespace-nowrap"
            style={{ backgroundColor: GOLD }}>
            Ver pronósticos →
          </Link>
        </div>
      </main>
    </div>
  );
}
