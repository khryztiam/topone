/**
 * db.js — In-memory database simulation (maps 1:1 to Supabase/PostgreSQL schema v3)
 *
 * SCHEMA v3 — Votación al Mejor Empleado por Línea de Producción
 * ──────────────────────────────────────────────────────────────
 * TABLE 1: lineas          → Catálogo de líneas de producción (cod_linea, nombre)
 * TABLE 2: employees_master  → Tabla maestra mensual (sapid, nombre, linea, cod_linea, grupo, photo_url)
 * TABLE 3: vote_registry     → QUIÉN votó (sapid + mes). SIN contenido de voto.
 * TABLE 4: session_tokens    → Puente volátil. Destruido tras cada uso.
 * TABLE 5: anonymous_results → QUÉ nombraron (sapid del nominado, categoría). SIN votante.
 *
 * NOTA: authorized_stations eliminada. Kiosco identificado via Supabase Auth.
 *   El usuario kiosco tiene cod_linea en user_metadata/app_metadata del JWT.
 *
 * Zero FK entre vote_registry ↔ anonymous_results  ← garantía de privacidad
 */

// ── CATÁLOGO DE LÍNEAS (tabla `lineas` en Supabase) ────────────────────────────
// En producción: fuente = hoja Listado Maestro, cols C (cod) y D (nombre), fila 5 = headers
export const lineasCatalog = [
  { cod_linea: 33465, nombre: 'LINEA 15 D2-2' }, // piloto
  // resto de líneas disponibles en Supabase tabla `lineas`
];

// ── TABLA MAESTRA DE EMPLEADOS ────────────────────────────────────────────────
// En producción: cargada desde nómina cada mes (hoja L15 del Listado Maestro de personal.xlsx).
// photo_url  → Bucket 'avatares', carpeta 'santa_ana', archivo '{sapid}.jpeg'
//              Siempre generado aunque la foto no exista aún.
// linea      → Nombre de línea de producción (ej: 'LINEA 15 D2-2')
// cod_linea  → Código numérico de la línea (ej: 33465)
// grupo      → Número de grupo dentro de la línea
export const employeesMaster = [
  // LINEA 15 D2-2 — piloto (52 empleados reales, cargados en Supabase)
  // En demo local se usan solo algunos como referencia
  { sapid: '10189817', nombre: 'ELBA YANETH CABRERA DE PERAZA',    linea: 'LINEA 15 D2-2', cod_linea: 33465, grupo: 1, photo_url: 'https://wjzclsswoshdgzqgcbjv.supabase.co/storage/v1/object/public/avatares/santa_ana/10189817.jpeg', active: true },
  { sapid: '10316230', nombre: 'CARLOS EDUARDO PERAZA ACUÑA',       linea: 'LINEA 15 D2-2', cod_linea: 33465, grupo: 1, photo_url: 'https://wjzclsswoshdgzqgcbjv.supabase.co/storage/v1/object/public/avatares/santa_ana/10316230.jpeg', active: true },
  { sapid: '10590377', nombre: 'KARLA JAZMIN GODINEZ MORAN',        linea: 'LINEA 15 D2-2', cod_linea: 33465, grupo: 1, photo_url: 'https://wjzclsswoshdgzqgcbjv.supabase.co/storage/v1/object/public/avatares/santa_ana/10590377.jpeg', active: true },
  { sapid: '10679188', nombre: 'GABRIELA IVONNE CANO HERNANDEZ',    linea: 'LINEA 15 D2-2', cod_linea: 33465, grupo: 1, photo_url: 'https://wjzclsswoshdgzqgcbjv.supabase.co/storage/v1/object/public/avatares/santa_ana/10679188.jpeg', active: true },
  { sapid: '10729081', nombre: 'CARLOS ENRIQUE GUEVARA LINARES',    linea: 'LINEA 15 D2-2', cod_linea: 33465, grupo: 1, photo_url: 'https://wjzclsswoshdgzqgcbjv.supabase.co/storage/v1/object/public/avatares/santa_ana/10729081.jpeg', active: true },
  // Lista completa de 52 empleados disponible en Supabase (employees_master)
];

// ── VOTE REGISTRY (QUIÉN votó — SIN contenido de voto) ───────────────────────
// UNIQUE constraint simulado: (sapid, voting_period)
// kiosk_user_id: auth.uid() del usuario kiosco (reemplaza station_id)
export let voteRegistry = [];

// ── SESSION TOKENS (Puente volátil — sin sapid del votante) ──────────────────
export let sessionTokens = [];

// ── ANONYMOUS RESULTS (QUÉ nombraron — SIN referencia al votante) ────────────
// nominated_sapid: SAPID del empleado NOMINADO (no del votante)
// cod_linea + linea: contexto del kiosco
// kiosk_user_id: auth.uid() del kiosco (soft ref, no FK)
export let anonymousResults = [];

// ── CATEGORÍAS DE VOTACIÓN (fijas por requerimiento) ─────────────────────────
// El votante debe elegir UN empleado en CADA categoría.
export const VOTING_CATEGORIES = ['Encintado', 'Línea Final', 'Subensamble', 'Armado'];

// ── KIOSK DEMO (reemplaza allowedStations — en prod: usuario Supabase Auth) ──
// El kiosco real se autentica con Supabase Auth y lee cod_linea de su JWT.
export const DEMO_KIOSK = {
  kiosk_user_id: 'demo-kiosk-l15',
  cod_linea: 33465,
  linea: 'LINEA 15 D2-2',
};
