/**
 * GET  /api/admin/users     → lista todos los usuarios
 * POST /api/admin/users     → crea nuevo usuario (auth + app_users)
 */
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('app_users')
      .select('id, email, full_name, role, cod_linea, linea, active, created_at')
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ users: data });
  }

  if (req.method === 'POST') {
    const { email, password, full_name, role, cod_linea, linea } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'email, password y role son requeridos' });
    }

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) return res.status(400).json({ error: authError.message });

    // 2. Insertar en app_users
    const { error: dbError } = await supabaseAdmin.from('app_users').insert({
      id: authData.user.id,
      email,
      full_name: full_name || null,
      role,
      cod_linea: cod_linea || null,
      linea: linea || null,
      active: true,
    });

    if (dbError) {
      // Revertir usuario de auth si falla la inserción en DB
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: dbError.message });
    }

    return res.status(201).json({ success: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
