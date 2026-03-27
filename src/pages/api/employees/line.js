/**
 * GET /api/employees/line
 * Devuelve todos los empleados activos de la línea del kiosco autenticado.
 * Usado en el paso de votación para mostrar a quién se puede nominar.
 * Requiere JWT — lee cod_linea del perfil del usuario en app_users.
 */
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Obtener cod_linea del usuario autenticado
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.slice(7);
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  const { data: appUser } = await supabaseAdmin
    .from('app_users')
    .select('cod_linea')
    .eq('id', user.id)
    .single();

  if (!appUser?.cod_linea) {
    return res.status(403).json({ error: 'Usuario sin línea asignada' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('employees_master')
      .select('sapid, nombre, grupo, photo_url')
      .eq('cod_linea', appUser.cod_linea)
      .eq('active', true)
      .order('nombre');

    if (error) throw error;

    return res.status(200).json({ employees: data });
  } catch (err) {
    console.error('[GET /api/employees/line]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
