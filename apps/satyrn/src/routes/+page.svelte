<script>
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';

  import { SatyrnCell } from '@satyrn/svelte';
  import { createPyodideEngine } from '@satyrn/engines';
  import { createNotebookStore } from '@satyrn/realtime/cellStore';
  import { browserClient, repo, realtime } from '$lib/supabase';

  import { ensureNotebookBySlug } from '$lib/notebook/identity.js';
  import { createSaveManager } from '$lib/notebook/save-manager.js';
  import { createTyping } from '$lib/notebook/typing.js';
  import { seedWelcomeIfEmpty } from '$lib/notebook/seed.js';
  import { typing as typingAction } from '$lib/actions/typing.js';

  import NotebookSlugEditor from '$lib/components/NotebookSlugEditor.svelte';
  import SandboxBanner from '$lib/components/SandboxBanner.svelte';
  import TypingIndicator from '$lib/components/TypingIndicator.svelte';
  import SatyrnHeader from '$lib/components/SatyrnHeader.svelte';

  // ---------- Local state ----------
  let engine;
  onMount(() => { engine = createPyodideEngine(); });
  let unsubscribe = () => {};  // top-level

  // Public-facing slug (URL/display); private UUID never shown
  let slug = null;
  let notebookId = null; // UUID (internal only)
  let title = 'Satyrn';

  // Realtime cells store
  let store;
  let cells = [];
  let isSandbox = false;

  // Save manager (debounced durable writes)
  const saver = createSaveManager({ browserClient, debounceMs: 800 });

  // Editing state (purely UI)
  let editing = new Set();
  function startEditing(cell) {
    if (!editing.has(cell.id)) {
      editing.add(cell.id);
      editing = new Set(editing);
    }
  }

  async function stopEditing(cell) {
    editing.delete(cell.id);
    editing = new Set(editing);
    if (!isSandbox) await saver.flushAll(cells);
  }

  function exitSandbox() {
    const url = new URL(window.location.href);
    url.searchParams.delete('sandbox');
    goto(url.pathname + url.search, { replaceState: true, keepfocus: true, noScroll: true });
  }

  // Typing presence (broadcast channel)
  const clientId = typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  let typing; // { count, notify, destroy }

  // Autosave (periodic flush)
  let autosaveTicker;

  // ----- Page init / teardown -----
  async function init() {
    const url = new URL(window.location.href);
    isSandbox = url.searchParams.get('sandbox') === '1';

    // Resolve (or create) notebook by SLUG ONLY; returns { id, slug, title }
    const nb = await ensureNotebookBySlug(browserClient, { title });
    notebookId = nb.id; // internal UUID (never displayed)
    slug = nb.slug;
    title = nb.title ?? title;

    await seedWelcomeIfEmpty(browserClient, notebookId);
    // Realtime cells
    if (store) store.destroy?.();
    unsubscribe();              // kill old subscription

    store = createNotebookStore(repo, realtime, notebookId, { mode: isSandbox ? 'sandbox' : 'live' });
    unsubscribe = store.cells.subscribe(v => { cells = v; });

  
    // Typing channel (keyed by UUID internally)
    if (typing) typing.destroy();
    typing = createTyping(browserClient, notebookId, clientId);

    // Autosave loop
    clearInterval(autosaveTicker);
    if (!isSandbox) autosaveTicker = setInterval(() => saver.flushAll(cells), 5000);

    // Flush on unload (best-effort)
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', onBeforeUnload);
    }
  }

  function onBeforeUnload() { saver.flushAll(cells); }

  onMount(init);
  onDestroy(() => {
    clearInterval(autosaveTicker);
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', onBeforeUnload);
    }
    typing?.destroy?.();
    unsubscribe();
    store?.destroy?.();
    saver.dispose?.();
  });

  import { keyBetween, keyAfter, keyBefore } from '@satyrn/core/orderKey';

  function neighborKeysForInsertAfter(idx) {
    // Prefer the subscribed array; fall back to reading the store directly if needed
    const list = Array.isArray(cells) ? cells : get(store.cells) ?? [];
    const prev = list[idx] || null;
    const next = list[idx + 1] || null;
    return {
      prevKey: prev?.order_key ?? null,
      nextKey: next?.order_key ?? null
    };
  }

  async function insertCellAt(idx, type = 'py', source) {
    if (source == null) {
      source = type === 'md'
        ? '# New section\nWrite your notes here...'
        : "# New code cell\nprint('hello world')\n";
    }

    const { prevKey, nextKey } = neighborKeysForInsertAfter(idx);

    let order_key;

    if (prevKey && nextKey) order_key = keyBetween(prevKey, nextKey);
    else if (prevKey && !nextKey) order_key = keyAfter(prevKey);     // append
    else if (!prevKey && nextKey) order_key = keyBefore(nextKey);    // prepend
    else order_key = 'U'; // first ever

    const cell = {
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
      notebook_id: notebookId,
      order_key,
      type,
      content: { source, outputs: [] },
      rev: 1
    };

    if (isSandbox) {
      await store.upsert(cell);
    } else {
      await browserClient.from('cells').insert(cell);
    }
  }

  async function removeCellAt(idx) {
    const c = cells[idx]; if (!c) return;
    const { error } = await store.remove(c.id); // sandbox == local, live == DB
    if (!error && cells.length === 0 && !isSandbox) {
      await insertCellAt(-1, 'md', '# Welcome\nStart your notebook here.');
    }
  }

  function handleLocalEdit(cell, newSource) {
    // In sandbox: local overlay only
    if (isSandbox) {
      const patched = { ...cell, content: { ...(cell.content||{}), source: newSource }, rev: (cell.rev||1) + 1 };
      store.upsert(patched);
      return;
    }
    // Live: your existing debounced saver
    startEditing(cell);
    saver.onEdit(cell, newSource);
  }

