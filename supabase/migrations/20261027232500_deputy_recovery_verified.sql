-- AYAPARK 2: Explicitly verified deputy/auditor password recovery.
-- No personal account, password, permission, residence or financial row is modified on installation.
-- The original resident-only recovery RPC remains unchanged for already deployed clients.
-- Both new functions are service_role-only and require independent manager/identity checks.

CREATE OR REPLACE FUNCTION public.ay_auth_recovery_authorize_v2(
  p_actor uuid, p_person uuid, p_reason text,
  p_confirmed boolean, p_staff_confirmed boolean
) RETURNS uuid
LANGUAGE plpgsql SET search_path TO ''
AS $function$
DECLARE
  target public.ay3_persons%ROWTYPE;
  is_staff boolean;
BEGIN
  SELECT * INTO target FROM public.ay3_persons
    WHERE id=p_person FOR UPDATE;
  IF NOT FOUND OR target.auth_user_id IS NULL
    OR p_confirmed IS DISTINCT FROM true
    OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 10 AND 300
    OR NOT EXISTS (
      SELECT 1 FROM public.site_staff_memberships s
      WHERE s.site_id=target.site_id AND s.user_id=p_actor AND s.role='manager'
    )
  THEN
    RAISE EXCEPTION 'recovery_unavailable';
  END IF;

  IF target.auth_user_id=p_actor THEN
    RAISE EXCEPTION 'self_recovery_forbidden';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.site_staff_memberships s
    WHERE s.user_id=target.auth_user_id AND s.role='manager'
  ) THEN
    RAISE EXCEPTION 'manager_recovery_requires_operator';
  END IF;

  is_staff:=EXISTS(
    SELECT 1 FROM public.site_staff_memberships s
    WHERE s.user_id=target.auth_user_id
  );
  IF is_staff THEN
    -- Do not authorize recovery of a staff account from an unrelated site.
    IF NOT EXISTS (
      SELECT 1 FROM public.site_staff_memberships s
      WHERE s.site_id=target.site_id AND s.user_id=target.auth_user_id
        AND s.role IN ('deputy','auditor')
    ) THEN
      RAISE EXCEPTION 'recovery_unavailable';
    END IF;
    IF p_staff_confirmed IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'staff_verification_required';
    END IF;
  END IF;

  INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details)
  VALUES(target.site_id,p_actor,'recovery_authorized',p_person,
    jsonb_build_object('reason',btrim(p_reason),'staff_verification',is_staff));
  RETURN target.auth_user_id;
END
$function$;

CREATE OR REPLACE FUNCTION public.ay_auth_recovery_issued_v2(
  p_actor uuid,p_person uuid,p_user uuid,p_staff_confirmed boolean
) RETURNS void
LANGUAGE plpgsql SET search_path TO ''
AS $function$
DECLARE
  target public.ay3_persons%ROWTYPE;
  is_staff boolean;
BEGIN
  SELECT * INTO target FROM public.ay3_persons
    WHERE id=p_person AND auth_user_id=p_user FOR UPDATE;
  IF NOT FOUND OR p_user=p_actor
    OR NOT EXISTS (
      SELECT 1 FROM public.site_staff_memberships s
      WHERE s.site_id=target.site_id AND s.user_id=p_actor AND s.role='manager'
    ) THEN
    RAISE EXCEPTION 'recovery_unavailable';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.site_staff_memberships s
    WHERE s.user_id=p_user AND s.role='manager'
  ) THEN
    RAISE EXCEPTION 'manager_recovery_requires_operator';
  END IF;
  is_staff:=EXISTS(
    SELECT 1 FROM public.site_staff_memberships s WHERE s.user_id=p_user
  );
  IF is_staff THEN
    IF p_staff_confirmed IS DISTINCT FROM true
      OR NOT EXISTS (
        SELECT 1 FROM public.site_staff_memberships s
        WHERE s.site_id=target.site_id AND s.user_id=p_user
          AND s.role IN ('deputy','auditor')
      ) THEN
      RAISE EXCEPTION 'recovery_unavailable';
    END IF;
  END IF;
  INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details)
  VALUES(target.site_id,p_actor,'recovery_link_issued',p_person,
    jsonb_build_object('staff_verification',is_staff));
END
$function$;

REVOKE ALL ON FUNCTION public.ay_auth_recovery_authorize_v2(uuid,uuid,text,boolean,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.ay_auth_recovery_issued_v2(uuid,uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ay_auth_recovery_authorize_v2(uuid,uuid,text,boolean,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.ay_auth_recovery_issued_v2(uuid,uuid,uuid,boolean) TO service_role;
