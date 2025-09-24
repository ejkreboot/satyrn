// apps/satyrn/src/lib/notebook/typing.js
export function createTyping(bus, notebookId, clientId) {
  const peersByCell = new Map();
  let pulse = 0;

  const channel = bus.channel(`nb:${notebookId}`, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      const { cellId, clientId: peer } = payload || {};
      if (!cellId || peer === clientId) return;
      let peers = peersByCell.get(cellId);
      if (!peers) { peers = new Map(); peersByCell.set(cellId, peers); }
      clearTimeout(peers.get(peer));
      peers.set(peer, setTimeout(() => {
        const p = peersByCell.get(cellId); if (!p) return;
        p.delete(peer); if (p.size === 0) peersByCell.delete(cellId);
        pulse = Date.now();
      }, 2500));
      pulse = Date.now();
    })
    .subscribe();

  function count(cellId) { void pulse; return peersByCell.get(cellId)?.size || 0; }
  function notify(cellId) { channel.send({ type: 'broadcast', event: 'typing', payload: { cellId, clientId } }); }
  function destroy() { bus.removeChannel(channel); }

  return { count, notify, destroy };
}
