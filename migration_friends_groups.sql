-- ============================================================
-- NINGI MIGRATION: Friends + Groups
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. Friendships ───────────────────────────────────────────
create table if not exists public.friendships (
  id           uuid        primary key default gen_random_uuid(),
  requester_id uuid        not null references public.profiles(id) on delete cascade,
  addressee_id uuid        not null references public.profiles(id) on delete cascade,
  status       text        not null default 'pending'
                           check (status in ('pending','accepted','rejected','blocked')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint friendships_unique  unique (requester_id, addressee_id),
  constraint friendships_no_self check (requester_id != addressee_id)
);

create index if not exists idx_friendships_requester on public.friendships(requester_id);
create index if not exists idx_friendships_addressee on public.friendships(addressee_id);
create index if not exists idx_friendships_status    on public.friendships(status);

alter table public.friendships enable row level security;

create policy "friendships: users see own"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "friendships: user inserts as requester"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

create policy "friendships: addressee can update status"
  on public.friendships for update
  using (auth.uid() = addressee_id or auth.uid() = requester_id);

create policy "friendships: participants can delete"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Auto-update updated_at
create or replace function update_friendships_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_friendships_updated_at
  before update on public.friendships
  for each row execute function update_friendships_updated_at();


-- ── 2. Groups ────────────────────────────────────────────────
create table if not exists public.groups (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  description  text        not null default '',
  created_by   uuid        references public.profiles(id) on delete set null,
  is_public    boolean     not null default false,
  avatar_color text        not null default '#06558D',
  member_count int         not null default 1,
  created_at   timestamptz not null default now()
);

alter table public.groups enable row level security;

-- Members can see their groups; everyone can see public groups
create policy "groups: members can select"
  on public.groups for select
  using (
    is_public = true
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = id and gm.user_id = auth.uid()
    )
  );

create policy "groups: authenticated can insert"
  on public.groups for insert
  with check (auth.uid() = created_by);

create policy "groups: admin can update"
  on public.groups for update
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );


-- ── 3. Group Members ─────────────────────────────────────────
create table if not exists public.group_members (
  group_id  uuid        not null references public.groups(id) on delete cascade,
  user_id   uuid        not null references public.profiles(id) on delete cascade,
  role      text        not null default 'member' check (role in ('admin','member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists idx_group_members_user on public.group_members(user_id);

alter table public.group_members enable row level security;

create policy "group_members: members can select"
  on public.group_members for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.group_members gm2
      where gm2.group_id = group_id and gm2.user_id = auth.uid()
    )
    or exists (
      select 1 from public.groups g where g.id = group_id and g.is_public = true
    )
  );

create policy "group_members: user can insert self"
  on public.group_members for insert
  with check (auth.uid() = user_id);

create policy "group_members: user can delete self or admin can delete"
  on public.group_members for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );


-- ── 4. Group Messages ────────────────────────────────────────
create table if not exists public.group_messages (
  id                uuid        primary key default gen_random_uuid(),
  group_id          uuid        not null references public.groups(id) on delete cascade,
  user_id           uuid        references public.profiles(id) on delete set null,
  username          text        not null,
  content           text        not null,
  reply_to_id       uuid,
  reply_to_username text,
  reply_to_content  text,
  is_deleted        boolean     not null default false,
  created_at        timestamptz not null default now(),
  constraint group_messages_content_len check (char_length(content) <= 2000)
);

create index if not exists idx_group_messages_group on public.group_messages(group_id, created_at desc);

alter table public.group_messages enable row level security;

create policy "group_messages: members can select"
  on public.group_messages for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid()
    )
  );

create policy "group_messages: members can insert"
  on public.group_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid()
    )
  );

create policy "group_messages: author soft-deletes own"
  on public.group_messages for update
  using (auth.uid() = user_id);


-- ── 5. Auto-update group member_count ────────────────────────
create or replace function sync_group_member_count()
returns trigger as $$
begin
  update public.groups
  set member_count = (
    select count(*) from public.group_members where group_id = coalesce(new.group_id, old.group_id)
  )
  where id = coalesce(new.group_id, old.group_id);
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger trg_group_member_count_ins
  after insert on public.group_members
  for each row execute function sync_group_member_count();

create trigger trg_group_member_count_del
  after delete on public.group_members
  for each row execute function sync_group_member_count();
