/**
 * GET /api/admin/export-results?period=YYYY-MM&cod_linea=N (optional)
 * Genera y devuelve un archivo Excel con los resultados de votación.
 */
import supabaseAdmin from '@/lib/supabaseAdmin';
import ExcelJS from 'exceljs';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const { period, cod_linea } = req.query;

  const now = new Date();
  const currentPeriod =
    period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const lineaFilter = cod_linea ? parseInt(cod_linea, 10) : null;

  // Fetch votes
  let votesQ = supabaseAdmin
    .from('anonymous_results')
    .select('cod_linea, linea, nominated_sapid, created_at')
    .eq('voting_period', currentPeriod)
    .eq('categoria', 'general')
    .order('cod_linea')
    .order('created_at');

  if (lineaFilter) votesQ = votesQ.eq('cod_linea', lineaFilter);

  const { data: votes, error: votesErr } = await votesQ;
  if (votesErr) return res.status(500).json({ error: votesErr.message });

  // Fetch employees for name resolution
  const { data: employees } = await supabaseAdmin
    .from('employees_master')
    .select('sapid, nombre, linea, cod_linea')
    .eq('active', true);

  const empMap = {};
  (employees || []).forEach((e) => { empMap[e.sapid] = e; });

  // Aggregate results
  const nomineeMap = {};
  (votes || []).forEach((v) => {
    const key = `${v.cod_linea}:${v.nominated_sapid}`;
    if (!nomineeMap[key]) {
      nomineeMap[key] = {
        cod_linea: v.cod_linea,
        linea: v.linea,
        sapid: v.nominated_sapid,
        nombre: empMap[v.nominated_sapid]?.nombre || v.nominated_sapid,
        votos: 0,
      };
    }
    nomineeMap[key].votos++;
  });

  const votesByLinea = {};
  (votes || []).forEach((v) => {
    votesByLinea[v.cod_linea] = (votesByLinea[v.cod_linea] || 0) + 1;
  });

  const rows = Object.values(nomineeMap)
    .map((n) => ({
      ...n,
      total_linea: votesByLinea[n.cod_linea] || 0,
      porcentaje:
        votesByLinea[n.cod_linea] > 0
          ? Math.round((n.votos / votesByLinea[n.cod_linea]) * 100)
          : 0,
      lugar: 0,
    }))
    .sort((a, b) => a.cod_linea - b.cod_linea || b.votos - a.votos);

  // Assign rank within each line
  let lastLine = null;
  let rank = 0;
  rows.forEach((r) => {
    if (r.cod_linea !== lastLine) { rank = 1; lastLine = r.cod_linea; }
    else rank++;
    r.lugar = rank;
  });

  // Build Excel workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VotingApp';
  workbook.created = new Date();

  // ── Sheet 1: Resultados por Nominado ────────────────────────────────────────
  const sheet1 = workbook.addWorksheet('Resultados');

  // Title row
  sheet1.mergeCells('A1:G1');
  sheet1.getCell('A1').value = `Resultados de Votación — Período ${currentPeriod}`;
  sheet1.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1A56DB' } };
  sheet1.getCell('A1').alignment = { horizontal: 'center' };

  sheet1.addRow([]);

  // Header row
  const headerRow = sheet1.addRow([
    'Lugar', 'Cód. Línea', 'Línea', 'SAPID', 'Nombre', 'Votos', 'Porcentaje',
  ]);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A56DB' } };
  headerRow.alignment = { horizontal: 'center' };
  headerRow.height = 22;

  sheet1.columns = [
    { key: 'lugar',      width: 8 },
    { key: 'cod_linea',  width: 12 },
    { key: 'linea',      width: 30 },
    { key: 'sapid',      width: 16 },
    { key: 'nombre',     width: 34 },
    { key: 'votos',      width: 10 },
    { key: 'porcentaje', width: 14 },
  ];

  let lastLineFill = null;
  rows.forEach((r, i) => {
    const fill = r.cod_linea !== lastLineFill
      ? (i % 2 === 0 ? 'FFF0F4FF' : 'FFFFFFFF')
      : (sheet1.lastRow?.fill?.fgColor?.argb || 'FFFFFFFF');
    lastLineFill = r.cod_linea;

    const dataRow = sheet1.addRow([
      r.lugar === 1 ? '🥇 1°' : r.lugar === 2 ? '🥈 2°' : r.lugar === 3 ? '🥉 3°' : `${r.lugar}°`,
      r.cod_linea,
      r.linea,
      r.sapid,
      r.nombre,
      r.votos,
      `${r.porcentaje}%`,
    ]);

    dataRow.getCell(1).alignment = { horizontal: 'center' };
    dataRow.getCell(2).alignment = { horizontal: 'center' };
    dataRow.getCell(6).alignment = { horizontal: 'center' };
    dataRow.getCell(7).alignment = { horizontal: 'center' };

    if (r.lugar === 1) {
      dataRow.font = { bold: true };
    }
  });

  // Border on header
  headerRow.eachCell((cell) => {
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF1A56DB' } },
    };
  });

  // ── Sheet 2: Resumen por Línea ───────────────────────────────────────────────
  const sheet2 = workbook.addWorksheet('Resumen por Línea');

  sheet2.mergeCells('A1:E1');
  sheet2.getCell('A1').value = `Resumen por Línea — Período ${currentPeriod}`;
  sheet2.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1A56DB' } };
  sheet2.getCell('A1').alignment = { horizontal: 'center' };
  sheet2.addRow([]);

  const sumHeader = sheet2.addRow(['Cód.', 'Línea', 'Total Votos', 'SAPID Líder', 'Nombre Líder']);
  sumHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sumHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A56DB' } };
  sumHeader.height = 22;

  sheet2.columns = [
    { key: 'cod', width: 8 },
    { key: 'linea', width: 30 },
    { key: 'total', width: 14 },
    { key: 'sapid', width: 16 },
    { key: 'nombre', width: 34 },
  ];

  const topByLinea = {};
  rows.forEach((r) => {
    if (r.lugar === 1) topByLinea[r.cod_linea] = r;
  });

  const lineaSummaries = [...new Set(rows.map((r) => r.cod_linea))];
  lineaSummaries.forEach((cl) => {
    const top = topByLinea[cl];
    sheet2.addRow([
      cl,
      top?.linea || cl,
      votesByLinea[cl] || 0,
      top?.sapid || '—',
      top?.nombre || '—',
    ]);
  });

  // Respond with xlsx buffer
  const buffer = await workbook.xlsx.writeBuffer();

  const fileName = `resultados_${currentPeriod}${lineaFilter ? `_linea${lineaFilter}` : ''}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Length', buffer.byteLength);
  return res.status(200).send(Buffer.from(buffer));
}
