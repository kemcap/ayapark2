-- Explicit rollback only: restores original policies and review function, never data.
CREATE OR REPLACE FUNCTION ay2_private.review_sources(s uuid)
 RETURNS TABLE(kind text, source_id uuid, fingerprint text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 SELECT 'stage',t.id,md5(to_jsonb(t)::text) FROM public.ay2_staged_charges t WHERE t.site_id=s AND t.confirmed_charge IS NULL AND t.ignored_reason IS NULL
 UNION ALL
 SELECT 'payment',t.id,md5(to_jsonb(t)::text||coalesce((SELECT jsonb_agg(a ORDER BY a.id)::text FROM public.ay2_allocations a WHERE a.entry_id=t.id),'[]')||coalesce((SELECT jsonb_agg(c ORDER BY c.id)::text FROM public.ay3_credits c WHERE c.entry_id=t.id),'[]')||coalesce((SELECT jsonb_agg(r ORDER BY r.id)::text FROM public.ay2_entries r WHERE r.reversal_of=t.id),'[]'))
 FROM public.ay2_entries t WHERE t.site_id=s AND t.cents>0 AND t.reversal_of IS NULL;
$function$
;
ALTER POLICY ay2_entries_read ON public.ay2_entries USING (ay2_private.can(site_id, 'finance'::text));
ALTER POLICY ay2_audit_read ON public.ay2_audit USING (ay2_private.can(site_id, 'admin'::text));
ALTER POLICY review_read ON public.ay3_review_receipts USING (ay2_private.can(site_id, 'finance'::text));
