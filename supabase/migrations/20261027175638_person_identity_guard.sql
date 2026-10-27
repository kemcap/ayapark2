-- Check new records only; existing duplicates and historical rows are never rewritten.
CREATE OR REPLACE FUNCTION ay2_private.person_key(value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT regexp_replace(lower(translate(coalesce(value,''),'ÇĞİIÖŞÜçğıöşü','cgiiosucgiosu')),'[^[:alnum:]]','','g');
$$;
CREATE OR REPLACE FUNCTION ay2_private.person_phone(value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT regexp_replace(regexp_replace(regexp_replace(coalesce(value,''),'[^0-9]','','g'),'^00',''),'^(90|0)(?=5[0-9]{9}$)','');
$$;
CREATE OR REPLACE FUNCTION ay2_private.guard_person_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(new.site_id::text,0));
 IF new.auth_user_id IS NOT NULL AND (TG_OP='INSERT' OR new.auth_user_id IS DISTINCT FROM old.auth_user_id)
 AND EXISTS(SELECT 1 FROM public.ay3_persons p WHERE p.site_id=new.site_id AND p.id<>new.id AND p.auth_user_id=new.auth_user_id)
 THEN RAISE EXCEPTION 'Dieses Konto ist bereits einer anderen Person zugeordnet. / Bu hesap başka bir kişiye bağlı.';END IF;
 IF TG_OP='INSERT' AND EXISTS(SELECT 1 FROM public.ay3_persons p WHERE p.site_id=new.site_id
 AND ay2_private.person_key(p.full_name)=ay2_private.person_key(new.full_name)
 AND ((ay2_private.person_phone(new.phone)<>'' AND ay2_private.person_phone(p.phone)=ay2_private.person_phone(new.phone))
 OR (btrim(coalesce(new.email,''))<>'' AND lower(btrim(p.email))=lower(btrim(new.email)))
 OR (btrim(coalesce(new.email,''))='' AND ay2_private.person_phone(new.phone)='' AND btrim(coalesce(p.email,''))='' AND ay2_private.person_phone(p.phone)='')))
 THEN RAISE EXCEPTION 'Person bereits vorhanden. Bitte vorhandene Person auswählen. / Kişi zaten var. Kayıtlı kişiyi seçin.';END IF;
 RETURN new;
END;$$;
REVOKE ALL ON FUNCTION ay2_private.person_key(text),ay2_private.person_phone(text),ay2_private.guard_person_identity() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION ay2_private.person_key(text),ay2_private.person_phone(text) TO authenticated,service_role;
CREATE TRIGGER ay3_person_identity_guard BEFORE INSERT OR UPDATE OF auth_user_id ON public.ay3_persons
FOR EACH ROW EXECUTE FUNCTION ay2_private.guard_person_identity();
