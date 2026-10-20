import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Preguntas frecuentes · Desafío Hípico',
  description: 'Todo lo que necesitas saber sobre los Pases Nacionales, el Factor de Victoria, los diagnósticos de carrera y cómo funciona Desafío Hípico.',
};

const GOLD = '#D4AF37';

const sections = [
  { title: '¿Qué es Desafío Hípico?', items: [
    { q: '¿Qué hace esta plataforma?', a: 'Reúne y analiza los pronósticos de los mejores analistas hípicos de Venezuela. En lugar de ver 20 videos de YouTube o seguir decenas de cuentas, aquí tienes todo resumido en el Factor de Victoria.' },
    { q: '¿Es una plataforma de apuestas?', a: 'No. Somos una plataforma de información y análisis. No gestionamos apuestas ni dinero de jugadas.' },
    { q: '¿Puedo registrarme desde Colombia u otro país?', a: 'Sí. El registro es gratis y abierto a cualquier país. El pago se procesa por transferencia en Venezuela (Bs). Si eres del exterior, escríbenos a desafiohipicoapp@gmail.com.' },
    { q: '¿El registro tiene algún costo?', a: 'No. Registrarse es totalmente gratis. Sin importar tu plan, tienes acceso a la Revista Digital, los Inscritos y los Traqueos de cada reunión — sin pagar nada.' },
  ]},
  { title: '¿Qué es el Factor de Victoria?', items: [
    { q: '¿Cómo se calcula el Factor de Victoria?', a: 'Es el consenso matemático de múltiples analistas especializados. El algoritmo evalúa cuántos lo marcan como fijo y en qué posición lo ubican. No es la opinión de una sola persona.' },
    { q: '¿Qué tan efectivo es?', a: 'En 8 de cada 10 carreras, el caballo ganador estuvo entre los 3 primeros del Factor de Victoria. Este porcentaje se actualiza automáticamente con los resultados oficiales.' },
    { q: '¿Por qué los pronosticadores cambian según el día?', a: 'Los analistas publican en distintos días. El Factor de Victoria se actualiza a medida que llegan más pronósticos. Normalmente los inscritos están disponibles el martes en la noche y el FV va completándose hacia el jueves-viernes.' },
    { q: '¿Los pronósticos individuales de los analistas son gratis?', a: 'Sí. Las marcas de cada analista son siempre visibles. Lo que se desbloquea con el Pase Nacional es el Factor de Victoria completo de todas las carreras y el Diagnóstico de Riesgo de cada una.' },
  ]},
  { title: 'Inscripciones, Inscritos y Fase 1', items: [
    { q: '¿Qué son los Inscritos?', a: 'Es la lista oficial de caballos anotados para la próxima reunión, publicada por el INH generalmente el martes en la noche. La encuentras gratis en la Revista Digital de cada reunión.' },
    { q: '¿Qué significa Fase 1 en una carrera?', a: 'Antes de que estén listos los pronósticos del FV, el sistema ya clasifica cada carrera según su tipo de lote: si hay muchos caballos en distancia corta, si los contrincantes son perdedores recientes, el llamado oficial (Clásico, Reclamo, etc.) y el tamaño del campo. Eso es la Fase 1.' },
    { q: '¿Para qué sirve la Fase 1?', a: 'Te da un primer diagnóstico de si la carrera se perfila como "lógica" (pocas sorpresas) o como "explosiva" (campo numeroso con condiciones que históricamente producen dividendos altos). Es un adelanto que puedes ver el miércoles sin esperar a que lleguen todos los pronósticos.' },
  ]},
  { title: 'Diagnóstico de Carrera — Leyenda de Alertas', items: [
    { q: '¿Qué significa el Candado de Corte Limpio?', a: 'El sistema detectó que solo 2 caballos concentran el consenso de los pronosticadores y el 3.° cae muy abajo en el ranking. Históricamente, en esas carreras el ganador fue uno de los 2 primeros del FV en el 83.9% de los casos. Es la señal más sólida del algoritmo.' },
    { q: '¿Qué es la Trilogía de Corte Limpio?', a: 'Similar al Candado, pero con los 3 primeros concentrando el consenso y el 4.° cayendo claramente. Alta lógica, poca sorpresa. El ganador fue del Top 3 en el 74% de esas carreras.' },
    { q: '¿Qué es una Carrera Noble de Alta Lógica?', a: 'Carreras en distancias de 1.500 m o más y/o con llamado Clásico o Reclamo. En esas condiciones históricamente el ganador siempre estuvo en el Top 5 del FV — ningún caballo fuera del Top 5 ha ganado en nuestros registros de 2026.' },
    { q: '¿Qué significa la Alerta de Sorpresa?', a: 'La carrera tiene uno o más indicadores activos que históricamente están asociados a resultados inesperados: campo numeroso en distancia corta, lote de perdedores, sin favorito claro por debajo del 40%. A mayor número de alertas activas, más abierta es la carrera y más probable es que el ganador no sea el 1.° o 2.° del FV.' },
    { q: '¿Cuántas alertas puede tener una carrera?', a: 'El algoritmo evalúa hasta 6 indicadores. Una carrera con 1-2 alertas aún puede ser razonablemente lógica. Con 3 o más alertas activas simultáneas, la probabilidad de una sorpresa se eleva significativamente según nuestros datos históricos.' },
    { q: '¿Puedo ver el Diagnóstico de Carrera sin pagar?', a: 'Verás la cantidad de indicadores activos ("El Algoritmo detectó 3 indicadores en esta carrera") pero no la leyenda completa. Para ver exactamente cuáles son y qué significan, necesitas el Pase Nacional Semanal (Bs. 6.000) o Mensual (Bs. 20.000).' },
  ]},
  { title: 'Pases Nacionales', items: [
    { q: '¿Qué es el Pase Nacional Semanal?', a: 'Bs. 6.000 y te da acceso completo a todas las carreras de La Rinconada y Valencia de lunes a domingo: Factor de Victoria de cada carrera, Diagnóstico de Riesgo completo (Candado, Alerta, etc.) y el Cuadro 5y6 VIP del Algoritmo.' },
    { q: '¿Qué es el Pase Nacional Mensual?', a: 'Bs. 20.000 y te da todo lo del Semanal pero por 30 días corridos (4 semanas completas). Es la opción de quienes juegan todas las semanas.' },
    { q: '¿En qué se diferencian el Pase Nacional y las Carreras Americanas?', a: 'El Pase Nacional cubre las reuniones de La Rinconada (Caracas) y el Hipódromo Nacional de Valencia (Venezuela). Las carreras americanas, cuando estén disponibles, tendrán su propio Pase. Uno no incluye al otro.' },
    { q: '¿Cuánto tarda en activarse mi Pase?', a: 'En menos de 24 horas hábiles una vez que verificamos tu Pago Móvil. Te llega una notificación y al entrar a /pronosticos verás todas las carreras desbloqueadas.' },
    { q: '¿Qué pasa si compro el Pase Semanal el viernes?', a: 'Tu acceso queda activo hasta el domingo de esa semana a las 11:59 pm. En la siguiente semana necesitarías activar uno nuevo.' },
  ]},
  { title: 'Mis Golds — usuarios con saldo anterior', items: [
    { q: 'Tengo Golds en mi cuenta, ¿siguen funcionando?', a: 'Sí, completamente. Tus Golds siguen siendo válidos para desbloquear carreras sueltas exactamente igual que siempre. No necesitas hacer nada ni canjearlos.' },
    { q: '¿Puedo seguir usando Golds para ver el Factor de Victoria?', a: 'Sí. Cada carrera cuesta 2 Golds si la desbloqueas individualmente. También puedes desbloquear toda la jornada gastando 1 Gold por cada carrera del programa.' },
    { q: '¿Los Golds me dan acceso al Diagnóstico de Carrera y al Cuadro 5y6 VIP?', a: 'Actualmente esas funciones están disponibles para usuarios con Pase Nacional activo. Si tienes Golds sobrantes y quieres acceder a esas funciones, activa el Pase Semanal (Bs. 6.000) y conservas también tus Golds.' },
    { q: '¿Se siguen vendiendo Golds nuevos?', a: 'Desde el modal de Activación de Pase solo ofrecemos Pases Nacionales. Los Golds que ya tienes en tu cuenta siguen siendo tuyos y funcionando sin problema.' },
  ]},
  { title: 'Cuadro 5y6 VIP del Algoritmo', items: [
    { q: '¿Qué es el Cuadro 5y6 VIP?', a: 'Es la combinación de caballos que el Algoritmo FV recomienda para jugar el Cinco y Seis. Puedes verlo en el botón dorado flotante (👑 5y6) en cualquier página. Incluye variantes Económico y Medio con distintas coberturas y costos.' },
    { q: '¿Es una garantía de ganar el 5y6?', a: 'No. Es el cuadro basado en el consenso del Factor de Victoria, que históricamente ha dado en el 52% de las reuniones de 2026. No es una garantía; es una herramienta de análisis.' },
    { q: '¿Cuándo se activa el Cuadro 5y6 VIP?', a: 'Se activa automáticamente para usuarios con Pase Nacional activo esa semana. Si tu Pase vence el domingo, el lunes siguiente necesitas un nuevo Pase para seguir viéndolo.' },
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
