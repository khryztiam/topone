/**
 * GET /api/admin/reset-audit
 * Lista el historial de resets de resultados.
 * Solo rol: admin
 *
 * Query params:
 *   page?    (default 1) — paginación
 *   limit?   (default 20)
 */
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  // ── Auth: solo admin ──────────────────────────────────────────────────────
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  const { data: { user: authUser }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !authUser) return res.status(401).json({ error: 'Token inválido' });

  const { data: appUser, error: appErr } = await supabaseAdmin
    .from('app_users')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (appErr || !appUser) return res.status(401).json({ error: 'Usuario no encontrado' });
  if (appUser.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });

  // ── Leer auditoría ────────────────────────────────────────────────────────
  const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit = Math.min(50, Math.max(5, parseInt(req.query.limit || '20', 10)));
  const from  = (page - 1) * limit;
  const to    = from + limit - 1;

  const { data: records, count, error } = await supabaseAdmin
    .from('results_reset_audit')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({
    records: records || [],
    total: count || 0,
    page,
    limit,
  });
}
