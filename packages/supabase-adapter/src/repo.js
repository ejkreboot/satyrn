// Minimal NotebookRepo using a passed-in Supabase client
export function makeNotebookRepo(client) {
  return {
    async listNotebooks() {
      const { data, error } = await client
        .from('notebooks')
        .select('id,title')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    async getCells(notebookId) {
      const { data, error } = await client
        .from('cells')
        .select('*')
        .eq('notebook_id', notebookId)
        .order('order_key', { ascending: true }); // keep the same key the store sorts on
      if (error) throw error;
      const rv = (data ?? []).map(r => ({
        id: r.id,
        notebookId: r.notebook_id,
        order_key: r.order_key,
        type: r.type,
        content: r.content,
        rev: r.rev
      }));
      return (rv);
    },
    async updateCell(patch) {
      const { id, ...rest } = patch;
      const { error } = await client.from('cells').update(rest).eq('id', id);
      if (error) throw error;
    },
    async insertCell(cell) {
      const row = {
        id: cell.id,
        notebook_id: cell.notebookId,
        order_key: cell.key,
        type: cell.type,
        content: cell.content,
        rev: cell.rev ?? 1
      };
      const { error } = await client.from('cells').insert(row);
      if (error) throw error;
    },
    async deleteCell(id) {
      const { error, data } = await client.from('cells').delete().eq('id', id);
      if (error) throw error;
    }
  };
}
