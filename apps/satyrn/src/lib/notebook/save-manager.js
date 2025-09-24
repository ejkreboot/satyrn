// apps/satyrn/src/lib/notebook/save-manager.js
export function createSaveManager({ browserClient, debounceMs = 800 }) {
  const buffers = new Map();
  const dirty   = new Set();
  const timers  = new Map();

  async function flushOne(cell) {
    const src = buffers.get(cell.id);
    if (!dirty.has(cell.id) || src == null) return;
    const nextRev = (cell.rev || 1) + 1;

    const { error, count } = await browserClient
      .from('cells')
      .update({ content: { ...(cell.content || {}), source: src }, rev: nextRev })
      .eq('id', cell.id)
      .eq('rev', cell.rev || 1)
      .select('id', { head: true, count: 'exact' });

    if (!error && count === 1) dirty.delete(cell.id);
  }

  function onEdit(cell, newSource) {
    buffers.set(cell.id, newSource);
    dirty.add(cell.id);
    clearTimeout(timers.get(cell.id));
    timers.set(cell.id, setTimeout(() => flushOne(cell), debounceMs));
  }

  async function flushAll(cells) {
    for (const id of Array.from(dirty)) {
      const cell = cells.find(c => c.id === id);
      if (cell) await flushOne(cell);
    }
  }

  function dispose() { timers.forEach(clearTimeout); }

  return { buffers, dirty, onEdit, flushAll, dispose };
}
