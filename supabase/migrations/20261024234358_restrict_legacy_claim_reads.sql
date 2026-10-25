SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='8s';
-- Narrow legacy reads; no table rows, balances or V3 policies are changed.
DO $guard$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ayapark_claims' AND policyname='read_public_ayapark_claims' AND qual='true' AND roles=ARRAY['anon','authenticated']::name[]) THEN
  RAISE EXCEPTION 'Legacy policy differs from reviewed baseline; re-audit before applying';
 END IF;
 PERFORM set_config('ayapark.audit_claims_hash',(SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id),'[]')::text) FROM public.ayapark_claims c),true);
END;$guard$;
REVOKE SELECT ON public.ayapark_claims FROM anon;
ALTER POLICY read_public_ayapark_claims ON public.ayapark_claims
 TO authenticated
 USING ((SELECT public.ayapark_is_admin()) OR EXISTS (
  SELECT 1 FROM public.site_sites s
  WHERE s.slug='aya-park-2' AND ay2_private.can(s.id,'finance')
 ));

DO $verify$ BEGIN
 IF current_setting('ayapark.audit_claims_hash') IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id),'[]')::text) FROM public.ayapark_claims c) THEN
  RAISE EXCEPTION 'Legacy financial rows changed unexpectedly';
 END IF;
END;$verify$;
