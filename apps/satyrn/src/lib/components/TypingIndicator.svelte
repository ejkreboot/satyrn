<script>
  export let count = 0;
</script>

{#if count > 0}
  <div class="typing-indicator">
    <span class="dot" aria-hidden="true">●</span>
    <span class="text">{count} typing…</span>
  </div>
{/if}