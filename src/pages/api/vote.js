/**
 * POST /api/vote
 * Body: { token: string, nominated_sapid: string }
 *
 * PASOS B y C del protocolo de 3 pasos:
 * 1. Valida token (existe, no expiró, no fue usado)
 * 2. Inserta voto anónimo en anonymous_results (categoria = 'general')
 * 3. Marca token como usado y lo elimina
 */
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { token, nominated_sapid } = req.body;

  // Validación básica de entrada
  if (!token || typeof token !== 'string' || !/^[0-9a-f-]{36}$/.test(token)) {
    return res.status(400).json({ error: 'Token inválido' });
  }
  if (!nominated_sapid || !/^\d+$/.test(String(nominated_sapid))) {
    return res.status(400).json({ error: 'Nominado inválido' });
  }

  const kiosk_user_id = process.env.NEXT_PUBLIC_KIOSK_USER_ID || 'demo-kiosk-l15';

  // Si hay Authorization header, usar el UUID real del kiosco autenticado
  let resolvedKioskId = kiosk_user_id;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const tkn = authHeader.slice(7);
    const { data: { user } } = await supabaseAdmin.auth.getUser(tkn);
    if (user) resolvedKioskId = user.id;
  }

  try {
    // 1. Validar token
    const { data: tokenRow, error: tokError } = await supabaseAdmin
      .from('session_tokens')
      .select('token, cod_linea, linea, expires_at, used')
      .eq('token', token)
      .single();

    if (tokError || !tokenRow) {
      return res.status(401).json({ error: 'Token no encontrado' });
    }
    if (tokenRow.used) {
      return res.status(401).json({ error: 'Token ya utilizado' });
    }
    if (new Date(tokenRow.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Token expirado' });
    }

    const { cod_linea, linea } = tokenRow;
    const now = new Date();
    const voting_period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 2. Insertar voto anónimo (una sola fila, sin categorías)
    const { error: insertError } = await supabaseAdmin
      .from('anonymous_results')
      .insert({
        categoria: 'general',
        nominated_sapid: String(nominated_sapid),
        voting_period,
        cod_linea,
        linea,
        kiosk_user_id: resolvedKioskId,
      });

    if (insertError) throw insertError;

    // 3. Marcar token como usado y eliminar
    await supabaseAdmin
      .from('session_tokens')
      .update({ used: true })
      .eq('token', token);

    await supabaseAdmin
      .from('session_tokens')
      .delete()
      .eq('token', token);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[POST /api/vote]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
