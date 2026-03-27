/**
 * POST /api/admin/reset-results
 * Elimina registros de anonymous_results según filtros y guarda auditoría.
 * Solo rol: admin
 *
 * Body JSON:
 *   { period: "YYYY-MM", cod_linea?: number, reason?: string }
 *
 * Response 200: { deleted: number, audit_id: string }
 */
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  // ── Auth: solo admin ──────────────────────────────────────────────────────
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  const { data: { user: authUser }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !authUser) return res.status(401).json({ error: 'Token inválido' });

  const { data: appUser, error: appErr } = await supabaseAdmin
    .from('app_users')
    .select('role, full_name, email')
    .eq('id', authUser.id)
    .single();

  if (appErr || !appUser) return res.status(401).json({ error: 'Usuario no encontrado' });
  if (appUser.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });

  // ── Validar body ──────────────────────────────────────────────────────────
  const { period, cod_linea, reason } = req.body || {};

  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return res.status(400).json({ error: 'El campo "period" (YYYY-MM) es requerido' });
  }

  const lineaFilter = cod_linea ? parseInt(cod_linea, 10) : null;

  // ── Contar registros que se eliminarán ────────────────────────────────────
  let countQ = supabaseAdmin
    .from('anonymous_results')
    .select('*', { count: 'exact', head: true })
    .eq('voting_period', period);

  if (lineaFilter) countQ = countQ.eq('cod_linea', lineaFilter);

  const { count, error: countErr } = await countQ;
  if (countErr) return res.status(500).json({ error: countErr.message });

  if (count === 0) {
    return res.status(404).json({ error: 'No se encontraron registros con los filtros indicados' });
  }

  // ── Obtener nombre de línea para auditoría ────────────────────────────────
  let lineaNombre = null;
  if (lineaFilter) {
    const { data: linea } = await supabaseAdmin
      .from('lineas')
      .select('nombre')
      .eq('cod_linea', lineaFilter)
      .single();
    lineaNombre = linea?.nombre || null;
  }

  // ── Eliminar registros ────────────────────────────────────────────────────
  let delQ = supabaseAdmin
    .from('anonymous_results')
    .delete()
    .eq('voting_period', period);

  if (lineaFilter) delQ = delQ.eq('cod_linea', lineaFilter);

  const { error: delErr } = await delQ;
  if (delErr) return res.status(500).json({ error: delErr.message });

  // ── Registrar en auditoría ────────────────────────────────────────────────
  const { data: audit, error: auditErr } = await supabaseAdmin
    .from('results_reset_audit')
    .insert({
      reset_by:        authUser.id,
      reset_by_email:  appUser.email || authUser.email,
      reset_by_name:   appUser.full_name,
      period,
      cod_linea:       lineaFilter,
      linea_nombre:    lineaNombre,
      records_deleted: count,
      reason:          reason?.trim() || null,
    })
    .select('id')
    .single();

  if (auditErr) {
    // El delete ya se realizó. Registramos el error pero no fallamos la respuesta
    console.error('Error guardando auditoría:', auditErr.message);
  }

  return res.status(200).json({
    deleted: count,
    audit_id: audit?.id || null,
  });
}
