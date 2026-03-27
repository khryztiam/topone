import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const { period, cod_linea } = req.query;

  // Default to current period
  const now = new Date();
  const currentPeriod =
    period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const lineaFilter = cod_linea ? parseInt(cod_linea, 10) : null;

  // 1. List available periods from anonymous_results
  const { data: periodsData } = await supabaseAdmin
    .from('anonymous_results')
    .select('voting_period')
    .order('voting_period', { ascending: false });

  const periods = [...new Set((periodsData || []).map((r) => r.voting_period))];

  // Ensure currentPeriod is included even if it has no votes yet
  if (!periods.includes(currentPeriod)) periods.unshift(currentPeriod);

  // 2. Fetch votes for period (+ optional line filter)
  let votesQuery = supabaseAdmin
    .from('anonymous_results')
    .select('cod_linea, linea, nominated_sapid')
    .eq('voting_period', currentPeriod)
    .eq('categoria', 'general');

  if (lineaFilter) votesQuery = votesQuery.eq('cod_linea', lineaFilter);

  const { data: votes, error: votesError } = await votesQuery;
  if (votesError) return res.status(500).json({ error: votesError.message });

  // 3. Fetch active employees (+ optional line filter)
  let empQuery = supabaseAdmin
    .from('employees_master')
    .select('sapid, nombre, cod_linea, linea, photo_url')
    .eq('active', true);

  if (lineaFilter) empQuery = empQuery.eq('cod_linea', lineaFilter);

  const { data: employees, error: empError } = await empQuery;
  if (empError) return res.status(500).json({ error: empError.message });

  // 4. Summary
  const totalVotes = (votes || []).length;
  const totalEmployees = (employees || []).length;
  const participationPct =
    totalEmployees > 0 ? Math.round((totalVotes / totalEmployees) * 100) : 0;

  // 5. Employee lookup
  const empMap = {};
  (employees || []).forEach((e) => { empMap[e.sapid] = e; });

  // 6. Per-line data for donut/participation panel
  const lineMap = {}; // cod_linea -> { cod_linea, linea, employees, votes }

  (employees || []).forEach((e) => {
    if (!lineMap[e.cod_linea]) {
      lineMap[e.cod_linea] = { cod_linea: e.cod_linea, linea: e.linea, employees: 0, votes: 0 };
    }
    lineMap[e.cod_linea].employees++;
  });

  (votes || []).forEach((v) => {
    if (!lineMap[v.cod_linea]) {
      lineMap[v.cod_linea] = { cod_linea: v.cod_linea, linea: v.linea, employees: 0, votes: 0 };
    }
    lineMap[v.cod_linea].votes++;
  });

  const donut = Object.values(lineMap)
    .map((l) => ({
      ...l,
      pct: l.employees > 0 ? Math.round((l.votes / l.employees) * 100) : 0,
    }))
    .sort((a, b) => a.linea.localeCompare(b.linea, 'es'));

  // 7. Nominee map: cod_linea:sapid -> count
  const nomineeMap = {};
  (votes || []).forEach((v) => {
    const key = `${v.cod_linea}:${v.nominated_sapid}`;
    if (!nomineeMap[key]) {
      nomineeMap[key] = { cod_linea: v.cod_linea, linea: v.linea, sapid: v.nominated_sapid, count: 0 };
    }
    nomineeMap[key].count++;
  });

  // Total votes per line (for % calc)
  const votesByLinea = {};
  (votes || []).forEach((v) => {
    votesByLinea[v.cod_linea] = (votesByLinea[v.cod_linea] || 0) + 1;
  });

  // 8. Leaders: top 1 per line (only lines with votes)
  const topByLinea = {};
  Object.values(nomineeMap).forEach((n) => {
    if (!topByLinea[n.cod_linea] || n.count > topByLinea[n.cod_linea].count) {
      topByLinea[n.cod_linea] = n;
    }
  });

  const leaders = Object.values(topByLinea)
    .map((l) => {
      const emp = empMap[l.sapid];
      const lineTotal = votesByLinea[l.cod_linea] || 0;
      return {
        cod_linea: l.cod_linea,
        linea: l.linea,
        sapid: l.sapid,
        nombre: emp?.nombre || l.sapid,
        photo_url: emp?.photo_url || null,
        votes: l.count,
        total_line_votes: lineTotal,
        pct: lineTotal > 0 ? Math.round((l.count / lineTotal) * 100) : 0,
      };
    })
    .sort((a, b) => a.cod_linea - b.cod_linea);

  // 9. All nominees sorted by votes (only when filtering by a specific line)
  let nominees = [];
  if (lineaFilter) {
    nominees = Object.values(nomineeMap)
      .filter((n) => n.cod_linea === lineaFilter)
      .sort((a, b) => b.count - a.count)
      .map((n, i) => {
        const emp = empMap[n.sapid];
        return {
          rank: i + 1,
          sapid: n.sapid,
          nombre: emp?.nombre || n.sapid,
          photo_url: emp?.photo_url || null,
          votes: n.count,
          pct: totalVotes > 0 ? Math.round((n.count / totalVotes) * 100) : 0,
        };
      });
  }

  return res.status(200).json({
    period: currentPeriod,
    periods,
    filters: { cod_linea: lineaFilter },
    summary: { votes_cast: totalVotes, total_employees: totalEmployees, participation_pct: participationPct },
    donut,
    leaders,
    nominees,
  });
}
