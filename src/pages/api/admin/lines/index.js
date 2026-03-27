/**
 * GET  /api/admin/lines  → lista líneas con conteo de empleados activos
 * POST /api/admin/lines  → crea una nueva línea
 */
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Líneas con conteo de empleados activos
    const { data: lineas, error: lineasErr } = await supabaseAdmin
      .from('lineas')
      .select('cod_linea, nombre')
      .order('nombre');

    if (lineasErr) return res.status(500).json({ error: lineasErr.message });

    const { data: empCounts, error: empErr } = await supabaseAdmin
      .from('employees_master')
      .select('cod_linea')
      .eq('active', true);

    if (empErr) return res.status(500).json({ error: empErr.message });

    const countMap = {};
    (empCounts || []).forEach(({ cod_linea }) => {
      countMap[cod_linea] = (countMap[cod_linea] || 0) + 1;
    });

    const result = lineas.map((l) => ({
      ...l,
      employee_count: countMap[l.cod_linea] || 0,
    }));

    return res.status(200).json({ lines: result });
  }

  if (req.method === 'POST') {
    const { cod_linea, nombre } = req.body;
    if (!cod_linea || !nombre) {
      return res.status(400).json({ error: 'cod_linea y nombre son requeridos' });
    }

    const { error } = await supabaseAdmin
      .from('lineas')
      .insert({ cod_linea: parseInt(cod_linea, 10), nombre: nombre.trim() });

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ success: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
