/**
 * GET /api/auth/me
 * Valida el access_token del header y devuelve el perfil del usuario en app_users.
 * Usa supabaseAdmin (service_role) para bypassear RLS y evitar problemas de policy.
 */
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.slice(7);

  // Validar el JWT con Supabase Auth
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  // Obtener perfil de app_users (service_role bypasea RLS)
  const { data, error } = await supabaseAdmin
    .from('app_users')
    .select('id, email, full_name, role, cod_linea, linea, active')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Usuario no encontrado en la aplicación' });
  }

  return res.status(200).json({ user: data });
}
