-- AYAPARK 2 / SUPABASE SCHEMA
-- Run once in the Supabase SQL Editor as the project owner.
-- PUBLIC data: balances, payment/sent flags; PRIVATE data: names, units, notes.
-- Names are NEVER to be committed to a public GitHub repository.

create table if not exists public.ayapark_claims (
    id text primary key,
    sort_order integer not null unique,
    amount numeric(12,2) not null check (amount >= 0),
    person_kind text not null check (person_kind in ('M','K','?')),
    followup_kind text not null check (followup_kind in ('general','icra')),
    is_paid boolean not null default false,
    message_sent boolean not null default false,
    updated_at timestamptz not null default now()
);

create table if not exists public.ayapark_private (
    id text primary key references public.ayapark_claims(id) on delete cascade,
    full_name text not null,
    unit text not null,
    note text not null default '',
    identity_note text not null default '',
    pre_note text not null default '',
    needs_verification boolean not null default false,
    updated_at timestamptz not null default now()
);

create table if not exists public.ayapark_admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

-- SECURITY DEFINER accesses only the locked-down admin allowlist.
create or replace function public.ayapark_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
      select 1 from public.ayapark_admins a
      where a.user_id = (select auth.uid())
    );
$$;

revoke all on function public.ayapark_is_admin() from public;
revoke all on function public.ayapark_is_admin() from anon;
grant execute on function public.ayapark_is_admin() to authenticated;

create or replace function public.ayapark_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_ayapark_claims_updated on public.ayapark_claims;
create trigger trg_ayapark_claims_updated before update on public.ayapark_claims
for each row execute function public.ayapark_touch_updated_at();
drop trigger if exists trg_ayapark_private_updated on public.ayapark_private;
create trigger trg_ayapark_private_updated before update on public.ayapark_private
for each row execute function public.ayapark_touch_updated_at();

alter table public.ayapark_claims enable row level security;
alter table public.ayapark_private enable row level security;
alter table public.ayapark_admins enable row level security;

-- Drop/recreate policies for repeatable migrations.
drop policy if exists "read_public_ayapark_claims" on public.ayapark_claims;
create policy "read_public_ayapark_claims" on public.ayapark_claims
for select to anon, authenticated using (true);

drop policy if exists "admin_update_claims" on public.ayapark_claims;
create policy "admin_update_claims" on public.ayapark_claims
for update to authenticated
using ((select public.ayapark_is_admin()))
with check ((select public.ayapark_is_admin()));

drop policy if exists "admin_read_private" on public.ayapark_private;
create policy "admin_read_private" on public.ayapark_private
for select to authenticated
using ((select public.ayapark_is_admin()));

drop policy if exists "admin_update_private" on public.ayapark_private;
create policy "admin_update_private" on public.ayapark_private
for update to authenticated
using ((select public.ayapark_is_admin()))
with check ((select public.ayapark_is_admin()));

-- No SELECT policy on ayapark_admins; security-definer function checks it.
revoke all on public.ayapark_admins from anon, authenticated;
revoke all on public.ayapark_private from anon, authenticated;
revoke all on public.ayapark_claims from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.ayapark_claims to anon, authenticated;
grant update (is_paid, message_sent) on public.ayapark_claims to authenticated;
grant select on public.ayapark_private to authenticated;
grant update (note, identity_note) on public.ayapark_private to authenticated;

-- Do NOT make any public SELECT view containing personal data.
-- IMPORTANT: Create/verify your Auth user and insert their UUID into
-- public.ayapark_admins using the separate 03_admin_setup.sql instructions.
