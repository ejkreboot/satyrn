import { createClient } from '@supabase/supabase-js';

export function makeServerClient(url, serviceRoleKey) {
  return createClient(url, serviceRoleKey); // server-only
}
