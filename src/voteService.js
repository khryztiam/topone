/**
 * voteService.js — Backend Logic v2 (Votación al Mejor Empleado por Línea)
 *
 * ══════════════════════════════════════════════════════════════════
 *  FLUJO ANÓNIMO — PROTOCOLO DE 3 PASOS (mecánica idéntica, nuevo dominio)
 * ══════════════════════════════════════════════════════════════════
 *
 *  PASO A — VERIFICACIÓN Y BLOQUEO EN REGISTRO (Atómico)
 *    1. Recibe sapid del empleado votante
 *    2. Calcula voting_period = YYYY-MM actual
 *    3. INSERT vote_registry (sapid, voting_period)
 *       ← UNIQUE(sapid, voting_period) previene condición de carrera
 *
 *  PASO B — TOKEN VOLÁTIL (sin referencia al votante)
 *    1. gen_random_uuid() → token
 *    2. INSERT session_tokens (token, linea, expires_at=now+15min) — SIN sapid
 *
 *  PASO C — SUBMIT Y DESTRUCCIÓN DEL TOKEN
 *    1. Valida token, marca como usado
 *    2. INSERT anonymous_results[] (categoria, nominated_sapid, linea) — SIN votante
 *    3. DELETE token
 *
 *  PRIVACIDAD:
 *    - vote_registry: sabe QUIÉN votó, nunca A QUIÉN nominó
 *    - anonymous_results: sabe A QUIÉN nombraron, nunca QUIÉN votó
 * ══════════════════════════════════════════════════════════════════
 */

import {
  employeesMaster,
  voteRegistry,
  sessionTokens,
  anonymousResults,
  VOTING_CATEGORIES,
  DEMO_KIOSK,
} from './db.js';

const TOKEN_TTL_MS = 15 * 60 * 1000;

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function generateToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Empleados de una línea, opcionalmente filtrados por grupo. */
export function getEmployeesByLinea(linea, grupo = null) {
  return employeesMaster.filter(
    (e) => e.linea === linea && e.active && (!grupo || e.grupo === grupo)
  );
}

/**
 * PASO A + B: Verificar votante → emitir token de sesión
 * @param {string} sapid
 * @param {{ kiosk_user_id: string, cod_linea: number, linea: string }} kiosk
 * @returns {{ success, token, employeeName, linea, cod_linea, error, alreadyVoted }}
 */
export function initiateVoting(sapid, kiosk = DEMO_KIOSK) {
  const period = getCurrentPeriod();
  const id = sapid.trim();

  const employee = employeesMaster.find((e) => e.sapid === id && e.active);
  if (!employee) return { success: false, error: 'SAPID no encontrado. Verifica tu número de empleado.' };

  if (kiosk.cod_linea && employee.cod_linea !== kiosk.cod_linea) {
    return { success: false, error: 'Este kiosco corresponde a otra línea de producción.' };
  }

  if (voteRegistry.some((r) => r.sapid === id && r.voting_period === period)) {
    return { success: false, alreadyVoted: true };
  }

  voteRegistry.push({ id: `vr_${Date.now()}`, sapid: id, voting_period: period, voted_at: new Date().toISOString(), kiosk_user_id: kiosk.kiosk_user_id });

  const token = generateToken();
  sessionTokens.push({ token, cod_linea: employee.cod_linea, linea: employee.linea, expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(), used: false });

  return { success: true, token, employeeName: employee.nombre, linea: employee.linea, cod_linea: employee.cod_linea };
}

/**
 * PASO C: Registrar nominaciones con el token de sesión
 * @param {{ categoria: string, nominatedSapid: string }[]} votes
 * @returns {{ success, error }}
 */
export function submitVotes(token, votes, kioskUserId = DEMO_KIOSK.kiosk_user_id) {
  const period = getCurrentPeriod();

  const tokenRecord = sessionTokens.find(
    (t) => t.token === token && !t.used && new Date(t.expires_at) > new Date()
  );
  if (!tokenRecord) return { success: false, error: "Sesión inválida o expirada. Inicia el proceso nuevamente." };

  if (!votes || votes.length < 1) {
    return { success: false, error: "Votación incompleta. Debes elegir un empleado en cada categoría." };
  }

  for (const cat of VOTING_CATEGORIES) {
    if (!votes.find((v) => v.categoria === cat)) return { success: false, error: `Falta selección en la categoría: ${cat}` };
  }

  for (const vote of votes) {
    const nominated = employeesMaster.find((e) => e.sapid === vote.nominatedSapid && e.active);
    if (!nominated) return { success: false, error: `Empleado nominado no encontrado: ${vote.nominatedSapid}` };
  }

  tokenRecord.used = true;
  const { cod_linea, linea } = tokenRecord;

  votes.forEach(({ categoria, nominatedSapid }) => {
    anonymousResults.push({
      id: `ar_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      categoria, nominated_sapid: nominatedSapid,
      voting_period: period, cod_linea, linea, kiosk_user_id: kioskUserId,
      created_at: new Date().toISOString(),
    });
  });

  const idx = sessionTokens.findIndex((t) => t.token === token);
  if (idx !== -1) sessionTokens.splice(idx, 1);

  return { success: true };
}

/**
 * Resultados agregados por categoría para una línea y período.
 */
export function getResults(linea = null, period = null) {
  const p = period || getCurrentPeriod();
  const filtered = anonymousResults.filter(
    (r) => r.voting_period === p && (!linea || r.linea === linea)
  );

  return VOTING_CATEGORIES.map((categoria) => {
    const catVotes = filtered.filter((r) => r.categoria === categoria);
    const total = catVotes.length;
    const tally = {};
    catVotes.forEach((r) => { tally[r.nominated_sapid] = (tally[r.nominated_sapid] || 0) + 1; });

    const ranking = Object.entries(tally)
      .map(([sapid, count]) => {
        const emp = employeesMaster.find((e) => e.sapid === sapid);
        return { sapid, nombre: emp?.nombre || sapid, photo_url: emp?.photo_url || null, votes: count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 };
      })
      .sort((a, b) => b.votes - a.votes);

    return { categoria, totalVotes: total, ranking };
  });
}

/**
 * Estadísticas de participación para una línea y período.
 */
export function getStats(linea = null, period = null) {
  const p = period || getCurrentPeriod();
  const allActive = employeesMaster.filter((e) => e.active && (!linea || e.linea === linea));
  const votedCount = voteRegistry.filter((r) => {
    if (r.voting_period !== p) return false;
    if (!linea) return true;
    return employeesMaster.find((e) => e.sapid === r.sapid)?.linea === linea;
  }).length;

  return {
    period: p,
    linea: linea || "Todas las líneas",
    votedCount,
    totalEmployees: allActive.length,
    participationRate: allActive.length > 0 ? Math.round((votedCount / allActive.length) * 100) : 0,
  };
}
