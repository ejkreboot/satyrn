<script>
  // number of people typing on this cell
  export let count = 0;

  // optional: change placement if you ever want 'br' | 'tl' | 'tr'
  export let placement = 'tr';
</script>

{#if count > 0}
  <div
    class="typing-indicator {placement}"
    role="status"
    aria-live="polite"
    title={`${count} ${count === 1 ? 'person' : 'people'} typing…`}
  >
    <span class="dot" aria-hidden="true"></span>
    <span class="dot" aria-hidden="true"></span>
    <span class="dot" aria-hidden="true"></span>
    <span class="count">({count})</span>
  </div>
{/if}

<style>
  .typing-indicator {
    position: absolute;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 999px;
    pointer-events: none;
    font-size: 12px;
    color: #1b1b1b;
    background: color-mix(in srgb, #0095f2 12%, transparent);
    backdrop-filter: blur(2px);
  }

  /* placements */
  .typing-indicator.bl { left: 8px; bottom: 6px; }
  .typing-indicator.br { right: 8px; bottom: 6px; }
  .typing-indicator.tl { left: 8px; top: 6px; }
  .typing-indicator.tr { right: 8px; top: 6px; }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #0095f2;
    opacity: 0.7;
    animation: bounce 1s infinite ease-in-out;
  }
  .dot:nth-child(2) { animation-delay: .15s; }
  .dot:nth-child(3) { animation-delay: .30s; }

  .count {
    opacity: 0.9;
  }

  @keyframes bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.6; }
    40%          { transform: translateY(-4px); opacity: 1;   }
  }

  /* Respect reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .dot { animation: none; }
  }
</style>
