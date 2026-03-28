/**
 * GET /api/admin/results
 * Resultados detallados por período y línea opcional.
 * Devuelve: periodos, resumen por línea, top nominados por línea.
 */
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const { period, cod_linea } = req.query;

  const now = new Date();
  const currentPeriod =
    period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const lineaFilter = cod_linea ? parseInt(cod_linea, 10) : null;

  // Available periods
  const { data: periodsData } = await supabaseAdmin
    .from('anonymous_results')
    .select('voting_period')
    .order('voting_period', { ascending: false });

  const periods = [...new Set((periodsData || []).map((r) => r.voting_period))];
  if (!periods.includes(currentPeriod)) periods.unshift(currentPeriod);

  // Votes for period
  let votesQ = supabaseAdmin
    .from('anonymous_results')
    .select('cod_linea, linea, nominated_sapid')
    .eq('voting_period', currentPeriod)
    .eq('categoria', 'general');

  if (lineaFilter) votesQ = votesQ.eq('cod_linea', lineaFilter);

  const { data: votes, error: votesErr } = await votesQ;
  if (votesErr) return res.status(500).json({ error: votesErr.message });

  // Employees
  let empQ = supabaseAdmin
    .from('employees_master')
    .select('sapid, nombre, cod_linea, linea, photo_url')
    .eq('active', true);

  if (lineaFilter) empQ = empQ.eq('cod_linea', lineaFilter);

  const { data: employees, error: empErr } = await empQ;
  if (empErr) return res.status(500).json({ error: empErr.message });

  const empMap = {};
  (employees || []).forEach((e) => { empMap[e.sapid] = e; });

  // Aggregate: nominees per line
  const nomineeMap = {};
  (votes || []).forEach((v) => {
    const key = `${v.cod_linea}:${v.nominated_sapid}`;
    if (!nomineeMap[key]) {
      nomineeMap[key] = { cod_linea: v.cod_linea, linea: v.linea, sapid: v.nominated_sapid, count: 0 };
    }
    nomineeMap[key].count++;
  });

  const votesByLinea = {};
  (votes || []).forEach((v) => {
    votesByLinea[v.cod_linea] = (votesByLinea[v.cod_linea] || 0) + 1;
  });

  const empByLinea = {};
  (employees || []).forEach((e) => {
    empByLinea[e.cod_linea] = (empByLinea[e.cod_linea] || 0) + 1;
  });

  // Group nominees by line, sorted by votes desc
  const byLine = {};
  Object.values(nomineeMap).forEach((n) => {
    if (!byLine[n.cod_linea]) {
      byLine[n.cod_linea] = {
        cod_linea: n.cod_linea,
        linea: n.linea,
        total_votes: votesByLinea[n.cod_linea] || 0,
        total_employees: empByLinea[n.cod_linea] || 0,
        nominees: [],
      };
    }
    const emp = empMap[n.sapid];
    byLine[n.cod_linea].nominees.push({
      sapid: n.sapid,
      nombre: emp?.nombre || n.sapid,
      photo_url: emp?.photo_url || null,
      votes: n.count,
      pct: votesByLinea[n.cod_linea] > 0
        ? Math.round((n.count / votesByLinea[n.cod_linea]) * 100)
        : 0,
    });
  });

  // Sort nominees within each line
  const lineResults = Object.values(byLine)
    .map((l) => ({
      ...l,
      participation_pct:
        l.total_employees > 0 ? Math.round((l.total_votes / l.total_employees) * 100) : 0,
      nominees: l.nominees.sort((a, b) => b.votes - a.votes),
    }))
    .sort((a, b) => a.cod_linea - b.cod_linea);

  // ── Integrity check (always unfiltered / global) ────────────────────────────
  // vote_registry has no cod_linea → fetch all sapids and resolve via empMap
  const { data: registryRows } = await supabaseAdmin
    .from('vote_registry')
    .select('sapid')
    .eq('voting_period', currentPeriod);

  const { count: globalVotesCount } = await supabaseAdmin
    .from('anonymous_results')
    .select('*', { count: 'exact', head: true })
    .eq('voting_period', currentPeriod)
    .eq('categoria', 'general');

  // All employees (unfiltered) needed to resolve sapid → cod_linea for registry
  const { data: allEmployees } = await supabaseAdmin
    .from('employees_master')
    .select('sapid, cod_linea, linea')
    .eq('active', true);

  const allEmpMap = {};
  (allEmployees || []).forEach((e) => { allEmpMap[e.sapid] = e; });

  // Registry count per line (resolved via employees_master)
  const registryByLinea = {};
  let unresolved = 0;
  (registryRows || []).forEach(({ sapid }) => {
    const emp = allEmpMap[sapid];
    if (!emp) { unresolved++; return; }
    if (!registryByLinea[emp.cod_linea]) {
      registryByLinea[emp.cod_linea] = { cod_linea: emp.cod_linea, linea: emp.linea, registry_count: 0 };
    }
    registryByLinea[emp.cod_linea].registry_count++;
  });

  // Anonymous votes per line (unfiltered)
  const { data: allVotesRows } = await supabaseAdmin
    .from('anonymous_results')
    .select('cod_linea, linea')
    .eq('voting_period', currentPeriod)
    .eq('categoria', 'general');

  const votesByLineaGlobal = {};
  (allVotesRows || []).forEach(({ cod_linea, linea }) => {
    if (!votesByLineaGlobal[cod_linea]) {
      votesByLineaGlobal[cod_linea] = { cod_linea, linea, votes_cast: 0 };
    }
    votesByLineaGlobal[cod_linea].votes_cast++;
  });

  // Merge into per-line integrity rows (only lines with any activity)
  const allLineasSet = new Set([
    ...Object.keys(registryByLinea),
    ...Object.keys(votesByLineaGlobal),
  ]);

  const integrityByLine = [...allLineasSet]
    .map((k) => {
      const reg   = registryByLinea[k]    || { registry_count: 0 };
      const votes = votesByLineaGlobal[k] || { votes_cast: 0 };
      const linea = reg.linea || votes.linea || k;
      const rc    = reg.registry_count;
      const vc    = votes.votes_cast;
      return { cod_linea: Number(k), linea, registry_count: rc, votes_cast: vc, delta: rc - vc };
    })
    .sort((a, b) => a.cod_linea - b.cod_linea);

  const regCount   = (registryRows || []).length;
  const votesCount = globalVotesCount || 0;

  return res.status(200).json({
    period: currentPeriod,
    periods,
    filters: { cod_linea: lineaFilter },
    lines: lineResults,
    integrity: {
      registry_count: regCount,
      votes_cast:     votesCount,
      delta:          regCount - votesCount,
      unresolved,
      by_line:        integrityByLine,
    },
  });
}
