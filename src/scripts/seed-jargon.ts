/**
 * Seed del jergario base del hipismo venezolano.
 * Ejecutar: npx ts-node --compiler-options '{"module":"commonjs"}' src/scripts/seed-jargon.ts
 */
import mongoose from 'mongoose';
import JargonEntry from '../models/JargonEntry';

const MONGO_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || '';

const SEED_DATA = [
  // ── CONSENSUS / MARCAS ──────────────────────────────────────────────
  {
    phrase: 'clavito',
    intent: 'consensus_pick',
    keywords: ['clavito', 'clavo', 'clavado'],
    description: 'Caballo que se considera ganador seguro de una carrera, el favorito por consenso.',
    example: 'Dame un clavito para la tercera carrera.',
    synonyms: ['clavo', 'clavado', 'clavao'],
    public: true,
  },
  {
    phrase: 'fijo',
    intent: 'consensus_pick',
    keywords: ['fijo', 'fijito', 'el fijo'],
    description: 'Caballo que se considera ganador seguro, sin discusión entre los expertos.',
    example: '¿Cuál es el fijo de la quinta?',
    synonyms: ['fijito', 'el fijo', 'fijo fijo'],
    public: true,
  },
  {
    phrase: 'línea',
    intent: 'consensus_pick',
    keywords: ['línea', 'linea', 'dame línea', 'una línea'],
    description: 'Recomendación o pronóstico para una carrera. Pedir "una línea" es pedir la marca principal.',
    example: 'Dame una línea para la sexta.',
    synonyms: ['lineita', 'la línea', 'líneas'],
    public: true,
  },
  {
    phrase: 'flecha',
    intent: 'consensus_pick',
    keywords: ['flecha', 'flechas', 'las flechas'],
    description: 'Caballo señalado como candidato principal por los pronosticadores.',
    example: 'Las flechas del día apuntan a Toro Salvaje.',
    synonyms: ['flechas', 'las flechas', 'flecha del día'],
    public: true,
  },
  {
    phrase: 'marca',
    intent: 'consensus_pick',
    keywords: ['marca', 'marcas', 'dos marcas', 'primera marca', 'segunda marca'],
    description: 'Selección de un pronosticador para una carrera. La primera marca es el favorito, la segunda el complemento.',
    example: 'Dame las dos marcas de la carrera 7.',
    synonyms: ['marcas', '1ra marca', '2da marca', 'las marcas'],
    public: true,
  },
  {
    phrase: 'dato',
    intent: 'consensus_pick',
    keywords: ['dato', 'datos', 'un dato', 'dame un dato'],
    description: 'Información privilegiada o pronóstico sobre una carrera.',
    example: 'Dame un dato para la primera válida.',
    synonyms: ['datos', 'datico', 'el dato'],
    public: true,
  },
  {
    phrase: 'punta',
    intent: 'consensus_pick',
    keywords: ['punta', 'puntas', 'la punta'],
    description: 'Caballo que se espera tome la delantera y gane la carrera.',
    example: '¿Quién es la punta en la cuarta?',
    synonyms: ['puntas', 'la punta', 'puntero'],
    public: true,
  },
  {
    phrase: 'gallo',
    intent: 'consensus_pick',
    keywords: ['gallo', 'gallazo', 'el gallo'],
    description: 'Caballo favorito, el que todos consideran va a ganar.',
    example: '¿Quién es el gallo de la carrera?',
    synonyms: ['gallazo', 'el gallo', 'gallito'],
    public: true,
  },

  // ── MARCAS TODAS LAS CARRERAS ──────────────────────────────────────
  {
    phrase: 'flechas del día',
    intent: 'top_picks_all',
    keywords: ['flechas del día', 'todos los fijos', 'ganadores del día', 'marcas del día'],
    description: 'Pedir los favoritos o candidatos principales de todas las carreras del día.',
    example: 'Dame las flechas del día para La Rinconada.',
    synonyms: ['ganadores de hoy', 'fijos del día', 'marcas de hoy', 'las flechas de hoy'],
    public: true,
  },
  {
    phrase: 'dame los ganadores',
    intent: 'top_picks_all',
    keywords: ['ganadores', 'los ganadores', 'dame los ganadores'],
    description: 'Solicitud de los candidatos principales de todas las carreras.',
    example: 'Dame los ganadores de La Rinconada.',
    synonyms: ['quiénes ganan hoy', 'quiénes van a ganar'],
    public: true,
  },

  // ── 5 Y 6 ──────────────────────────────────────────────────────────
  {
    phrase: '5 y 6',
    intent: 'pack_5y6',
    keywords: ['5y6', '5 y 6', 'cinco y seis', '5&6'],
    description: 'Apuesta combinada de las últimas 6 carreras válidas de la jornada. Es la apuesta más popular del hipismo venezolano.',
    example: 'Dame el cuadro del 5y6 de hoy.',
    synonyms: ['cinco y seis', '5&6', 'el 5y6', '5 y 6 de hoy'],
    public: true,
  },
  {
    phrase: 'cuadro',
    intent: 'pack_5y6',
    keywords: ['cuadro', 'cuadro del 5y6', 'cuadrito'],
    description: 'Tabla o formulario con las selecciones del 5y6. Muestra las marcas de cada válida.',
    example: 'Arma un cuadro para el 5y6.',
    synonyms: ['cuadrito', 'el cuadro', 'cuadro base'],
    public: true,
  },
  {
    phrase: 'válida',
    intent: 'pack_5y6',
    keywords: ['válida', 'valida', 'válidas', 'las válidas'],
    description: 'Carrera que cuenta para el 5y6. Las últimas 6 carreras de la jornada son las válidas.',
    example: 'Dame los datos de la tercera válida.',
    synonyms: ['validas', 'las válidas', 'carrera válida'],
    public: true,
  },

  // ── TRAQUEOS / TRABAJOS ────────────────────────────────────────────
  {
    phrase: 'traqueo',
    intent: 'best_workout',
    keywords: ['traqueo', 'traqueos', 'trabajo', 'trabajos', 'briseo'],
    description: 'Entrenamiento cronometrado de un caballo en la pista. Indica su forma física actual.',
    example: '¿Cómo traqueó Oklahoma esta semana?',
    synonyms: ['trabajos', 'briseo', 'briseos', 'entrenamiento', 'obra'],
    public: true,
  },
  {
    phrase: 'quién viene bien',
    intent: 'best_workout',
    keywords: ['viene bien', 'viene volando', 'viene fuerte', 'mejor trabajo'],
    description: 'Preguntar qué caballo tiene los mejores entrenamientos recientes.',
    example: '¿Quién viene bien para la sexta carrera?',
    synonyms: ['quién viene fuerte', 'quién trabajó mejor', 'mejor traqueo'],
    public: true,
  },
  {
    phrase: 'cómo viene',
    intent: 'horse_detail',
    keywords: ['cómo viene', 'como viene', 'cómo está', 'como esta'],
    description: 'Preguntar por la forma actual de un caballo específico.',
    example: '¿Cómo viene Toro Salvaje?',
    synonyms: ['qué tal viene', 'cómo llega'],
    public: true,
  },

  // ── ELIMINADOS ─────────────────────────────────────────────────────
  {
    phrase: 'eliminados',
    intent: 'eliminated',
    keywords: ['eliminados', 'eliminado', 'retirados', 'retirado', 'raspados'],
    description: 'Caballos que fueron inscritos pero retirados antes de la carrera.',
    example: '¿Hay eliminados en la tercera?',
    synonyms: ['retirados', 'raspados', 'raspao', 'los eliminados', 'quién se cayó'],
    public: true,
  },

  // ── PROGRAMA ───────────────────────────────────────────────────────
  {
    phrase: 'programa',
    intent: 'full_program',
    keywords: ['programa', 'inscritos', 'quién corre', 'quien corre'],
    description: 'Lista oficial de caballos inscritos para las carreras del día.',
    example: 'Dame el programa de La Rinconada para el domingo.',
    synonyms: ['inscritos', 'quién corre hoy', 'elenco'],
    public: true,
  },
  {
    phrase: 'elenco',
    intent: 'race_program',
    keywords: ['elenco', 'el elenco', 'lote'],
    description: 'Grupo de caballos inscritos en una carrera específica.',
    example: '¿Cuál es el elenco de la quinta?',
    synonyms: ['lote', 'el lote', 'los inscritos'],
    public: true,
  },

  // ── TERMINOLOGÍA GENERAL (pública para SEO) ────────────────────────
  {
    phrase: 'ejemplar',
    intent: 'unknown',
    keywords: ['ejemplar'],
    description: 'Forma formal de referirse a un caballo de carrera.',
    example: 'Ese ejemplar viene en gran forma.',
    synonyms: ['caballo', 'equino', 'pura sangre'],
    public: true,
  },
  {
    phrase: 'gualdrapa',
    intent: 'unknown',
    keywords: ['gualdrapa'],
    description: 'Término despectivo para un caballo que corre mal o no tiene posibilidades.',
    example: 'Esa gualdrapa no gana ni regalándole la carrera.',
    synonyms: ['gualdrapón', 'penco'],
    public: true,
  },
  {
    phrase: 'batacazo',
    intent: 'consensus_pick',
    keywords: ['batacazo', 'bataca', 'batazo'],
    description: 'Caballo con alta cuota que sorprende ganando. Sinónimo de sorpresa o upset.',
    example: 'Hoy hay un batacazo en la séptima.',
    synonyms: ['batazo', 'sorpresa', 'el tapado'],
    public: true,
  },
  {
    phrase: 'tapado',
    intent: 'consensus_pick',
    keywords: ['tapado', 'el tapado', 'tapadito'],
    description: 'Caballo poco considerado por el público pero con posibilidades reales de ganar.',
    example: 'El tapado de la carrera es el número 8.',
    synonyms: ['tapadito', 'el oscuro', 'caballo oculto'],
    public: true,
  },
  {
    phrase: 'taquilla',
    intent: 'unknown',
    keywords: ['taquilla'],
    description: 'Ventanilla o punto donde se realizan las apuestas en el hipódromo.',
    example: 'Vamos a la taquilla antes de que cierren.',
    synonyms: ['ventanilla'],
    public: true,
  },
  {
    phrase: 'baranda',
    intent: 'unknown',
    keywords: ['baranda'],
    description: 'Zona del hipódromo desde donde los aficionados ven las carreras de cerca.',
    example: 'Lo vi desde la baranda y venía volando.',
    synonyms: ['la baranda', 'barandita'],
    public: true,
  },
  {
    phrase: 'remate',
    intent: 'unknown',
    keywords: ['remate'],
    description: 'Últimos metros de la carrera o del entrenamiento. También el tiempo del último tramo.',
    example: 'Tuvo un remate de 12.3 en los últimos 200 metros.',
    synonyms: ['cierre', 'sprint final'],
    public: true,
  },
  {
    phrase: 'casi fijo',
    intent: 'consensus_pick',
    keywords: ['casi fijo', 'casifijo'],
    description: 'Etiqueta que indica un caballo con muy alto consenso entre los pronosticadores.',
    example: 'Tintorero está marcado como casi fijo en la sexta.',
    synonyms: ['casifijo', 'super fijo'],
    public: true,
  },
  {
    phrase: 'súper especial',
    intent: 'consensus_pick',
    keywords: ['súper especial', 'super especial'],
    description: 'Etiqueta para un caballo con consenso fuerte pero no unánime.',
    example: 'Zadkiel es súper especial en la quinta.',
    synonyms: ['super especial'],
    public: true,
  },
  {
    phrase: 'lorito',
    intent: 'unknown',
    keywords: ['lorito', 'loro'],
    description: 'Persona que da pronósticos sin fundamento, repitiendo lo que dicen otros sin análisis propio.',
    example: 'No le hagas caso a ese lorito, revisa los números.',
    synonyms: ['loro', 'loritos', 'loros'],
    public: true,
  },
  {
    phrase: 'oficina',
    intent: 'unknown',
    keywords: ['oficina', 'socios de oficina'],
    description: 'Grupo de amigos o conocidos que comparten información hípica y jugadas.',
    example: 'En la oficina estamos fuertes con el número 3.',
    synonyms: ['la oficina', 'socios', 'combo'],
    public: true,
  },
  {
    phrase: 'speed rating',
    intent: 'unknown',
    keywords: ['speed rating', 'rating'],
    description: 'Calificación numérica de la velocidad de un caballo basada en sus tiempos de carrera.',
    example: 'El speed rating de este ejemplar es superior al resto.',
    synonyms: ['rating de velocidad', 'sr'],
    public: true,
  },
  {
    phrase: 'pedigree',
    intent: 'unknown',
    keywords: ['pedigree', 'pedigrí', 'linaje'],
    description: 'Línea de sangre o genealogía del caballo. Padre, madre y abuelos.',
    example: 'Por pedigree, este ejemplar debería rendir en distancia larga.',
    synonyms: ['pedigrí', 'linaje', 'sangre', 'genealogía'],
    public: true,
  },
];

async function seed() {
  if (!MONGO_URI) {
    console.error('Falta MONGODB_URI o DATABASE_URL');
    process.exit(1);
  }
  await mongoose.connect(MONGO_URI);
  console.log('Conectado a MongoDB');

  let created = 0;
  let skipped = 0;
  for (const entry of SEED_DATA) {
    const exists = await JargonEntry.findOne({ phrase: entry.phrase });
    if (exists) {
      skipped++;
      continue;
    }
    await JargonEntry.create({ ...entry, source: 'seed' });
    created++;
  }

  console.log(`Seed completo: ${created} creados, ${skipped} ya existían`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
