-- Manual correction for an explicitly conflicting historical ownership end.
-- Permission-gated, revision-checked, and independent of charge/payment data.
CREATE OR REPLACE FUNCTION public.ay3_correct_owner_history_end(
 p_site uuid,p_link uuid,p_ends_on date,p_expected_revision bigint
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE l public.ay3_links; v_next date;
BEGIN
 IF NOT ay2_private.can(p_site,'people') THEN RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING errcode='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_site::text,0));
 SELECT * INTO l FROM public.ay3_links
 WHERE id=p_link AND site_id=p_site AND role='owner' AND active=false
   AND archive_reason IN('historical_import','role_changed','ended','other')
 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Korrigierbarer früherer Eigentümer nicht gefunden.' USING errcode='P0001';END IF;
 IF l.revision IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'Der Eintrag wurde zwischenzeitlich geändert. Bitte Ansicht neu laden.' USING errcode='P0001';END IF;
 IF p_ends_on IS NOT NULL AND (l.starts_on IS NULL OR p_ends_on<l.starts_on) THEN
  RAISE EXCEPTION 'Das Enddatum darf nicht vor dem Beginn liegen.' USING errcode='P0001';
 END IF;
 SELECT min(n.starts_on) INTO v_next FROM public.ay3_links n
 WHERE n.site_id=p_site AND n.unit_id=l.unit_id AND n.role='owner'
   AND n.person_id<>l.person_id AND n.starts_on>l.starts_on
   AND n.archive_reason IS DISTINCT FROM 'duplicate_history';
 IF p_ends_on IS NOT NULL AND v_next IS NOT NULL AND p_ends_on>=v_next THEN
  RAISE EXCEPTION 'Das Enddatum muss vor dem Beginn des nächsten Eigentümers liegen.' USING errcode='P0001';
 END IF;
 UPDATE public.ay3_links SET ends_on=p_ends_on,ends_on_auto=false,updated_at=now(),revision=revision+1
 WHERE id=l.id AND site_id=p_site;
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES
 (p_site,auth.uid(),'owner_history_end_corrected',l.id,jsonb_build_object(
   'unit_id',l.unit_id,'person_id',l.person_id,'old_end',l.ends_on,'new_end',p_ends_on,
   'expected_revision',p_expected_revision));
 RETURN jsonb_build_object('ok',true,'id',l.id,'ends_on',p_ends_on);
END
$function$;
REVOKE ALL ON FUNCTION public.ay3_correct_owner_history_end(uuid,uuid,date,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ay3_correct_owner_history_end(uuid,uuid,date,bigint) TO authenticated;
