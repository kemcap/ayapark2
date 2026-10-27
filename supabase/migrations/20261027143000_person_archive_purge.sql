-- Ayapark 2 | Explicit person archiving and guarded permanent deletion.
-- This migration changes no existing person or financial row.
-- Account identities and accounting source records are NEVER deleted by this RPC.
ALTER TABLE public.ay3_persons
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archive_note text;
ALTER TABLE public.ay3_persons
  DROP CONSTRAINT IF EXISTS ay3_persons_archive_note_length;
ALTER TABLE public.ay3_persons
  ADD CONSTRAINT ay3_persons_archive_note_length
  CHECK (archive_note IS NULL OR char_length(archive_note) <= 500);

CREATE OR REPLACE FUNCTION public.ay3_manage_person(
  p_site uuid, p_person uuid, p_mode text,
  p_note text DEFAULT '', p_confirm boolean DEFAULT false
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
  IF p_confirm IS DISTINCT FROM true OR p_person IS NULL OR p_mode NOT IN ('archive','restore','delete') THEN
    RAISE EXCEPTION 'Bestaetigung und gueltige Aktion erforderlich.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_site::text,0));
  SELECT * INTO target FROM public.ay3_persons
   WHERE site_id=p_site AND id=p_person FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Person nicht gefunden.'; END IF;
  -- An attached login would remain capable of signing in. Never silently leave access behind.
  IF target.auth_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Zuerst den verknuepften Anmeldezugang entziehen und die Person entkoppeln.';
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

REVOKE ALL ON FUNCTION public.ay3_manage_person(uuid,uuid,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ay3_manage_person(uuid,uuid,text,text,boolean) TO authenticated;

-- Prevent reactivating archived people via direct assignment RPCs.
CREATE OR REPLACE FUNCTION ay2_private.reject_archived_person_link()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $body$
BEGIN
  IF NEW.active AND EXISTS (
    SELECT 1 FROM public.ay3_persons
    WHERE id=NEW.person_id AND site_id=NEW.site_id AND archived_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Archivierte Person zuerst wiederherstellen.';
  END IF;
  RETURN NEW;
END
$body$;
DROP TRIGGER IF EXISTS ay3_reject_archived_person_link ON public.ay3_links;
CREATE TRIGGER ay3_reject_archived_person_link
 BEFORE INSERT OR UPDATE OF active,person_id ON public.ay3_links
 FOR EACH ROW EXECUTE FUNCTION ay2_private.reject_archived_person_link();
