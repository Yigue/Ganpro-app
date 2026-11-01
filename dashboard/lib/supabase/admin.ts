import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl } from '@/lib/env';

export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
