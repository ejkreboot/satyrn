<script>
  import { createEventDispatcher } from 'svelte';
  export let visible = false;
  const dispatch = createEventDispatcher();
</script>

{#if visible}
  <div role="status" aria-live="polite" style="margin:.5rem 0;padding:.5rem .75rem;border:1px dashed var(--border);border-radius:.5rem;">
    <strong>Sandbox mode.</strong> Your edits are local to this link and won’t be saved.
    <button on:click={() => dispatch('reset')} style="margin-left:.5rem;">Reset</button>
    <button on:click={() => dispatch('exit')}  style="margin-left:.5rem;">Exit</button>
  </div>
{/if}
