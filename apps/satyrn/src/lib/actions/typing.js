// apps/satyrn/src/lib/actions/typing.js
export function typing(node, { notify, cellId }) {
  let last = 0; const THROTTLE = 120;
  function onKeydown() {
    const now = performance.now();
    if (now - last < THROTTLE) return;
    last = now; notify && notify(cellId);
  }
  node.addEventListener('keydown', onKeydown, true);
  return {
    update(params) { notify = params.notify; cellId = params.cellId; },
    destroy() { node.removeEventListener('keydown', onKeydown, true); }
  };
}
