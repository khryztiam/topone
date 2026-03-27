import { createClient } from '@supabase/supabase-js';

// Cliente con service_role — solo para API routes (nunca en el browser)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default supabaseAdmin;
