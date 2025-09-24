export function createServerEngine(endpoint = "/api/python") {
  return {
    kind: "server",
    async run(code) {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const json = await r.json().catch(() => ({}));
      return json.outputs ?? [{ mime: "text/plain", data: (await r.text()) || "" }];
    }
  };
}
