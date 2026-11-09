-- Run once in the Supabase SQL editor.
-- Authentication → Providers → Email stays on.
-- Authentication → URL configuration → add the site origin (http://localhost:5173 and the Vercel URL)
-- so password-reset links can come back.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  username text not null check (username ~ '^[A-Za-z][A-Za-z0-9_]{2,15}$'),
  year text not null check (year in ('S4', 'S5', 'S6', 'S7')),
  maths text not null check (maths in ('3', '4', '5', '6')),
  advanced boolean not null default false,
  physics boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.favourites (
  user_id uuid primary key references auth.users (id) on delete cascade,
  formulas jsonb not null default '[]'::jsonb,
  notations jsonb not null default '[]'::jsonb
);

alter table public.profiles add column if not exists username text;

alter table public.profiles drop constraint if exists profiles_username_check;
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[A-Za-z][A-Za-z0-9_]{2,15}$');

drop index if exists public.profiles_username_key;
create unique index profiles_username_key on public.profiles (lower(username));

alter table public.profiles enable row level security;
alter table public.favourites enable row level security;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.favourites to authenticated;

create policy "read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "delete own profile" on public.profiles
  for delete to authenticated using (auth.uid() = id);

create policy "read own stars" on public.favourites
  for select to authenticated using (auth.uid() = user_id);
create policy "insert own stars" on public.favourites
  for insert to authenticated with check (auth.uid() = user_id);
create policy "update own stars" on public.favourites
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own stars" on public.favourites
  for delete to authenticated using (auth.uid() = user_id);

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
