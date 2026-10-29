-- Prepared only. Existing legacy grants and financial records are not converted.
BEGIN;
CREATE TABLE public.ay3_task_grants (
 site_id uuid NOT NULL REFERENCES public.site_sites(id),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 tasks text[] NOT NULL DEFAULT '{}',
 PRIMARY KEY(site_id,user_id),
 CHECK(tasks <@ ARRAY['people_manage','occupancy_invite','charges_prepare','bank_reconcile','announcements_publish']::text[])
);
ALTER TABLE public.ay3_task_grants ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION ay2_private.can_task(s uuid,task text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT task=ANY(ARRAY['people_manage','occupancy_invite','charges_prepare','bank_reconcile','announcements_publish']) AND auth.uid() IS NOT NULL AND EXISTS(
 SELECT 1 FROM public.site_staff_memberships m WHERE m.site_id=s AND m.user_id=auth.uid()
 AND (m.role='manager' OR m.role IN ('deputy','auditor') AND EXISTS(
 SELECT 1 FROM public.ay3_task_grants g WHERE g.site_id=s AND g.user_id=m.user_id AND task=ANY(g.tasks))));
$$;
CREATE POLICY task_grants_read ON public.ay3_task_grants FOR SELECT TO authenticated
 USING(ay2_private.can(site_id,'admin') OR user_id=auth.uid());
CREATE FUNCTION public.ay3_set_task_grants(p_site uuid,p_user uuid,p_tasks text[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT ay2_private.can(p_site,'admin') THEN RAISE EXCEPTION 'Access denied' USING errcode='42501';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.site_staff_memberships WHERE site_id=p_site AND user_id=p_user AND role IN ('deputy','auditor')) THEN RAISE EXCEPTION 'Management member required';END IF;
 IF p_tasks IS NULL OR EXISTS(SELECT 1 FROM unnest(p_tasks)t WHERE t IS NULL) THEN RAISE EXCEPTION 'Invalid tasks';END IF;
 INSERT INTO public.ay3_task_grants VALUES(p_site,p_user,p_tasks) ON CONFLICT(site_id,user_id) DO UPDATE SET tasks=excluded.tasks;
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(p_site,auth.uid(),'task_grants',p_user,jsonb_build_object('tasks',p_tasks));
END;$$;
CREATE TABLE public.ay3_charge_drafts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),site_id uuid NOT NULL REFERENCES public.site_sites(id),
 submitted_by uuid NOT NULL REFERENCES auth.users(id),request_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('batch_charge','monthly_v5')),payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 result jsonb,decided_by uuid REFERENCES auth.users(id),created_at timestamptz NOT NULL DEFAULT now(),decided_at timestamptz,
 UNIQUE(site_id,request_id)
);
ALTER TABLE public.ay3_charge_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY charge_drafts_read ON public.ay3_charge_drafts FOR SELECT TO authenticated
 USING(ay2_private.can(site_id,'admin') OR submitted_by=auth.uid() AND ay2_private.can_task(site_id,'charges_prepare'));
CREATE FUNCTION public.ay3_submit_charge_draft(p_site uuid,p_request uuid,p_action text,p_payload jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE existing public.ay3_charge_drafts;ident uuid;
BEGIN
 IF NOT ay2_private.can_task(p_site,'charges_prepare') THEN RAISE EXCEPTION 'Access denied' USING errcode='42501';END IF;
 IF p_request IS NULL OR p_action IS NULL OR p_action NOT IN ('batch_charge','monthly_v5') OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid draft';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_site::text,0));
 SELECT * INTO existing FROM public.ay3_charge_drafts WHERE site_id=p_site AND request_id=p_request;
 IF FOUND THEN
 IF existing.submitted_by<>auth.uid() OR existing.action<>p_action OR existing.payload IS DISTINCT FROM p_payload THEN RAISE EXCEPTION 'Request conflict';END IF;
 RETURN existing.id;END IF;
 INSERT INTO public.ay3_charge_drafts(site_id,submitted_by,request_id,action,payload) VALUES(p_site,auth.uid(),p_request,p_action,p_payload) RETURNING id INTO ident;
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(p_site,auth.uid(),'charge_draft_submitted',ident,'{}');
 RETURN ident;
END;$$;
CREATE FUNCTION public.ay3_decide_charge_draft(p_site uuid,p_id uuid,p_approve boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE draft public.ay3_charge_drafts;res jsonb;
BEGIN
 IF NOT ay2_private.can(p_site,'admin') THEN RAISE EXCEPTION 'Access denied' USING errcode='42501';END IF;
 IF p_approve IS NULL THEN RAISE EXCEPTION 'Decision required';END IF;
 -- Match the existing financial command lock order, then lock this draft.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_site::text,0));
 SELECT * INTO draft FROM public.ay3_charge_drafts WHERE site_id=p_site AND id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Draft unavailable';END IF;
 IF draft.status<>'pending' THEN
 IF (draft.status='approved') IS DISTINCT FROM p_approve THEN RAISE EXCEPTION 'Decision conflict';END IF;
 RETURN draft.result;END IF;
 IF p_approve THEN
 res:=ay2_private.ay5_command(p_site,draft.action,draft.payload||jsonb_build_object('request_id',draft.id,'confirmed',true));
 ELSE res:=jsonb_build_object('rejected',true);END IF;
 UPDATE public.ay3_charge_drafts SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,result=res,decided_by=auth.uid(),decided_at=now() WHERE id=draft.id;
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(p_site,auth.uid(),'charge_draft_decided',draft.id,jsonb_build_object('approved',p_approve));
 RETURN res;
END;$$;
REVOKE ALL ON public.ay3_task_grants,public.ay3_charge_drafts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.ay3_task_grants,public.ay3_charge_drafts TO authenticated;
REVOKE ALL ON FUNCTION ay2_private.can_task(uuid,text),public.ay3_set_task_grants(uuid,uuid,text[]),public.ay3_submit_charge_draft(uuid,uuid,text,jsonb),public.ay3_decide_charge_draft(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION ay2_private.can_task(uuid,text),public.ay3_set_task_grants(uuid,uuid,text[]),public.ay3_submit_charge_draft(uuid,uuid,text,jsonb),public.ay3_decide_charge_draft(uuid,uuid,boolean) TO authenticated;
COMMIT;
