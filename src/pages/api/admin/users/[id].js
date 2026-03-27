/**
 * PUT    /api/admin/users/[id]  → actualiza usuario
 * DELETE /api/admin/users/[id]  → desactiva (soft delete) o elimina
 */
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID de usuario requerido' });
  }

  if (req.method === 'PUT') {
    const { full_name, role, cod_linea, linea, active } = req.body;

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (role !== undefined) updates.role = role;
    if (cod_linea !== undefined) updates.cod_linea = cod_linea || null;
    if (linea !== undefined) updates.linea = linea || null;
    if (active !== undefined) updates.active = active;

    const { error } = await supabaseAdmin
      .from('app_users')
      .update(updates)
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    // Eliminar de auth (cascada borra app_users también por FK)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
