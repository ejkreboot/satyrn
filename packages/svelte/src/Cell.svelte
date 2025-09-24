<script>
  import { createEventDispatcher } from 'svelte';

  // New props: index (1-based), gutter toggle
  const {
    type = 'py',
    source = '',
    engine = null,
    previewMarkdown = false,
    index = 1,
    gutter = true
  } = $props();

  const dispatch = createEventDispatcher();

  let text = $state(source);
  let status = $state('idle');   // 'idle' | 'running' | 'ok' | 'error'
  let outputs = $state([]);
  let mdHtml = $state('');

  import { marked } from 'marked';
  import DOMPurify from 'dompurify';

  $effect(() => {
    if (type === 'md' && previewMarkdown) {
      const raw = marked.parse(text || '', { mangle: false, headerIds: false });
      mdHtml = DOMPurify.sanitize(raw, { SAFE_FOR_TEMPLATES: true });
    } else {
      mdHtml = '';
    }
  });

  // editing state for markdown cells: when false, only the rendered markdown
  // is shown; when true, show the source textarea (and preview). Clicking
  // the rendered area enters edit mode. Blurring the textarea exits edit mode.
  let editing = $state(false);
  let ta = $state(null); // textarea element ref
  let sectionEl = $state(null);

  $effect(() => { text = source; });

  function onInput(e) {
    text = e.target.value;
    dispatch('update', { source: text });
  }

  function onFocusOut(e) {
    // If the newly focused element is outside this cell, stop editing
    // relatedTarget is the element receiving focus in modern browsers
    const next = e.relatedTarget || document.activeElement;
    if (!sectionEl) { editing = false; return; }
    if (!(next && sectionEl.contains(next))) {
      editing = false;
    }
  }

  // Focus the inline textarea when editing becomes true. Use a short
  // timeout to ensure the element is mounted before calling focus.
  $effect(() => {
    if (editing && ta) {
      setTimeout(() => { ta.focus(); }, 0);
    }
  });

  async function run() {
    if (type !== 'py' || !engine?.run) return;
    status = 'running';
    outputs = [];
    try {
      const out = await engine.run(text);
      outputs = Array.isArray(out) ? out : [];
      status = 'ok';
      dispatch('run', { outputs });
    } catch (err) {
      outputs = [{ mime: 'text/plain', data: String(err) }];
      status = 'error';
      dispatch('run', { outputs, error: true });
    }
  }
</script>

<section bind:this={sectionEl} class="satyrn-cell satyrn-cell-grid" data-type={type} aria-label={type === 'md' ? 'Markdown cell' : 'Python cell'} onfocusout={onFocusOut}>
  <!-- Cell toolbar (appears when the cell is focused) -->
  <div class="satyrn-cell-toolbar" aria-hidden={!editing && !sectionEl?.matches(':focus-within')}>
    <button type="button" class="satyrn-btn satyrn-btn-icon" title="Move up" aria-label="Move cell up" onclick={() => dispatch('moveUp')}>
      <span class="material-symbols-outlined">arrow_upward</span>
    </button>
    <button type="button" class="satyrn-btn satyrn-btn-icon" title="Move down" aria-label="Move cell down" onclick={() => dispatch('moveDown')}>
      <span class="material-symbols-outlined">arrow_downward</span>
    </button>
    <!-- removed generic add button; delete button moved before NEW label -->
    <button type="button" class="satyrn-btn satyrn-btn-icon" title="Delete cell" aria-label="Delete cell" onclick={() => dispatch('removeCell')}>
      <span class="material-symbols-outlined">delete</span>
    </button>
    <span class="satyrn-toolbar-divider" aria-hidden="true"></span>
    <span style="align-self:center;color:var(--text-dim);font-size:12px;margin-left:6px;margin-right:6px">NEW:</span>
    <button type="button" class="satyrn-btn satyrn-btn-icon" title="New code cell" aria-label="Add code cell" onclick={() => dispatch('addCode')}>
      <span class="material-symbols-outlined">code_blocks</span>
    </button>
    <button type="button" class="satyrn-btn satyrn-btn-icon" title="New markdown cell" aria-label="Add markdown cell" onclick={() => dispatch('addMd')}>
      <span class="material-symbols-outlined">markdown</span>
    </button>
  </div>
  {#if gutter}
    <aside class="satyrn-gutter">
      {#if type === 'py'}
        <button
          class="satyrn-gutter-btn"
          aria-label="Run cell"
          title="Run cell (Shift+Enter)"
          onclick={run}
          disabled={status==='running'}>
          <!-- play triangle -->
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
        </button>
        <div class="satyrn-idx">In&nbsp;[{index}]</div>
      {:else}
        <div class="satyrn-md-dot" aria-hidden="true">¶</div>
        <div class="satyrn-idx">Md&nbsp;[{index}]</div>
      {/if}
    </aside>
  {/if}

  <div class="satyrn-cell-body">
    {#if type === 'py' || (type === 'md' && !previewMarkdown)}
      <textarea
        class="satyrn-editor satyrn-editor--code"
        bind:value={text}
        oninput={onInput}
        placeholder={type === 'md' ? 'Write notes…' : 'Write Python…'}
      ></textarea>
    {/if}
    {#if type === 'py'}
      <div class="satyrn-outputs" aria-live="polite">
        {#if outputs.length === 0 && status !== 'running'}
          <pre>(no output)</pre>
        {:else}
          {#each outputs as o}
            {#if o.mime === 'text/plain'}
              <pre>{o.data}</pre>
            {/if}
          {/each}
        {/if}
      </div>
    {:else }
      {#if !editing}
        <div class="satyrn-outputs" style="background:var(--card)">
          <button
            type="button"
            class="satyrn-md-preview"
            onclick={() => { editing = true; /* focus will be handled when textarea mounts */ }}
            aria-label="Edit markdown" style="border-width: 0px; background:#fff; color:var(--text); width:100%; text-align:left"
          >
            <div class="satyrn-md-render">{@html mdHtml}</div>
          </button>
        </div>
      {:else}
        <div class="satyrn-outputs" style="background:var(--card)">
          <textarea
            class="satyrn-editor"
            bind:this={ta}
            bind:value={text}
            oninput={onInput}
            onblur={() => { editing = false; }}
            style="width:100%;min-height:6rem;padding:.75rem;font-family:ui-monospace,monospace"
          ></textarea>
          <div style="padding:.75rem;border-top:1px solid var(--e5e7eb);background:#fff;color:var(--text);">
            <div class="satyrn-md-render">{@html mdHtml}</div>
          </div>
        </div>
        {@html '' /* ensure proper hydration ordering for focus below */}
      {/if}
    {/if}
  </div>
</section>

<!-- Keyboard: Shift+Enter to run (py cells) -->
<svelte:window on:keydown={(e) => {
  if (type === 'py' && (e.key === 'Enter' && e.shiftKey)) { e.preventDefault(); run(); }
}} />
