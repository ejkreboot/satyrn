# Satyrn

Satyrn is a small, notebook-style editor built with Svelte and SvelteKit. It provides
editable cells (markdown and code), a realtime cell store, and a pluggable execution
engine for code cells. The project is organized as a monorepo with a demo app and
several local packages (UI components, adapters, and engines).

Important: at the moment only Python code blocks are supported for execution (via
the bundled Pyodide engine). Support for other languages and runtimes is planned
and will be added over time.

Features

- Notebook-style cells: markdown + code blocks
- Sanitized markdown rendering (marked + DOMPurify)
- Realtime cell list backed by a pluggable adapter (Supabase adapter included)
- Optimistic UI updates, sandbox mode, and local overlays for offline editing
- Pluggable execution engines (Pyodide/Python bundled)

Quick start (development)

0. Pre-reqs

- Create a supabase database, intialize with `init.sql`
- Copy ./apps/satyrn/.env.example to ./apps/satyrn/.env and update with your values

1. Install dependencies at the repo root:

   ```bash
   npm install
   ```

2. Run the demo app (SvelteKit + Vite dev server):

   ```bash
   npm run dev --workspace-root
   # or from the apps/satyrn folder if you prefer
   cd apps/satyrn && npm install && npm run dev
   ```

Open the app in your browser (usually http://localhost:5173 or the port Vite reports).

Where to look in the repo

- `apps/satyrn` — demo SvelteKit app and entrypoint used during development
- `packages/svelte` — shared Svelte components (SatyrnCell and styles)
- `packages/supabase-adapter` — Supabase-backed repo + realtime adapter
- `packages/engines` — runtime engines (Pyodide integration)
- `packages/realtime` — small cellStore abstraction used by the app

Notes and current limitations

- Execution: only Python code blocks are executed right now (via Pyodide). Other
  languages and remote execution backends are planned.
- Realtime: the repo uses Supabase Realtime channels for events; be sure your
  Supabase instance has the appropriate publication configured if you run with
  a live database (see `init.sql`).

Contributing

- Run the demo locally and explore `apps/satyrn/src` for examples of how the
  store, components, and engines are wired together.
- Keep the `packages/*` code focused: adapters for external services, UI in
  `packages/svelte`, and small helper libs under `apps/satyrn/src/lib`.

License

- This project is released under the MIT License. See `LICENSE` for details.
