/**
 * GET  /api/admin/reset-registry?period=YYYY-MM&cod_linea=N
 *      Cuenta registros de vote_registry para preview (sin eliminar).
 *
 * POST /api/admin/reset-registry
 *      Body JSON: { period: "YYYY-MM", cod_linea?: number, reason?: string }
 *      Elimina registros de vote_registry con filtros y guarda auditoria.
 *
 * Filtrar por linea: vote_registry no tiene cod_linea, se resuelve
 * buscando los SAPIDs del employees_master para esa linea.
 *
 * Solo rol: admin
 */
import supabaseAdmin from '@/lib/supabaseAdmin';

// -- Auth helper ---------------------------------------------------------------
async function authenticate(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return { error: 'No autenticado' };

  const { data: { user: authUser }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !authUser) return { error: 'Token invalido' };

  const { data: appUser, error: appErr } = await supabaseAdmin
    .from('app_users')
    .select('role, full_name, email')
    .eq('id', authUser.id)
    .single();

  if (appErr || !appUser) return { error: 'Usuario no encontrado' };
  if (appUser.role !== 'admin') return { error: 'Acceso denegado', status: 403 };

  return { authUser, appUser };
}

// -- Resolver SAPIDs de una linea ---------------------------------------------
async function getSapidsForLine(cod_linea) {
  const { data, error } = await supabaseAdmin
    .from('employees_master')
    .select('sapid')
    .eq('cod_linea', cod_linea);
  if (error) return { error: error.message };
  return { sapids: (data || []).map((e) => e.sapid) };
}

// -- Resolver nombre de linea --------------------------------------------------
async function getLineaNombre(cod_linea) {
  const { data } = await supabaseAdmin
    .from('lineas')
    .select('nombre')
    .eq('cod_linea', cod_linea)
    .single();
  return data?.nombre || null;
}

export default async function handler(req, res) {
  // -- GET: preview count -------------------------------------------------------
  if (req.method === 'GET') {
    const { error, status } = await authenticate(req);
    if (error) return res.status(status || 401).json({ error });

    const { period, cod_linea } = req.query;
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ error: 'period (YYYY-MM) requerido' });
    }

    const lineaFilter = cod_linea ? parseInt(cod_linea, 10) : null;

    let query = supabaseAdmin
      .from('vote_registry')
      .select('*', { count: 'exact', head: true })
      .eq('voting_period', period);

    if (lineaFilter) {
      const { sapids, error: sapErr } = await getSapidsForLine(lineaFilter);
      if (sapErr) return res.status(500).json({ error: sapErr });
      if (sapids.length === 0) return res.status(200).json({ count: 0 });
      query = query.in('sapid', sapids);
    }

    const { count, error: countErr } = await query;
    if (countErr) return res.status(500).json({ error: countErr.message });

    return res.status(200).json({ count: count || 0 });
  }

  // -- POST: delete -------------------------------------------------------------
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido' });

  const { authUser, appUser, error, status } = await authenticate(req);
  if (error) return res.status(status || 401).json({ error });

  const { period, cod_linea, reason } = req.body || {};

  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return res.status(400).json({ error: 'El campo "period" (YYYY-MM) es requerido' });
  }

  const lineaFilter = cod_linea ? parseInt(cod_linea, 10) : null;

  // -- Resolver SAPIDs si hay filtro de linea -----------------------------------
  let sapidsFilter = null;
  let lineaNombre  = null;

  if (lineaFilter) {
    const { sapids, error: sapErr } = await getSapidsForLine(lineaFilter);
    if (sapErr) return res.status(500).json({ error: sapErr });
    if (sapids.length === 0) {
      return res.status(404).json({ error: 'No hay empleados en esa linea' });
    }
    sapidsFilter = sapids;
    lineaNombre  = await getLineaNombre(lineaFilter);
  }

  // -- Contar registros que se eliminaran ---------------------------------------
  let countQ = supabaseAdmin
    .from('vote_registry')
    .select('*', { count: 'exact', head: true })
    .eq('voting_period', period);

  if (sapidsFilter) countQ = countQ.in('sapid', sapidsFilter);

  const { count, error: countErr } = await countQ;
  if (countErr) return res.status(500).json({ error: countErr.message });

  if (count === 0) {
    return res.status(404).json({
      error: lineaFilter
        ? `No hay registros en vote_registry para la linea ${lineaNombre || lineaFilter} en ${period}`
        : `No se encontraron registros en vote_registry para el periodo ${period}`,
    });
  }

  // -- Eliminar registros -------------------------------------------------------
  let delQ = supabaseAdmin
    .from('vote_registry')
    .delete()
    .eq('voting_period', period);

  if (sapidsFilter) delQ = delQ.in('sapid', sapidsFilter);

  const { error: delErr } = await delQ;
  if (delErr) return res.status(500).json({ error: delErr.message });

  // -- Registrar en auditoria ---------------------------------------------------
  const { data: audit, error: auditErr } = await supabaseAdmin
    .from('results_reset_audit')
    .insert({
      reset_by:        authUser.id,
      reset_by_email:  appUser.email || authUser.email,
      reset_by_name:   appUser.full_name,
      period,
      cod_linea:       lineaFilter,
      linea_nombre:    lineaFilter ? `[registry] ${lineaNombre || lineaFilter}` : '[vote_registry global]',
      records_deleted: count,
      reason:          reason?.trim() || null,
    })
    .select('id')
    .single();

  if (auditErr) console.error('Error guardando auditoria:', auditErr.message);

  return res.status(200).json({ deleted: count, audit_id: audit?.id || null });
}