</script>

<style>
  .satyrn-container { max-width: 1000px; margin: 24px auto; padding: 0 8px; }

  .cell-wrap { position: relative; }

</style>

<SatyrnHeader logo="/satyrn_logo_200.png" title="Satyrn" />
<main class="satyrn-container">

  <div class="brand" style="display:flex;align-items:center;gap:8px;">
    <NotebookSlugEditor
      slug={slug}
      notebookId={notebookId}
      on:save={(e) => {
        slug = e.detail;
        localStorage.setItem('satyrn:notebookSlug', slug);
        const url = new URL(window.location.href);
        url.searchParams.set('nb', slug);
        goto(url.pathname + url.search, { replaceState: true, keepfocus: true, noScroll: true });
      }} />
  </div>

  <SandboxBanner visible={isSandbox} on:reset={() => store.resetSandbox?.()} on:exit={exitSandbox} />

  {#if !notebookId}
    <p>Loading notebook…</p>
  {/if}

  {#each cells as cell, i (cell.id)}
    <div class="cell-wrap"
         role="presentation"
         use:typingAction={{ notify: typing?.notify, cellId: cell.id }}>
      {#if cell.type === 'md'}
        <SatyrnCell
          type="md"
          index={i + 1}
          previewMarkdown
          source={
            isSandbox
              ? (cell.content?.source ?? '')
              : (saver.buffers.get(cell.id) ?? cell.content?.source ?? '')
          }
          on:focus={() => startEditing(cell)}
          on:blur={() => stopEditing(cell)}
          on:update={(e) => handleLocalEdit(cell, e.detail.source)}
          on:removeCell={() => removeCellAt(i)}
          on:addCode={() => insertCellAt(i, 'py', "# new code cell\n")}
          on:addMd={() => insertCellAt(i, 'md', '# new markdown\n')}
        />
      {:else}
        <SatyrnCell
          type="py"
          index={i + 1}
          {engine}
          source={
            isSandbox
              ? (cell.content?.source ?? '')
              : (saver.buffers.get(cell.id) ?? cell.content?.source ?? '')
          }
          on:focus={() => startEditing(cell)}
          on:blur={() => stopEditing(cell)}
          on:update={(e) => handleLocalEdit(cell, e.detail.source)}
          on:removeCell={() => removeCellAt(i)}
          on:addCode={() => insertCellAt(i, 'py', "# new code cell\n")}
          on:addMd={() => insertCellAt(i, 'md', '# new markdown\n')}
        />
      {/if}
      <TypingIndicator count={typing?.count(cell.id) || 0} />
    </div>
  {/each}
</main>
