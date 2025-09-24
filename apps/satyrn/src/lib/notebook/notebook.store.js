// apps/satyrn/src/lib/notebook/notebook.store.js
import { writable } from 'svelte/store';
import { createNotebookStore } from '@satyrn/realtime/cellStore';

export function createCellsStore(repo, realtime, notebookId) {
  const inner = createNotebookStore(repo, realtime, notebookId);
  const cells = writable([]);
  const unsub = inner.cells.subscribe(cells.set);

  return {
    cells,
    destroy() { unsub(); inner.destroy && inner.destroy(); }
  };
}
