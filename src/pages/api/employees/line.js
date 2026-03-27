/**
 * GET /api/employees/line
 * Devuelve todos los empleados activos de la línea del kiosco.
 * Usado en el paso de votación para mostrar a quién se puede nominar.
 */
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const cod_linea = parseInt(process.env.NEXT_PUBLIC_KIOSK_COD_LINEA || '33465');

  try {
    const { data, error } = await supabaseAdmin
      .from('employees_master')
      .select('sapid, nombre, grupo, photo_url')
      .eq('cod_linea', cod_linea)
      .eq('active', true)
      .order('nombre');

    if (error) throw error;

    return res.status(200).json({ employees: data });
  } catch (err) {
    console.error('[GET /api/employees/line]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
