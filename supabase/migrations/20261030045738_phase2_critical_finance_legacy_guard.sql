BEGIN;
CREATE OR REPLACE FUNCTION ay2_private.require_task_action(s uuid,act text,p jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE need text;l public.ay3_links;
BEGIN
 IF ay2_private.can(s,'admin') OR act='acknowledge' THEN RETURN;END IF;
 IF act IN ('entry','classify_entry','bind_charge','budget','monthly_exception','disable_exception','settings','permissions','publish_report','charge','monthly','batch_charge','monthly_v5','confirm_staged','reverse','unallocate','void_charge','void_credit') THEN RAISE EXCEPTION 'Superadmin required' USING errcode='42501';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.ay3_task_grants WHERE site_id=s AND user_id=auth.uid()) THEN RETURN;END IF;
 need:=CASE WHEN act IN ('person','provider','provider_note') THEN 'people_manage'
 WHEN act IN ('assignment_add','assignment_remove','assignment_restore','link','edit_link','end_link','unlink','relationship_change','switch_tenant','occupancy') THEN 'occupancy_invite'
 WHEN act IN ('allocate','auto_allocate','credit','match_rule') THEN 'bank_reconcile'
 WHEN act='announcement' THEN 'announcements_publish' ELSE NULL END;
 IF act='assignment_edit' THEN
 SELECT * INTO l FROM public.ay3_links WHERE site_id=s AND id=nullif(p->>'id','')::uuid;
 need:=CASE WHEN (p?'role' AND p->>'role' IS DISTINCT FROM l.role) OR (p?'starts_on' AND nullif(p->>'starts_on','')::date IS DISTINCT FROM l.starts_on) OR (p?'ends_on' AND nullif(p->>'ends_on','')::date IS DISTINCT FROM l.ends_on) THEN 'occupancy_invite' ELSE 'people_manage' END;
 END IF;
 IF need IS NULL OR NOT ay2_private.can_task(s,need) THEN RAISE EXCEPTION 'Access denied' USING errcode='42501';END IF;
END;$$;
COMMIT;
