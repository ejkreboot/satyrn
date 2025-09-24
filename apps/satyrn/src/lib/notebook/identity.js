// apps/satyrn/src/lib/notebook/identity.js
import { goto } from '$app/navigation';
import Haikunator from 'haikunator';

const LS_KEY = 'satyrn:notebookSlug';
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{2,63}$/;

function normalizeSlug(s = '') {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function makeHaikuSlug() {
  // adjective-noun (kebab-case already)
  const h = new Haikunator({ defaults: { tokenLength: 0 } });
  return h.haikunate();
}

export async function ensureNotebookBySlug(browserClient, { title = 'Satyrn' } = {}) {
  // SSR guard: if server-side, just return a minimal placeholder; caller should run onMount.
  if (typeof window === 'undefined') {
    return { id: null, slug: null, title };
  }

  const url = new URL(window.location.href);
  const qsSlugRaw = url.searchParams.get('nb');
  const lsSlugRaw = localStorage.getItem(LS_KEY);
  let slug = normalizeSlug(qsSlugRaw || lsSlugRaw || '');

  // Try to resolve an existing slug
  if (slug && SLUG_RE.test(slug)) {
    const { data, error } = await browserClient
      .from('notebooks')
      .select('id, slug, title')
      .ilike('slug', slug)        // case-insensitive match
      .limit(1)
      .maybeSingle();             // returns { data:null, error:null } if not found

    if (error) {
      // Surface unexpected errors (network, RLS, etc.)
      throw error;
    }
    if (data) {
      const canonical = data.slug; // use DB’s exact casing (we store lower, but just in case)
      if (!qsSlugRaw || qsSlugRaw !== canonical) {
        url.searchParams.set('nb', canonical);
        goto(url.pathname + url.search, { replaceState: true, keepfocus: true, noScroll: true });
      }
      localStorage.setItem(LS_KEY, canonical);
      return { id: data.id, slug: canonical, title: data.title };
    }
    // fall through if not found → create new
  }

  // Create a brand-new notebook with a haiku slug; retry on collisions.
  let created = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = makeHaikuSlug();
    const { data, error } = await browserClient
      .from('notebooks')
      .insert({ title, slug: candidate })
      .select('id, slug, title')
      .single();

    if (!error && data) {
      created = data;
      break;
    }
    // Unique violation = slug taken → try again
    if (error?.code === '23505') {
      // small jitter to avoid thundering herd
      await new Promise(r => setTimeout(r, 50 + Math.random() * 150));
      continue;
    }
    // Other errors: surface
    throw error;
  }

  if (!created) {
    throw new Error('slug_allocation_failed');
  }

  const canonical = created.slug;
  localStorage.setItem(LS_KEY, canonical);
  url.searchParams.set('nb', canonical);
  goto(url.pathname + url.search, { replaceState: true, keepfocus: true, noScroll: true });

  return created; // { id, slug, title }
}
