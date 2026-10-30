BEGIN;
CREATE TABLE public.ay3_contact_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),site_id uuid NOT NULL REFERENCES public.site_sites(id),
 person_id uuid NOT NULL,requested_by uuid NOT NULL REFERENCES auth.users(id),request_id uuid NOT NULL,
 previous_email text NOT NULL,previous_phone text NOT NULL,new_email text NOT NULL,new_phone text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','withdrawn')),
 created_at timestamptz NOT NULL DEFAULT now(),decided_at timestamptz,decided_by uuid REFERENCES auth.users(id),decision_reason text,
 FOREIGN KEY(person_id,site_id) REFERENCES public.ay3_persons(id,site_id),
 UNIQUE(site_id,requested_by,request_id),CHECK(length(new_email)<=254 AND length(new_phone)<=32)
);
CREATE UNIQUE INDEX ay3_contact_pending ON public.ay3_contact_requests(site_id,person_id) WHERE status='pending';
ALTER TABLE public.ay3_contact_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY contact_requests_read ON public.ay3_contact_requests FOR SELECT TO authenticated
 USING(ay2_private.can(site_id,'admin') OR requested_by=auth.uid() AND public.site_can_view_site(site_id));
REVOKE ALL ON public.ay3_contact_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.ay3_contact_requests TO authenticated;
CREATE FUNCTION public.ay3_request_contact_change(p_site uuid,p_person uuid,p_request uuid,p_email text,p_phone text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE person public.ay3_persons;existing public.ay3_contact_requests;ident uuid;
 email_value text:=lower(btrim(coalesce(p_email,'')));phone_value text:=btrim(coalesce(p_phone,''));
BEGIN
 IF auth.uid() IS NULL OR NOT public.site_can_view_site(p_site) THEN RAISE EXCEPTION 'Access denied' USING errcode='42501';END IF;
 IF p_request IS NULL OR length(email_value)>254 OR (email_value<>'' AND email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') OR length(phone_value)>32 OR (phone_value<>'' AND (phone_value !~ '^\+?[0-9 ()-]{6,32}$' OR length(regexp_replace(phone_value,'[^0-9]','','g')) NOT BETWEEN 6 AND 15)) THEN RAISE EXCEPTION 'Invalid contact data';END IF;
 SELECT * INTO person FROM public.ay3_persons WHERE site_id=p_site AND id=p_person AND auth_user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING errcode='42501';END IF;
 SELECT * INTO existing FROM public.ay3_contact_requests WHERE site_id=p_site AND requested_by=auth.uid() AND request_id=p_request;
 IF FOUND THEN
 IF existing.person_id<>p_person OR existing.new_email<>email_value OR existing.new_phone<>phone_value THEN RAISE EXCEPTION 'Request conflict';END IF;
 RETURN existing.id;END IF;
 IF coalesce(person.email,'')=email_value AND coalesce(person.phone,'')=phone_value THEN RAISE EXCEPTION 'No contact change';END IF;
 IF EXISTS(SELECT 1 FROM public.ay3_contact_requests WHERE site_id=p_site AND person_id=p_person AND status='pending') THEN RAISE EXCEPTION 'A contact change is already pending';END IF;
 INSERT INTO public.ay3_contact_requests(site_id,person_id,requested_by,request_id,previous_email,previous_phone,new_email,new_phone)
 VALUES(p_site,p_person,auth.uid(),p_request,coalesce(person.email,''),coalesce(person.phone,''),email_value,phone_value) RETURNING id INTO ident;
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(p_site,auth.uid(),'contact_change_requested',ident,jsonb_build_object('person_id',p_person));
 RETURN ident;
END;$$;
CREATE FUNCTION public.ay3_decide_contact_change(p_site uuid,p_id uuid,p_approve boolean,p_verified boolean,p_reason text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.ay3_contact_requests;person public.ay3_persons;
BEGIN
 IF NOT ay2_private.can(p_site,'admin') THEN RAISE EXCEPTION 'Access denied' USING errcode='42501';END IF;
 IF p_approve IS NULL OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 10 AND 300 OR (p_approve AND p_verified IS DISTINCT FROM true) THEN RAISE EXCEPTION 'Verification and reason required';END IF;
 -- Match submission's person -> request lock order.
 SELECT * INTO r FROM public.ay3_contact_requests WHERE site_id=p_site AND id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request unavailable';END IF;
 SELECT * INTO person FROM public.ay3_persons WHERE site_id=p_site AND id=r.person_id FOR UPDATE;
 SELECT * INTO r FROM public.ay3_contact_requests WHERE id=p_id AND site_id=p_site FOR UPDATE;
 IF r.status<>'pending' THEN
 IF (r.status='approved' AND p_approve) OR (r.status='rejected' AND NOT p_approve) THEN RETURN jsonb_build_object('status',r.status,'already_decided',true);END IF;
 RAISE EXCEPTION 'Decision conflict';END IF;
 IF p_approve THEN
 IF person.id IS NULL OR person.auth_user_id IS DISTINCT FROM r.requested_by OR coalesce(person.email,'')<>r.previous_email OR coalesce(person.phone,'')<>r.previous_phone THEN RAISE EXCEPTION 'Contact changed: submit a new request';END IF;
 UPDATE public.ay3_persons SET email=r.new_email,phone=r.new_phone WHERE site_id=p_site AND id=r.person_id;
 END IF;
 UPDATE public.ay3_contact_requests SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,decided_at=now(),decided_by=auth.uid(),decision_reason=btrim(p_reason) WHERE id=p_id;
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(p_site,auth.uid(),'contact_change_decided',p_id,jsonb_build_object('person_id',r.person_id,'approved',p_approve,'reason',btrim(p_reason),'login_unchanged',true));
 RETURN jsonb_build_object('status',CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END);
END;$$;
CREATE FUNCTION public.ay3_withdraw_contact_change(p_site uuid,p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ident uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.site_can_view_site(p_site) THEN RAISE EXCEPTION 'Access denied' USING errcode='42501';END IF;
 UPDATE public.ay3_contact_requests SET status='withdrawn',decided_at=now(),decided_by=auth.uid() WHERE id=p_id AND site_id=p_site AND requested_by=auth.uid() AND status='pending' RETURNING id INTO ident;
 IF ident IS NULL THEN RAISE EXCEPTION 'Request unavailable';END IF;
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(p_site,auth.uid(),'contact_change_withdrawn',ident,'{}');
END;$$;
CREATE FUNCTION public.ay3_contact_workspace(p_site uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.site_can_view_site(p_site) THEN RETURN jsonb_build_object('persons','[]'::jsonb,'requests','[]'::jsonb);END IF;
 RETURN jsonb_build_object('persons',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'full_name',full_name,'email',email,'phone',phone)) FROM public.ay3_persons WHERE site_id=p_site AND auth_user_id=auth.uid()),'[]'::jsonb),
 'requests',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT r.*,p.full_name FROM public.ay3_contact_requests r JOIN public.ay3_persons p ON p.id=r.person_id AND p.site_id=r.site_id WHERE r.site_id=p_site AND (r.requested_by=auth.uid() OR ay2_private.can(p_site,'admin')) ORDER BY (r.status='pending') DESC,r.created_at DESC LIMIT 100)x),'[]'::jsonb));
