-- Monthly aidat automation: opt-in, forward-only, fail-closed on uncertain debtor mappings.
-- Changes no existing charges, entries, allocations, or account balances.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ay13_monthly_aidat_settings (
  site_id uuid PRIMARY KEY REFERENCES public.site_sites(id),
  enabled boolean NOT NULL DEFAULT false,
  amount_cents bigint NOT NULL CHECK (amount_cents BETWEEN 1 AND 45000000000),
  due_day integer NOT NULL DEFAULT 1 CHECK (due_day BETWEEN 1 AND 28),
  debtor_rule text NOT NULL DEFAULT 'occupant' CHECK (debtor_rule IN ('occupant','owner','tenant')),
  basis_ref text NOT NULL CHECK (length(btrim(basis_ref)) BETWEEN 3 AND 200),
  starts_month date NOT NULL,
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ay13_month_start_check CHECK (extract(day from starts_month)=1)
);
ALTER TABLE public.ay13_monthly_aidat_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ay13_monthly_aidat_settings FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS ay2_private.ay13_monthly_runs (
  site_id uuid NOT NULL REFERENCES public.site_sites(id),
  month_on date NOT NULL CHECK (extract(day from month_on)=1),
  created_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  finished_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(site_id,month_on)
);
REVOKE ALL ON ay2_private.ay13_monthly_runs FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ay13_monthly_aidat_settings(p_site uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE cfg public.ay13_monthly_aidat_settings; r ay2_private.ay13_monthly_runs; next_month date;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (
   SELECT 1 FROM public.site_staff_memberships
   WHERE site_id=p_site AND user_id=auth.uid() AND role='manager'
 ) THEN RAISE EXCEPTION 'Nur Superadmin kann monatliche Aidat-Einstellungen verwalten.' USING ERRCODE='42501'; END IF;
 next_month := (date_trunc('month',(now() AT TIME ZONE 'Europe/Istanbul')::date) + interval '1 month')::date;
 SELECT * INTO cfg FROM public.ay13_monthly_aidat_settings WHERE site_id=p_site;
 SELECT * INTO r FROM ay2_private.ay13_monthly_runs WHERE site_id=p_site ORDER BY month_on DESC LIMIT 1;
 RETURN jsonb_build_object(
   'configured',cfg.site_id IS NOT NULL,
   'enabled',coalesce(cfg.enabled,false),
   'amount_cents',cfg.amount_cents,
   'due_day',coalesce(cfg.due_day,1),
   'debtor_rule',coalesce(cfg.debtor_rule,'occupant'),
   'basis_ref',coalesce(cfg.basis_ref,''),
   'starts_month',coalesce(cfg.starts_month,next_month),
   'next_available_month',next_month,
   'last_run', CASE WHEN r.site_id IS NULL THEN NULL ELSE
       jsonb_build_object('month',r.month_on,'created',r.created_count,'skipped',r.skipped_count,'issues',r.issues,'at',r.finished_at) END
 );
END; $$;
REVOKE ALL ON FUNCTION public.ay13_monthly_aidat_settings(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ay13_monthly_aidat_settings(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ay13_save_monthly_aidat_settings(
  p_site uuid,p_enabled boolean,p_amount_cents bigint,p_due_day integer,
  p_debtor_rule text,p_basis_ref text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old public.ay13_monthly_aidat_settings; earliest date; actual_start date;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (
   SELECT 1 FROM public.site_staff_memberships
   WHERE site_id=p_site AND user_id=auth.uid() AND role='manager'
 ) THEN RAISE EXCEPTION 'Nur Superadmin kann monatliche Aidat-Einstellungen verwalten.' USING ERRCODE='42501'; END IF;
 IF p_amount_cents NOT BETWEEN 1 AND 45000000000
    OR p_due_day NOT BETWEEN 1 AND 28
    OR coalesce(p_debtor_rule,'') NOT IN ('occupant','owner','tenant')
    OR length(btrim(coalesce(p_basis_ref,''))) NOT BETWEEN 3 AND 200
    OR p_enabled IS NULL
 THEN RAISE EXCEPTION 'Betrag, Fälligkeit, Schuldnerregel und Beschlussreferenz prüfen.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('ay13-config:'||p_site::text,0));
 earliest := (date_trunc('month',(now() AT TIME ZONE 'Europe/Istanbul')::date) + interval '1 month')::date;
 SELECT * INTO old FROM public.ay13_monthly_aidat_settings WHERE site_id=p_site FOR UPDATE;
 actual_start := CASE WHEN old.site_id IS NOT NULL AND old.enabled AND p_enabled
     THEN greatest(old.starts_month,earliest)
     ELSE earliest END;
 INSERT INTO public.ay13_monthly_aidat_settings(
   site_id,enabled,amount_cents,due_day,debtor_rule,basis_ref,starts_month,updated_by,updated_at
 ) VALUES(p_site,p_enabled,p_amount_cents,p_due_day,p_debtor_rule,btrim(p_basis_ref),actual_start,auth.uid(),now())
 ON CONFLICT(site_id) DO UPDATE SET
   enabled=excluded.enabled,amount_cents=excluded.amount_cents,due_day=excluded.due_day,
   debtor_rule=excluded.debtor_rule,basis_ref=excluded.basis_ref,starts_month=excluded.starts_month,
   updated_by=excluded.updated_by,updated_at=excluded.updated_at;
 INSERT INTO public.ay2_audit(site_id,actor,action,details)
 VALUES(p_site,auth.uid(),'monthly_aidat_settings',
        jsonb_build_object('before',CASE WHEN old.site_id IS NOT NULL THEN
            jsonb_build_object('enabled',old.enabled,'amount_cents',old.amount_cents,'due_day',old.due_day,'debtor_rule',old.debtor_rule,'starts_month',old.starts_month) ELSE null END,
            'after',jsonb_build_object('enabled',p_enabled,'amount_cents',p_amount_cents,'due_day',p_due_day,'debtor_rule',p_debtor_rule,'starts_month',actual_start)));
 RETURN public.ay13_monthly_aidat_settings(p_site);
END; $$;
REVOKE ALL ON FUNCTION public.ay13_save_monthly_aidat_settings(uuid,boolean,bigint,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ay13_save_monthly_aidat_settings(uuid,boolean,bigint,integer,text,text) TO authenticated;

-- Cron-only entrypoint. Not callable by anon/authenticated/service_role or browser clients.
CREATE OR REPLACE FUNCTION ay2_private.ay13_run_monthly_aidat()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  cfg public.ay13_monthly_aidat_settings;
  u public.site_units;
  debtor public.ay3_links;
  ex public.ay5_monthly_exceptions;
  month_on date;
  due_on date;
  last_day date;
  target_role text;
  candidates integer;
  made integer:=0;
  skipped integer;
  issues jsonb;
  ref text;
BEGIN
  month_on := date_trunc('month',now() AT TIME ZONE 'Europe/Istanbul')::date;
  last_day := (month_on + interval '1 month - 1 day')::date;
  FOR cfg IN SELECT * FROM public.ay13_monthly_aidat_settings
             WHERE enabled AND starts_month<=month_on
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('ay13-run:'||cfg.site_id::text||':'||month_on::text,0));
    IF EXISTS (SELECT 1 FROM ay2_private.ay13_monthly_runs WHERE site_id=cfg.site_id AND month_on=month_on)
    THEN CONTINUE; END IF;
    -- If a configured administrator has lost the role, do not silently keep issuing charges.
    IF NOT EXISTS(SELECT 1 FROM public.site_staff_memberships
       WHERE site_id=cfg.site_id AND user_id=cfg.updated_by AND role='manager')
    THEN CONTINUE; END IF;
    due_on:=make_date(extract(year from month_on)::int,extract(month from month_on)::int,cfg.due_day);
    ref:='monthly:'||month_on::text;
    made:=0;skipped:=0;issues:='[]'::jsonb;
    FOR u IN SELECT * FROM public.site_units WHERE site_id=cfg.site_id ORDER BY code
    LOOP
      -- Same reference as the existing manual 'Aidat oluştur' workflow.
      IF EXISTS(SELECT 1 FROM public.ay2_charges c
          WHERE c.site_id=cfg.site_id AND c.unit_id=u.id AND c.reference=ref)
      OR EXISTS(SELECT 1 FROM public.ay2_charges c
          WHERE c.site_id=cfg.site_id AND c.unit_id=u.id AND c.category='Aidat'
          AND c.void_reason IS NULL AND
          ((c.due_on BETWEEN month_on AND last_day AND c.debt_group IN ('general','legacy'))
            OR (c.period_from<=last_day AND c.period_to>=month_on AND c.debt_group IN ('general','legacy'))))
      THEN skipped:=skipped+1;issues:=issues||jsonb_build_array(jsonb_build_object('unit',u.code,'reason','already_exists'));CONTINUE;END IF;
      target_role:=cfg.debtor_rule;
      IF target_role='occupant' THEN
        IF EXISTS(SELECT 1 FROM public.ay3_links l JOIN public.ay3_persons p ON p.id=l.person_id
          WHERE l.site_id=cfg.site_id AND l.unit_id=u.id AND l.role='tenant' AND l.active
          AND l.archived_at IS NULL AND p.archived_at IS NULL
          AND (l.starts_on IS NULL OR l.starts_on<=due_on)
          AND (l.ends_on IS NULL OR l.ends_on>=due_on))
        THEN target_role:='tenant'; ELSE target_role:='owner'; END IF;
      END IF;
      SELECT count(*) INTO candidates FROM public.ay3_links l JOIN public.ay3_persons p ON p.id=l.person_id
      WHERE l.site_id=cfg.site_id AND l.unit_id=u.id AND l.role=target_role AND l.active
        AND l.archived_at IS NULL AND p.archived_at IS NULL
        AND (l.starts_on IS NULL OR l.starts_on<=due_on)
        AND (l.ends_on IS NULL OR l.ends_on>=due_on);
      IF candidates<>1 THEN
        skipped:=skipped+1;
        issues:=issues||jsonb_build_array(jsonb_build_object('unit',u.code,'reason','ambiguous_debtor','candidates',candidates));
        CONTINUE;
      END IF;
      SELECT l.* INTO debtor FROM public.ay3_links l JOIN public.ay3_persons p ON p.id=l.person_id
      WHERE l.site_id=cfg.site_id AND l.unit_id=u.id AND l.role=target_role AND l.active
        AND l.archived_at IS NULL AND p.archived_at IS NULL
        AND (l.starts_on IS NULL OR l.starts_on<=due_on)
        AND (l.ends_on IS NULL OR l.ends_on>=due_on)
      ORDER BY l.id LIMIT 1;
      SELECT * INTO ex FROM public.ay5_monthly_exceptions
      WHERE site_id=cfg.site_id AND unit_id=u.id
        AND (person_id IS NULL OR person_id=debtor.person_id)
        AND kind='exemption' AND disabled_at IS NULL
        AND valid_from<=due_on AND (valid_to IS NULL OR valid_to>=due_on)
      ORDER BY created_at LIMIT 1;
      IF FOUND THEN
        skipped:=skipped+1;
        issues:=issues||jsonb_build_array(jsonb_build_object('unit',u.code,'reason',CASE WHEN ex.reference_cents=cfg.amount_cents THEN 'exempt' ELSE 'exemption_mismatch' END));
        CONTINUE;
      END IF;
      INSERT INTO public.ay2_charges(
        site_id,unit_id,category,label,due_on,cents,payer,reference,created_by,
        person_id,link_id,period_from,period_to,debt_group,distribution_basis
      ) VALUES(
        cfg.site_id,u.id,'Aidat',to_char(month_on,'YYYY-MM')||' Aidat',
        due_on,cfg.amount_cents,debtor.role,ref,cfg.updated_by,
        debtor.person_id,debtor.id,month_on,last_day,'general',
        jsonb_build_object('distribution','per_unit','basis_ref',cfg.basis_ref,'automated',true)
      ) ON CONFLICT(site_id,unit_id,reference) DO NOTHING;
      IF FOUND THEN made:=made+1;ELSE
        skipped:=skipped+1;
        issues:=issues||jsonb_build_array(jsonb_build_object('unit',u.code,'reason','already_exists'));
      END IF;
    END LOOP;
    INSERT INTO ay2_private.ay13_monthly_runs(site_id,month_on,created_count,skipped_count,issues)
    VALUES(cfg.site_id,month_on,made,skipped,issues);
  END LOOP;
  RETURN made;
END; $$;
REVOKE ALL ON FUNCTION ay2_private.ay13_run_monthly_aidat() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION ay2_private.ay13_run_monthly_aidat() TO postgres;

-- Scheduled daily at 03:10 UTC / 06:10 Türkiye. Idempotent each month.
-- pg_cron is available on hosted Supabase; this has no effect while settings are disabled.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
SELECT cron.schedule('ayapark2-monthly-aidat', '10 3 * * *',
 'SELECT ay2_private.ay13_run_monthly_aidat()');
COMMIT;
