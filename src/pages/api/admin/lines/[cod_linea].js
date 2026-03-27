/**
 * PUT    /api/admin/lines/[cod_linea]  → actualiza nombre
 * DELETE /api/admin/lines/[cod_linea]  → elimina línea (solo si sin empleados)
 */
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  const { cod_linea } = req.query;
  const code = parseInt(cod_linea, 10);

  if (isNaN(code)) return res.status(400).json({ error: 'cod_linea inválido' });

  if (req.method === 'PUT') {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });

    const { error } = await supabaseAdmin
      .from('lineas')
      .update({ nombre: nombre.trim() })
      .eq('cod_linea', code);

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    // Verificar que no haya empleados activos en esta línea
    const { count, error: countErr } = await supabaseAdmin
      .from('employees_master')
      .select('sapid', { count: 'exact', head: true })
      .eq('cod_linea', code)
      .eq('active', true);

    if (countErr) return res.status(500).json({ error: countErr.message });
    if (count > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: esta línea tiene ${count} empleado(s) activo(s).`,
      });
    }

    const { error } = await supabaseAdmin
      .from('lineas')
      .delete()
      .eq('cod_linea', code);

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
