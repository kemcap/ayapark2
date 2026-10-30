#!/usr/bin/env bash
# Synthetic PostgreSQL 17 + age encryption/restore smoke test.
# NEVER connects to Supabase, Google Drive, or real AyaPark data.
set -Eeuo pipefail
umask 077
for command in docker age age-keygen; do
  command -v "$command" >/dev/null || { echo "Missing test tool: $command" >&2; exit 2; }
done
TMP="$(mktemp -d)"
CONTAINER="ayapark2-synthetic-restore-$$"
cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT

docker run --rm -d --name "$CONTAINER" -e POSTGRES_PASSWORD=synthetic-test-only -e POSTGRES_DB=fixture_source postgres:17 >/dev/null
for attempt in $(seq 1 60); do
  if docker exec "$CONTAINER" pg_isready -U postgres -d fixture_source >/dev/null 2>&1; then break; fi
  if (( attempt == 60 )); then echo "Synthetic PostgreSQL container not ready" >&2; exit 1; fi
  sleep 1
done
# Synthetic global roles demonstrate why --no-acl exports need separate role/GRANT recovery.
docker exec -i "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d fixture_source >/dev/null <<'SQL'
CREATE ROLE fixture_resident_a NOLOGIN;
CREATE ROLE fixture_resident_b NOLOGIN;
CREATE ROLE fixture_anonymous NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA ay2_private;
CREATE SCHEMA ay_auth_private;
CREATE TABLE auth.users (id integer PRIMARY KEY, email text NOT NULL);
INSERT INTO auth.users VALUES (1, 'synthetic@example.invalid');
CREATE TABLE public.site_units (id integer PRIMARY KEY, code text NOT NULL);
INSERT INTO public.site_units VALUES (1,'A-1'), (2,'B-1');
CREATE TABLE public.ay2_entries (id integer PRIMARY KEY, unit_id integer REFERENCES public.site_units, amount numeric NOT NULL);
INSERT INTO public.ay2_entries VALUES (1,1,123.45), (2,2,456.78);
CREATE TABLE ay_auth_private.fixture_tokens (id integer PRIMARY KEY, description text NOT NULL);
INSERT INTO ay_auth_private.fixture_tokens VALUES (1, 'synthetic-token');
CREATE FUNCTION ay2_private.guard_person_identity() RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
ALTER TABLE public.ay2_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_resident_a_only ON public.ay2_entries FOR SELECT TO fixture_resident_a USING (unit_id=1);
CREATE POLICY fixture_resident_b_only ON public.ay2_entries FOR SELECT TO fixture_resident_b USING (unit_id=2);
SQL

# Mimics main's PostgreSQL schema scope with dummy objects only.
docker exec "$CONTAINER" pg_dump -U postgres -d fixture_source -Fc --no-owner --no-acl \
  -n public -n auth -n ay2_private -n ay_auth_private > "$TMP/fixture.dump"
test -s "$TMP/fixture.dump"
age-keygen -o "$TMP/throwaway-identity.txt" >/dev/null 2>&1
RECIPIENT="$(age-keygen -y "$TMP/throwaway-identity.txt")"
age -r "$RECIPIENT" -o "$TMP/fixture.dump.age" "$TMP/fixture.dump"
rm "$TMP/fixture.dump"
age -d -i "$TMP/throwaway-identity.txt" -o "$TMP/fixture-restored.dump" "$TMP/fixture.dump.age"
docker cp "$TMP/fixture-restored.dump" "$CONTAINER:/tmp/fixture-restored.dump" >/dev/null
docker exec "$CONTAINER" pg_restore --list /tmp/fixture-restored.dump > "$TMP/toc.txt"
for pattern in 'TABLE DATA auth users ' 'TABLE DATA public ay2_entries ' 'TABLE DATA public site_units ' 'TABLE DATA ay_auth_private fixture_tokens ' 'FUNCTION ay2_private guard_person_identity'; do
  grep -Fq "$pattern" "$TMP/toc.txt" || { echo "Missing synthetic object: $pattern" >&2; exit 1; }
done
docker exec "$CONTAINER" pg_restore --file /dev/null /tmp/fixture-restored.dump

# New empty database; never a live Supabase instance.
docker exec "$CONTAINER" createdb -U postgres fixture_restore
docker exec "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d fixture_restore -c 'DROP SCHEMA public CASCADE' >/dev/null
docker exec "$CONTAINER" pg_restore --exit-on-error --no-owner --no-acl -U postgres -d fixture_restore /tmp/fixture-restored.dump
docker exec -i "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d fixture_restore >/dev/null <<'SQL'
GRANT USAGE ON SCHEMA public TO fixture_resident_a, fixture_resident_b, fixture_anonymous;
GRANT SELECT ON public.ay2_entries TO fixture_resident_a, fixture_resident_b, fixture_anonymous;
SQL
query() { docker exec "$CONTAINER" psql -X -q -A -t -v ON_ERROR_STOP=1 -U postgres -d fixture_restore -c "$1"; }
[[ "$(query 'SELECT count(*) FROM auth.users')" == 1 ]]
[[ "$(query 'SELECT count(*) FROM public.site_units')" == 2 ]]
[[ "$(query 'SELECT count(*) FROM public.ay2_entries')" == 2 ]]
[[ "$(query 'SELECT count(*) FROM ay_auth_private.fixture_tokens')" == 1 ]]
[[ "$(query "SELECT relrowsecurity FROM pg_class WHERE oid='public.ay2_entries'::regclass")" == t ]]
[[ "$(query 'SET ROLE fixture_resident_a; SELECT count(*) FROM public.ay2_entries')" == 1 ]]
[[ "$(query 'SET ROLE fixture_resident_a; SELECT count(*) FROM public.ay2_entries WHERE unit_id=2')" == 0 ]]
[[ "$(query 'SET ROLE fixture_resident_b; SELECT count(*) FROM public.ay2_entries')" == 1 ]]
[[ "$(query 'SET ROLE fixture_anonymous; SELECT count(*) FROM public.ay2_entries')" == 0 ]]
echo 'SYNTHETIC ENCRYPT / DECRYPT / PG17 RESTORE / RLS CHECK PASSED (NO REAL DATA).'
