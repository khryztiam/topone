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

  return res.status(200).json({
    period: currentPeriod,
    periods,
    filters: { cod_linea: lineaFilter },
    lines: lineResults,
  });
}
