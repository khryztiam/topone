/**
 * GET /api/employee?sapid=XXXXX
 *
 * PASO A del protocolo de 3 pasos:
 * 1. Verifica que el empleado existe y pertenece a la línea del kiosco
 * 2. Registra en vote_registry (UNIQUE sapid+periodo previene doble voto)
 * 3. Genera token volátil en session_tokens (sin referencia al votante)
 * 4. Devuelve datos del empleado + token
 */
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { sapid } = req.query;
  if (!sapid || typeof sapid !== 'string' || !/^\d+$/.test(sapid)) {
    return res.status(400).json({ error: 'sapid inválido' });
  }

  // Obtener kiosco desde el JWT del usuario autenticado
  let kiosk_user_id;
  let cod_linea;
  let linea;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (!authErr && user) {
      // Leer perfil real del kiosco desde app_users
      const { data: appUser } = await supabaseAdmin
        .from('app_users')
        .select('id, cod_linea, linea, role')
        .eq('id', user.id)
        .single();

      if (appUser) {
        kiosk_user_id = appUser.id;
        cod_linea = appUser.cod_linea;
        linea = appUser.linea;
      }
    }
  }

  // Fallback a env vars solo para modo demo/desarrollo sin auth
  if (!kiosk_user_id) {
    const envKioskId = process.env.NEXT_PUBLIC_KIOSK_USER_ID;
    // Validar que sea un UUID válido antes de usarlo
    if (envKioskId && /^[0-9a-f-]{36}$/.test(envKioskId)) {
      kiosk_user_id = envKioskId;
    } else {
      return res.status(401).json({ error: 'Kiosco no autenticado' });
    }
    cod_linea = parseInt(process.env.NEXT_PUBLIC_KIOSK_COD_LINEA || '33465');
    linea = process.env.NEXT_PUBLIC_KIOSK_LINEA || 'LINEA 15 D2-2';
  }

  try {
    // 1. Buscar empleado
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees_master')
      .select('sapid, nombre, linea, cod_linea, grupo, photo_url, active')
      .eq('sapid', sapid)
      .single();

    if (empError || !employee) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    if (!employee.active) {
      return res.status(403).json({ error: 'Empleado inactivo' });
    }
    if (employee.cod_linea !== cod_linea) {
      return res.status(403).json({ error: 'Empleado no pertenece a esta línea' });
    }

    // 2. Período actual YYYY-MM
    const now = new Date();
    const voting_period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 3. Registrar en vote_registry (falla si ya votó este mes)
    const { error: regError } = await supabaseAdmin
      .from('vote_registry')
      .insert({ sapid, voting_period, kiosk_user_id });

    if (regError) {
      if (regError.code === '23505') {
        return res.status(409).json({ error: 'Este empleado ya votó en el período actual' });
      }
      throw regError;
    }

    // 4. Crear token volátil (expira en 15 minutos)
    const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { data: tokenRow, error: tokError } = await supabaseAdmin
      .from('session_tokens')
      .insert({ cod_linea, linea, expires_at, used: false })
      .select('token')
      .single();

    if (tokError) throw tokError;

    return res.status(200).json({
      employee: {
        sapid: employee.sapid,
        nombre: employee.nombre,
        linea: employee.linea,
        cod_linea: employee.cod_linea,
        grupo: employee.grupo,
        photo_url: employee.photo_url,
      },
      token: tokenRow.token,
    });
  } catch (err) {
    console.error('[GET /api/employee]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
