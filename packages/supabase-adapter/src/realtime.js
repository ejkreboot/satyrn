// packages/supabase-adapter/makeRealtime.js
export function makeRealtime(client) {
  return {
    subscribeCells(notebookId, onEvent) {
      const channel = client
        .channel(`cells:${notebookId}`)
        .on(
          'postgres_changes',
          {
            event: '*',              // INSERT | UPDATE | DELETE
            schema: 'public',
            table: 'cells',
            filter: `notebook_id=eq.${notebookId}` // applies to NEW for ins/upd, OLD for del
          },
          (payload) => {
            const { eventType, new: recNew, old: recOld } = payload;

            if (eventType === 'DELETE') {
              // requires REPLICA IDENTITY FULL so old is present & filter matches
              if (!recOld) return; // safety
              onEvent({
                type: 'delete',
                cell: { id: recOld.id } // id is enough for your store
              });
              return;
            }

            const rec = recNew; // INSERT/UPDATE
            if (!rec) return;

            onEvent({
              type: eventType.toLowerCase(), // 'insert' | 'update'
              cell: {
                id: rec.id,
                notebook_id: rec.notebook_id,
                order_key: rec.order_key, // keep the same key the store sorts on
                type: rec.type,
                content: rec.content,
                rev: rec.rev,
                updated_at: rec.updated_at
              }
            });
          }
        )
        .subscribe();

      return () => client.removeChannel(channel);
    }
  };
}
