// packages/realtime/src/cellStore.js
import { writable } from 'svelte/store';

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const CHAR_RANK = (() => {
  const m = new Map(); for (let i = 0; i < BASE62.length; i++) m.set(BASE62[i], i); return m;
})();

function cmpKey(a = '', b = '') {
  // bytewise base62 compare: digits < A..Z < a..z
  const la = a.length, lb = b.length, L = Math.max(la, lb);
  for (let i = 0; i < L; i++) {
    const ra = CHAR_RANK.get(a[i]) ?? -1;  // treat missing as below MIN
    const rb = CHAR_RANK.get(b[i]) ?? -1;
    if (ra !== rb) return ra - rb;
  }
  return 0;
}

function cmpCell(a, b) {
  const c = cmpKey(a.order_key, b.order_key);
  return c !== 0 ? c : a.id.localeCompare(b.id);
}


/**
 * createNotebookStore(repo, rt, notebookId, { mode })
 * - mode: 'live' (default) | 'sandbox'
 */
export function createNotebookStore(repo, rt, notebookId, opts = {}) {
  const mode = opts.mode === 'sandbox' ? 'sandbox' : 'live';
  const cells = writable([]);

  // Base state from server (live snapshot + realtime)
  const byId = new Map();
  let liveReady = false;
  const queue = [];

  // Sandbox overlay (local-only mutations)
  const overlayById = new Map();  // id -> cell (insert/update)
  const overlayDeletes = new Set(); // ids deleted locally

  let unsub = () => {};

  const materialize = () => {
    const merged = new Map(byId);
    for (const id of overlayDeletes) merged.delete(id);
    for (const [id, cell] of overlayById) merged.set(id, cell);

    const arr = [...merged.values()].sort(cmpCell);
    cells.set(arr);
  };

  // In emit(): use the same comparator
  const emit = () => {
    if (mode === 'sandbox') materialize();
    else {
      const arr = [...byId.values()].sort(cmpCell);
      cells.set(arr);
    }
  };

  // ---- Base live event application ----
  const applyInsert = (cell) => {
    byId.set(cell.id, cell);
  };
  const applyUpdate = (cell) => {
    byId.set(cell.id, cell);
  };
  const applyDelete = (cell) => {
    // support payload being either the full cell object or just an id string
    const id = cell && (cell.id ?? cell) ;
    if (id) byId.delete(id);
  };
  const applyEvt = (evt) => {
    if (!evt || !evt.type) return;
    if (evt.type === 'insert') applyInsert(evt.cell);
    else if (evt.type === 'update') applyUpdate(evt.cell);
    else if (evt.type === 'delete') applyDelete(evt.cell);
  };

  // 1) Subscribe first; buffer until snapshot lands
  unsub = rt.subscribeCells(notebookId, (evt) => {
    if (!liveReady) { queue.push(evt); return; }
    applyEvt(evt);
    emit();
  });

  // 2) Fetch initial snapshot, then drain. Guard against repo errors so store still becomes usable.
  repo.getCells(notebookId).then((rows) => {
    byId.clear();
    for (const row of rows || []) byId.set(row.id, row);
    for (const evt of queue) applyEvt(evt);
    queue.length = 0;
    liveReady = true;
    emit();
  }).catch((err) => {
    // If the initial fetch fails, log and expose an empty/usable store rather than leaving it hung.
    console.error('createNotebookStore: failed to load initial cells', err);
    byId.clear();
    queue.length = 0;
    liveReady = true;
    emit();
  });

  // -------- Public API --------

  // Live mode: optimistic remove -> server; Sandbox: local overlay only
  async function remove(id) {
    if (mode === 'sandbox') {
      overlayById.delete(id);
      overlayDeletes.add(id);
      emit();
      return {};
    }
    // live
    byId.delete(id); // optimistic
    emit();
    const { error } = await repo.deleteCell(id) || {};
    if (error) {
      // rollback (simple: refresh)
      await refresh();
      return { error };
    }
    return {};
  }

  // Upsert for edits/inserts from UI
  async function upsert(cell) {
    if (mode === 'sandbox') {
      overlayDeletes.delete(cell.id);
      overlayById.set(cell.id, cell);
      emit();
      return {};
    }
    // live: optimistic UI, then durable write happens wherever your page handles it (or add repo.insert/update here)
    byId.set(cell.id, cell);
    emit();
    return {};
  }

  // Flush/refresh base from server (discard overlay in sandbox when resetting)
  async function refresh() {
    const rows = await repo.getCells(notebookId);
    byId.clear();
    for (const row of rows || []) byId.set(row.id, row);
    emit();
  }

  // Sandbox only: clear overlays
  async function resetSandbox() {
    overlayById.clear();
    overlayDeletes.clear();
    await refresh();
  }

  function destroy() {
    unsub && unsub();
    byId.clear();
    overlayById.clear();
    overlayDeletes.clear();
    liveReady = false;
    queue.length = 0;
  }

  return {
    cells,
    // convenience: allow callers to subscribe directly
    subscribe: cells.subscribe,
    remove,
    upsert,
    refresh,
    resetSandbox,
    destroy,
    mode
  };
}