END;$$;
CREATE FUNCTION ay2_private.guard_linked_contact_change() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF OLD.auth_user_id IS NOT NULL AND auth.uid() IS NOT NULL AND NOT ay2_private.can(OLD.site_id,'admin') THEN RAISE EXCEPTION 'Contact changes require Superadmin approval' USING errcode='42501';END IF;
 RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION ay2_private.guard_linked_contact_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER linked_contact_approval BEFORE UPDATE OF email,phone ON public.ay3_persons FOR EACH ROW
 WHEN (coalesce(OLD.email,'') IS DISTINCT FROM coalesce(NEW.email,'') OR coalesce(OLD.phone,'') IS DISTINCT FROM coalesce(NEW.phone,'')) EXECUTE FUNCTION ay2_private.guard_linked_contact_change();
REVOKE ALL ON FUNCTION public.ay3_request_contact_change(uuid,uuid,uuid,text,text),public.ay3_decide_contact_change(uuid,uuid,boolean,boolean,text),public.ay3_withdraw_contact_change(uuid,uuid),public.ay3_contact_workspace(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ay3_request_contact_change(uuid,uuid,uuid,text,text),public.ay3_decide_contact_change(uuid,uuid,boolean,boolean,text),public.ay3_withdraw_contact_change(uuid,uuid),public.ay3_contact_workspace(uuid) TO authenticated;
COMMIT;
