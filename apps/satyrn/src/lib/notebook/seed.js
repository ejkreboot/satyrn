export async function seedWelcomeIfEmpty(browserClient, notebookId) {
  const { data, error } = await browserClient
    .from('cells').select('id').eq('notebook_id', notebookId).limit(1);

  if (error || (data && data.length)) return;

  const welcome = {
    id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
    notebook_id: notebookId,
    order_key: "U",
    type: 'md',
    content: { source: '# Welcome to Satyrn\nClick to edit. Add markdown and code blocks.' },
    rev: 1
  };
  await browserClient.from('cells').insert(welcome);
}