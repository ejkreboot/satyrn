-- ===============================
-- Extensions
-- ===============================
create extension if not exists pgcrypto;

-- ===============================
-- Tables
-- ===============================

-- Notebooks: UUID PK, editable slug
create table if not exists public.notebooks (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references auth.users on delete set null,
  title      text not null,
  slug       text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notebooks_slug_valid
    check (slug is null or slug ~ '^[a-z0-9][a-z0-9_-]{2,63}$')
);

-- Case-insensitive uniqueness for slug (only when slug is not null)
create unique index if not exists notebooks_slug_lower_key
  on public.notebooks (lower(slug))
  where slug is not null;


-- Cells: FK → notebooks, cascade on update/delete
create table if not exists public.cells (
  id           uuid primary key default gen_random_uuid(),
  notebook_id  uuid not null references public.notebooks(id)
                 on update cascade on delete cascade,
  order_key text collate "C",
  type         text not null,  -- e.g., 'md', 'py'
  content      jsonb not null default '{}'::jsonb,
  rev          int   not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Validate allowed chars (base62, at least 1 char)
  constraint cells_order_key_valid
    check (order_key ~ '^[0-9A-Za-z]+$')

);`

-- Per-notebook uniqueness is nice-to-have but optional:
CREATE UNIQUE INDEX IF NOT EXISTS cells_nb_orderkey_uniq
  on public.cells (notebook_id, order_key collate "C");
  
-- ===============================
-- Updated-at trigger
-- ===============================
create or replace function public.tg_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists notebooks_touch_updated_at on public.notebooks;
create trigger notebooks_touch_updated_at
before update on public.notebooks
for each row execute procedure public.tg_touch_updated_at();

drop trigger if exists cells_touch_updated_at on public.cells;
create trigger cells_touch_updated_at
before update on public.cells
for each row execute procedure public.tg_touch_updated_at();

-- ===============================
-- Slug RPC
-- ===============================
create or replace function public.set_notebook_slug(nb_id uuid, new_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if new_slug is null then
    update public.notebooks set slug = null where id = nb_id;
    if not found then raise exception 'not_found'; end if;
    return;
  end if;

  if new_slug !~ '^[a-z0-9][a-z0-9_-]{2,63}$' then
    raise exception 'invalid_slug';
  end if;

  update public.notebooks set slug = lower(new_slug) where id = nb_id;
  if not found then raise exception 'not_found'; end if;
end
$$;

-- ===============================
-- Realtime & WAL settings
-- ===============================
-- Ensure DELETE events include OLD row so filters work
alter table public.cells replica identity full;

-- Add to supabase realtime publication
alter publication supabase_realtime add table public.notebooks;
alter publication supabase_realtime add table public.cells;

-- ===============================
-- Row Level Security (RLS) policies
-- Model: "owner-or-anon"
-- - owner_id = auth.uid()  → owner has full access
-- - owner_id is null       → anon/public: anyone may read/modify
-- ===============================

alter table public.notebooks enable row level security;
alter table public.cells     enable row level security;

-- ---- Notebooks policies ----
drop policy if exists "notebooks select owner-or-anon" on public.notebooks;
create policy "notebooks select owner-or-anon"
  on public.notebooks
  for select
  using (owner_id is null or owner_id = auth.uid());

drop policy if exists "notebooks insert anon" on public.notebooks;
create policy "notebooks insert anon"
  on public.notebooks
  for insert
  with check (owner_id is null);

drop policy if exists "notebooks update owner-or-anon" on public.notebooks;
create policy "notebooks update owner-or-anon"
  on public.notebooks
  for update
  using (owner_id is null or owner_id = auth.uid())
  with check (owner_id is null or owner_id = auth.uid());

drop policy if exists "notebooks delete owner-or-anon" on public.notebooks;
create policy "notebooks delete owner-or-anon"
  on public.notebooks
  for delete
  using (owner_id is null or owner_id = auth.uid());

-- ---- Cells policies (scoped via parent notebook) ----
drop policy if exists "cells select owner-or-anon" on public.cells;
create policy "cells select owner-or-anon"
  on public.cells
  for select
  using (
    exists (
      select 1 from public.notebooks n
      where n.id = cells.notebook_id
        and (n.owner_id is null or n.owner_id = auth.uid())
    )
  );

drop policy if exists "cells insert owner-or-anon" on public.cells;
create policy "cells insert owner-or-anon"
  on public.cells
  for insert
  with check (
    exists (
      select 1 from public.notebooks n
      where n.id = cells.notebook_id
        and (n.owner_id is null or n.owner_id = auth.uid())
    )
  );

drop policy if exists "cells update owner-or-anon" on public.cells;
create policy "cells update owner-or-anon"
  on public.cells
  for update
  using (
    exists (
      select 1 from public.notebooks n
      where n.id = cells.notebook_id
        and (n.owner_id is null or n.owner_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.notebooks n
      where n.id = cells.notebook_id
        and (n.owner_id is null or n.owner_id = auth.uid())
    )
  );

drop policy if exists "cells delete owner-or-anon" on public.cells;
create policy "cells delete owner-or-anon"
  on public.cells
  for delete
  using (
    exists (
      select 1 from public.notebooks n
      where n.id = cells.notebook_id
        and (n.owner_id is null or n.owner_id = auth.uid())
    )
  );
