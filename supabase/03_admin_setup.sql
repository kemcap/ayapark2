-- PRIVATE ADMIN SETUP; change the email below to your chosen Supabase Auth admin account.
-- 1. Supabase Dashboard -> Authentication -> Users -> Add user.
--    Use a strong unique password, never use the old 77887788 PIN.
-- 2. Confirm the email and run this SQL in Supabase SQL Editor.
-- 3. Verify one UUID was inserted. Do not include this personal email in public GitHub.

-- REPLACE 'ADMIN_EMAIL_HERE' BEFORE EXECUTING:
insert into public.ayapark_admins(user_id)
select id from auth.users where lower(email) = lower('ADMIN_EMAIL_HERE')
on conflict (user_id) do nothing;

select count(*) as administrator_count from public.ayapark_admins;
