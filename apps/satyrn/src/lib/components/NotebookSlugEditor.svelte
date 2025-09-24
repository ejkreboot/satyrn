<script>
  import { browserClient } from '$lib/supabase';
  export let slug;       // string
  export let notebookId; // uuid

  let editing = false, draft = '', status = 'idle';
  const RE = /^[a-z0-9][a-z0-9_-]{2,63}$/;
  let t;

  function begin() { editing = true; draft = slug; status = 'idle'; }
  async function onInput(e) {
    draft = e.currentTarget.value.trim().toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
    clearTimeout(t);
    if (!RE.test(draft)) { status = 'invalid'; return; }
    status = 'checking';
    t = setTimeout(async () => {
      const { count, error } = await browserClient
        .from('notebooks').select('slug', { head: true, count: 'exact' }).ilike('slug', draft);
      status = error ? 'error' : (count === 0 || draft === slug ? 'ok' : 'taken');
    }, 250);
  }
  async function save() {
    if (draft === slug || status !== 'ok') { editing = false; return; }
    status = 'saving';
    const { error } = await browserClient.rpc('set_notebook_slug', { nb_id: notebookId, new_slug: draft });
    if (error) { status = 'error'; return; }
    editing = false; status = 'idle';
    slug = draft;
    dispatch('save', draft);
  }
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
</script>

{#if !editing}
  <span>Notebook: <strong>{slug}</strong></span>
  <button on:click={begin} aria-label="Edit notebook URL name">Edit</button>
{:else}
  <label class="sr-only" for="slug">Notebook URL name</label>
  <input id="slug" value={draft} on:input={onInput}
         on:keydown={(e)=>{ if(e.key==='Enter') save(); if(e.key==='Escape') editing=false; }}
         autofocus style="min-width:260px" />
  {#if status==='checking'} <small>Checking…</small>{/if}
  {#if status==='ok'}       <small>Available ✓</small>{/if}
  {#if status==='taken'}    <small style="color:var(--red-600)">Taken</small>{/if}
  {#if status==='invalid'}  <small style="color:var(--red-600)">Use 3–64 chars</small>{/if}
  {#if status==='error'}    <small style="color:var(--red-600)">Error—try again</small>{/if}
  <button on:click={save} disabled={status!=='ok'}>Save</button>
  <button on:click={()=> editing=false}>Cancel</button>
{/if}
