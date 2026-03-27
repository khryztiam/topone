import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const { data, error } = await supabaseAdmin
    .from('lineas')
    .select('cod_linea, nombre')
    .order('nombre');

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ lineas: data });
}
