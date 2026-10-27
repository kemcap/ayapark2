-- Ayapark 2 | Correct account-linked archiving and explicit site access revocation.
-- Additive: installing this RPC changes no person, assignment, authorization or financial row.
-- Existing ay3_manage_person remains for previously cached clients.
-- New v2 requires an explicit separate boolean for site-access revocation on linked deletion.
CREATE OR REPLACE FUNCTION public.ay3_manage_person_v2(
  p_site uuid, p_person uuid, p_mode text,
  p_note text, p_confirm boolean, p_revoke_access boolean
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $body$
DECLARE
  target public.ay3_persons%ROWTYPE;
  detail text := btrim(coalesce(p_note,''));
  has_exceptions boolean := false;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT ay2_private.can(p_site,'admin') THEN
    RAISE EXCEPTION 'Nur Superadmins duerfen Personen archivieren oder loeschen.' USING ERRCODE='42501';
  END IF;
  IF p_confirm IS DISTINCT FROM true OR p_person IS NULL OR p_mode IS NULL OR p_mode NOT IN ('archive','restore','delete') THEN
    RAISE EXCEPTION 'Bestaetigung und gueltige Aktion erforderlich.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_site::text,0));
  SELECT * INTO target FROM public.ay3_persons
   WHERE site_id=p_site AND id=p_person FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Person nicht gefunden.'; END IF;
  IF p_mode='restore' AND p_revoke_access IS TRUE THEN
    RAISE EXCEPTION 'Wiederherstellung kann keine Zugangsrechte entziehen.';
  END IF;
  -- Explicit site-access revocation for both archive and delete; auth.users remains intact.
  -- Staff access requires the separate management-membership workflow.
  IF target.auth_user_id IS NOT NULL AND p_revoke_access IS TRUE THEN
    IF target.auth_user_id = (SELECT auth.uid()) THEN
      RAISE EXCEPTION 'Eigenes Anmeldekonto kann hier nicht entzogen werden.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.site_staff_memberships
      WHERE site_id=p_site AND user_id=target.auth_user_id) THEN
      RAISE EXCEPTION 'Yönetim hesabı bağlı: Önce Ayarlar bölümünden yönetim üyeliğini kaldırın.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.ay3_persons
      WHERE site_id=p_site AND id<>p_person AND auth_user_id=target.auth_user_id) THEN
      RAISE EXCEPTION 'Paylaşılan hesap: Aynı hesaba bağlı diğer kişilerin erişimi korunmalıdır.';
    END IF;
    DELETE FROM public.site_resident_units ru USING public.site_units su
     WHERE ru.unit_id=su.id AND su.site_id=p_site AND ru.user_id=target.auth_user_id;
  END IF;


  -- Linked accounts require explicit site-access revocation for permanent deletion.
  IF p_mode='delete' AND target.auth_user_id IS NOT NULL AND p_revoke_access IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Giriş hesabı bağlı: Site erişimini kaldırmayı ayrıca onaylayın.';
  END IF;

  IF p_mode='archive' THEN
    IF target.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Person ist bereits archiviert.'; END IF;
    IF char_length(detail) < 3 OR char_length(detail) > 500 THEN
      RAISE EXCEPTION 'Archivierungshinweis: 3 bis 500 Zeichen erforderlich.';
    END IF;
    UPDATE public.ay3_links SET active=false, archived_at=now(),
      archive_reason='person_archived', archive_note=detail,
      updated_at=now(),revision=revision+1
    WHERE site_id=p_site AND person_id=p_person AND active;
    UPDATE public.ay3_persons SET archived_at=now(),archive_note=detail
    WHERE site_id=p_site AND id=p_person;
    INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details)
    VALUES(p_site,auth.uid(),'person_archive',p_person,jsonb_build_object('note',detail));
    RETURN jsonb_build_object('ok',true,'mode','archive');
  ELSIF p_mode='restore' THEN
    IF target.archived_at IS NULL THEN RAISE EXCEPTION 'Person ist nicht archiviert.'; END IF;
    UPDATE public.ay3_persons SET archived_at=NULL,archive_note=NULL
    WHERE site_id=p_site AND id=p_person;
    INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details)
    VALUES(p_site,auth.uid(),'person_restore',p_person,'{}'::jsonb);
    -- Past apartment assignments intentionally stay historical.
    RETURN jsonb_build_object('ok',true,'mode','restore');
  END IF;

  -- Hard deletion is permitted only if no accounting row or source identity depends on the person.
  IF EXISTS(SELECT 1 FROM public.ay2_charges c
     WHERE c.site_id=p_site AND
       (c.person_id=p_person OR EXISTS (
          SELECT 1 FROM public.ay3_links l
          WHERE l.id=c.link_id AND l.site_id=p_site AND l.person_id=p_person
       )))
     OR EXISTS(SELECT 1 FROM public.ay3_credits c WHERE c.site_id=p_site AND c.person_id=p_person)
  THEN
    RAISE EXCEPTION 'Finanzvorgaenge vorhanden: Person nur archivieren; Buchungen bleiben unveraendert.';
  END IF;
  IF to_regclass('public.ay5_monthly_exceptions') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.ay5_monthly_exceptions WHERE site_id=$1 AND person_id=$2)'
    INTO has_exceptions USING p_site,p_person;
  END IF;
  IF has_exceptions THEN
    RAISE EXCEPTION 'Monatliche Finanz-Ausnahmen vorhanden: Person nur archivieren.';
  END IF;

  DELETE FROM public.ay3_invite_tokens WHERE site_id=p_site AND person_id=p_person;
  DELETE FROM public.ay_access_requests WHERE site_id=p_site AND person_id=p_person;
  DELETE FROM ay_auth_private.phone_contacts WHERE site_id=p_site AND person_id=p_person;
  DELETE FROM public.ay3_match_rules WHERE site_id=p_site AND person_id=p_person;
  DELETE FROM public.ay3_links WHERE site_id=p_site AND person_id=p_person;
  DELETE FROM public.ay2_audit WHERE site_id=p_site AND entity_id=p_person
    AND action IN ('person','person_archive','person_restore');
  DELETE FROM public.ay3_persons WHERE site_id=p_site AND id=p_person;
  -- Audit only the operation, without retaining the deleted person's name or ID.
  INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details)
  VALUES(p_site,auth.uid(),'person_purge',NULL,'{"personal_details_retained":false}'::jsonb);
  RETURN jsonb_build_object('ok',true,'mode','delete');
END
$body$;


REVOKE ALL ON FUNCTION public.ay3_manage_person_v2(uuid,uuid,text,text,boolean,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ay3_manage_person_v2(uuid,uuid,text,text,boolean,boolean) TO authenticated;
