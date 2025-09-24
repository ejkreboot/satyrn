import { createBrowserClient } from '@supabase/ssr';

export function makeBrowserClient(url, anonKey) {
  return createBrowserClient(url, anonKey);
}
