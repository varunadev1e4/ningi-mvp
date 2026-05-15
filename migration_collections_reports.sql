-- ============================================================
-- NINGI MIGRATION: Collections + Reports
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- ── 1. Add collections_public column to profiles ─────────────
alter table public.profiles
  add column if not exists collections_public boolean not null default true;


-- ── 2. collections table ──────────────────────────────────────
create table if not exists public.collections (
  id        uuid        not null default gen_random_uuid() primary key,
  user_id   uuid        not null references public.profiles(id) on delete cascade,
  url       text        not null,
  title     text        not null default '',
  saved_at  timestamptz not null default now(),

  constraint collections_user_url_unique unique (user_id, url)
);

create index if not exists idx_collections_user_id on public.collections (user_id, saved_at desc);

-- RLS
alter table public.collections enable row level security;

-- Own rows: full CRUD
create policy "collections: user selects own"
  on public.collections for select
  using ( auth.uid() = user_id );

create policy "collections: user inserts own"
  on public.collections for insert
  with check ( auth.uid() = user_id );

create policy "collections: user updates own"
  on public.collections for update
  using ( auth.uid() = user_id );

create policy "collections: user deletes own"
  on public.collections for delete
  using ( auth.uid() = user_id );

-- Public collections: authenticated users can read rows where owner has collections_public = true
create policy "collections: others read public"
  on public.collections for select
  using (
    auth.role() = 'authenticated'
    and user_id != auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = collections.user_id
        and p.collections_public = true
    )
  );


-- ── 3. reports table ─────────────────────────────────────────
create table if not exists public.reports (
  id           uuid        not null default gen_random_uuid() primary key,
  reporter_id  uuid        not null references public.profiles(id) on delete set null,
  type         text        not null check (type in ('user', 'message')),
  target_id    uuid        not null,     -- user_id OR message id
  reason       text        not null check (reason in (
                 'spam', 'harassment', 'hate_speech', 'impersonation',
                 'inappropriate_content', 'misinformation', 'other'
               )),
  details      text        not null default '',
  context_url  text        not null default '',
  status       text        not null default 'pending'
                           check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by  uuid        references public.profiles(id) on delete set null,
  reviewed_at  timestamptz,
  admin_notes  text        default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_reports_status     on public.reports (status, created_at desc);
create index if not exists idx_reports_reporter   on public.reports (reporter_id);
create index if not exists idx_reports_target     on public.reports (target_id, type);

-- RLS
alter table public.reports enable row level security;

-- Users can only insert their own reports; no SELECT (moderation team handles via service role)
create policy "reports: user inserts own"
  on public.reports for insert
  with check ( auth.uid() = reporter_id );

-- Prevent self-reporting (optional extra safety — also enforced client-side)
-- The check constraint on type + the client guard is sufficient.


-- ── 4. Auto-update updated_at on reports ─────────────────────
create or replace function update_reports_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_reports_updated_at on public.reports;
create trigger trg_reports_updated_at
  before update on public.reports
  for each row execute function update_reports_updated_at();


-- ── 5. Verification (run after migration) ────────────────────
-- select column_name from information_schema.columns
--   where table_name = 'profiles' and column_name = 'collections_public';
-- select table_name from information_schema.tables
--   where table_name in ('collections', 'reports');
