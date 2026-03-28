/**
 * POST /api/cancel-vote
 * Body: { token: string, sapid: string }
 *
 * Cancela un voto en progreso:
 * 1. Elimina el session_token (si existe y no fue usado)
 * 2. Elimina el registro de vote_registry para el periodo actual
 *    → permite al empleado volver a votar
 */
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { token, sapid } = req.body;

  if (!sapid || !/^\d+$/.test(String(sapid))) {
    return res.status(400).json({ error: 'sapid inválido' });
  }

  const now = new Date();
  const voting_period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  try {
    // 1. Eliminar session_token si existe y no fue usado
    if (token && /^[0-9a-f-]{36}$/.test(token)) {
      await supabaseAdmin
        .from('session_tokens')
        .delete()
        .eq('token', token)
        .eq('used', false);
    }

    // 2. Eliminar vote_registry para este sapid+periodo
    //    Esto libera al empleado para votar de nuevo
    await supabaseAdmin
      .from('vote_registry')
      .delete()
      .eq('sapid', String(sapid))
      .eq('voting_period', voting_period);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[POST /api/cancel-vote]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
