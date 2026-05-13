-- ============================================================
-- Ningi MVP — Clean Demo Data
-- Run in: Supabase Dashboard → SQL Editor
-- This deletes ALL users, messages, DMs, reactions and feedback.
-- ============================================================

-- Order matters because of foreign key constraints

delete from public.reactions;
delete from public.direct_messages;
delete from public.messages;
delete from public.feedback;
delete from public.profiles;

-- Delete all auth users (Supabase internal table)
delete from auth.users;

-- Confirm everything is empty
select 'profiles'       as tbl, count(*) from public.profiles
union all
select 'messages'       as tbl, count(*) from public.messages
union all
select 'direct_messages'as tbl, count(*) from public.direct_messages
union all
select 'reactions'      as tbl, count(*) from public.reactions
union all
select 'feedback'       as tbl, count(*) from public.feedback
union all
select 'auth.users'     as tbl, count(*) from auth.users;
