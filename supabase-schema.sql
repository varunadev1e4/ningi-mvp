-- ============================================================
-- Ningi — Supabase Database Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Profiles ─────────────────────────────────────────────
create table if not exists public.profiles (
  id        uuid references auth.users(id) on delete cascade primary key,
  username  text not null,
  email     text not null,
  created_at timestamptz not null default now(),
  constraint profiles_username_unique unique (username),
  constraint profiles_username_length check (char_length(username) between 3 and 24),
  constraint profiles_username_chars  check (username ~ '^[a-zA-Z0-9_]+$')
);

-- ── 2. Global chat messages ──────────────────────────────────
create table if not exists public.messages (
  id          uuid not null default gen_random_uuid() primary key,
  room_url    text not null,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  username    text not null,            -- denormalized for fast display
  content     text not null,
  created_at  timestamptz not null default now(),
  constraint messages_content_not_empty check (char_length(content) > 0),
  constraint messages_content_max_len   check (char_length(content) <= 2000)
);

create index if not exists idx_messages_room_url   on public.messages (room_url);
create index if not exists idx_messages_created_at on public.messages (created_at);

-- ── 3. Direct messages ──────────────────────────────────────
create table if not exists public.direct_messages (
  id              uuid not null default gen_random_uuid() primary key,
  conversation_id text not null,          -- sorted(sender_id, receiver_id) joined with ':'
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  receiver_id     uuid not null references public.profiles(id) on delete cascade,
  sender_username text not null,          -- denormalized
  content         text not null,
  created_at      timestamptz not null default now(),
  constraint dm_content_not_empty check (char_length(content) > 0),
  constraint dm_content_max_len   check (char_length(content) <= 2000)
);

create index if not exists idx_dm_conversation_id on public.direct_messages (conversation_id);
create index if not exists idx_dm_created_at      on public.direct_messages (created_at);

-- ── 4. Row Level Security ────────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.messages        enable row level security;
alter table public.direct_messages enable row level security;

-- profiles: any signed-in user can read; only own row can be written
create policy "profiles: authenticated can read"
  on public.profiles for select
  using ( auth.role() = 'authenticated' );

create policy "profiles: user inserts own row"
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "profiles: user updates own row"
  on public.profiles for update
  using ( auth.uid() = id );

-- messages: any signed-in user can read/insert; cannot edit others
create policy "messages: authenticated can read"
  on public.messages for select
  using ( auth.role() = 'authenticated' );

create policy "messages: user inserts own"
  on public.messages for insert
  with check ( auth.uid() = user_id );

-- direct_messages: only participants can read; only sender can insert
create policy "dm: participants can read"
  on public.direct_messages for select
  using ( auth.uid() = sender_id or auth.uid() = receiver_id );

create policy "dm: sender can insert"
  on public.direct_messages for insert
  with check ( auth.uid() = sender_id );

-- ── 5. Realtime ─────────────────────────────────────────────
-- This project uses Supabase Broadcast for real-time messaging.
-- Broadcast works out of the box — NO table replication setup needed.
-- Messages are persisted to DB on insert; real-time delivery is via
-- the Broadcast channel (WebSocket peer-to-peer through Supabase).
-- Nothing to configure in the dashboard for real-time to work.

-- ── 6. Feedback ──────────────────────────────────────────────
create table if not exists public.feedback (
  id         uuid not null default gen_random_uuid() primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  username   text not null,
  rating     smallint not null check (rating between 1 and 5),
  category   text not null check (category in ('bug', 'feature', 'ux', 'general')),
  message    text not null,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Users can insert their own feedback but cannot read others'
create policy "feedback: user can insert"
  on public.feedback for insert
  with check ( auth.uid() = user_id );

-- Only service role (your Supabase dashboard) can read all feedback
-- You can view it in: Supabase Dashboard → Table Editor → feedback

-- ── 7. Reply + Delete + Reactions (add to existing tables) ──
-- Run each ALTER separately if tables already exist

alter table public.messages
  add column if not exists reply_to_id      uuid,
  add column if not exists reply_to_username text,
  add column if not exists reply_to_content  text,
  add column if not exists is_deleted        boolean not null default false;

alter table public.direct_messages
  add column if not exists reply_to_id      uuid,
  add column if not exists reply_to_username text,
  add column if not exists reply_to_content  text,
  add column if not exists is_deleted        boolean not null default false;

-- Allow users to soft-delete their own messages
create policy "messages: user soft-deletes own"
  on public.messages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "dm: sender soft-deletes own"
  on public.direct_messages for update
  using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);

-- ── 8. Reactions ─────────────────────────────────────────────
create table if not exists public.reactions (
  id         uuid not null default gen_random_uuid() primary key,
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  username   text not null,
  emoji      text not null,
  created_at timestamptz not null default now(),
  constraint reactions_unique unique (message_id, user_id, emoji)
);

alter table public.reactions enable row level security;

create policy "reactions: authenticated can read"
  on public.reactions for select
  using (auth.role() = 'authenticated');

create policy "reactions: user inserts own"
  on public.reactions for insert
  with check (auth.uid() = user_id);

create policy "reactions: user deletes own"
  on public.reactions for delete
  using (auth.uid() = user_id);

-- ── 9. Course field on profiles ──────────────────────────────
alter table public.profiles
  add column if not exists course text not null default '';
