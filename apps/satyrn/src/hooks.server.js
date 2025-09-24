import { makeServerClient } from '@satyrn/supabase-adapter/server';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';


export const handle = async ({ event, resolve }) => {
  event.locals.supabaseAdmin = makeServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  return resolve(event);
};