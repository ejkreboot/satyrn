import { makeBrowserClient } from '@satyrn/supabase-adapter/browser';
import { makeNotebookRepo } from '@satyrn/supabase-adapter';
import { makeRealtime } from '@satyrn/supabase-adapter/realtime';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const browserClient = makeBrowserClient(url, anon);
export const repo = makeNotebookRepo(browserClient);
export const realtime = makeRealtime(browserClient);