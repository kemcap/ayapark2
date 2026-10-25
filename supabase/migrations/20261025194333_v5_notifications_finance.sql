BEGIN;
SET LOCAL lock_timeout='5s';
-- Additive V5 release. Do not execute on production without review/approval and a verified backup.
ALTER TABLE public.ay2_announcements ADD COLUMN popup_on_login boolean NOT NULL DEFAULT false,
 ADD COLUMN target_kind text NOT NULL DEFAULT 'all' CHECK(target_kind IN ('all','owners','residents','representatives','units','blocks')),
 ADD COLUMN target_units uuid[] NOT NULL DEFAULT '{}', ADD COLUMN target_blocks text[] NOT NULL DEFAULT '{}',
 ADD COLUMN title_de text NOT NULL DEFAULT '' CHECK(length(title_de)<=150), ADD COLUMN body_de text NOT NULL DEFAULT '' CHECK(length(body_de)<=5000);
ALTER TABLE public.ay3_links ADD COLUMN mandates text[] NOT NULL DEFAULT '{}' CHECK(mandates <@ ARRAY['owners','residents']);
CREATE TABLE public.ay5_operations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),site_id uuid NOT NULL REFERENCES public.site_sites(id),request_id uuid NOT NULL,payload jsonb NOT NULL,result jsonb NOT NULL DEFAULT '{}',created_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(site_id,request_id));
ALTER TABLE public.ay2_charges ADD COLUMN operation_id uuid REFERENCES public.ay5_operations(id),ADD COLUMN debt_group text NOT NULL DEFAULT 'legacy' CHECK(length(debt_group) BETWEEN 1 AND 100),ADD COLUMN distribution_basis jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public.ay3_credits ADD COLUMN debt_group text NOT NULL DEFAULT 'legacy' CHECK(length(debt_group) BETWEEN 1 AND 100);
CREATE TABLE public.ay5_monthly_exceptions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),site_id uuid NOT NULL REFERENCES public.site_sites(id),unit_id uuid NOT NULL REFERENCES public.site_units(id),person_id uuid REFERENCES public.ay3_persons(id),kind text NOT NULL CHECK(kind IN ('exemption','remuneration')),reference_cents bigint NOT NULL CHECK(reference_cents>0 AND reference_cents<=900000000000),valid_from date NOT NULL,valid_to date,reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 3 AND 500),decision_ref text NOT NULL CHECK(length(btrim(decision_ref)) BETWEEN 3 AND 200),created_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),disabled_at timestamptz,CHECK(valid_to IS NULL OR valid_to>=valid_from));
CREATE TABLE public.ay5_budget(site_id uuid PRIMARY KEY REFERENCES public.site_sites(id),restricted_cents bigint NOT NULL CHECK(restricted_cents BETWEEN 0 AND 900000000000),planned_cents bigint NOT NULL CHECK(planned_cents BETWEEN 0 AND 900000000000),reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 3 AND 500),updated_by uuid NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.ay5_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ay5_monthly_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ay5_budget ENABLE ROW LEVEL SECURITY;
CREATE POLICY ay5_operations_read ON public.ay5_operations FOR SELECT TO authenticated USING(ay2_private.can(site_id,'finance'));
CREATE POLICY ay5_exceptions_read ON public.ay5_monthly_exceptions FOR SELECT TO authenticated USING(ay2_private.can(site_id,'finance'));
CREATE POLICY ay5_budget_read ON public.ay5_budget FOR SELECT TO authenticated USING(ay2_private.can(site_id,'finance'));
GRANT SELECT ON public.ay5_operations,public.ay5_monthly_exceptions,public.ay5_budget TO authenticated;
REVOKE ALL ON public.ay5_operations,public.ay5_monthly_exceptions,public.ay5_budget FROM anon;
CREATE INDEX ay5_exception_period ON public.ay5_monthly_exceptions(site_id,unit_id,valid_from) WHERE disabled_at IS NULL;
CREATE INDEX ay5_charge_group ON public.ay2_charges(site_id,unit_id,person_id,debt_group,due_on) WHERE void_reason IS NULL;

CREATE FUNCTION ay2_private.ay5_unit(u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.ay3_links l JOIN public.ay3_persons p ON p.id=l.person_id WHERE l.unit_id=u AND p.auth_user_id=auth.uid() AND l.active AND l.archived_at IS NULL AND (l.starts_on IS NULL OR l.starts_on<=current_date) AND (l.ends_on IS NULL OR l.ends_on>=current_date)); $$;
CREATE OR REPLACE FUNCTION ay2_private.view_charge(c uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.ay2_charges x WHERE x.id=c AND (ay2_private.can(x.site_id,'finance') OR ay2_private.own_person(x.person_id) OR (x.person_id IS NOT NULL AND ay2_private.ay5_unit(x.unit_id)))); $$;
ALTER POLICY ay2_charges_read ON public.ay2_charges USING(ay2_private.can(site_id,'finance') OR ay2_private.own_person(person_id) OR (person_id IS NOT NULL AND ay2_private.ay5_unit(unit_id)));
ALTER POLICY ay3_credits_read ON public.ay3_credits USING(ay2_private.can(site_id,'finance') OR ay2_private.own_person(person_id) OR ay2_private.ay5_unit(unit_id));
-- Allocations retain view_charge authorization. Raw bank records remain management-only.
-- Existing finance-only bank policy and its per-statement optimization remain unchanged.
CREATE FUNCTION ay2_private.ay5_receives(aid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.ay2_announcements a WHERE a.id=aid AND ay2_private.view_site(a.site_id) AND (ay2_private.can(a.site_id,'announcements') OR (a.published AND (a.starts_at IS NULL OR a.starts_at<=now()) AND (a.ends_at IS NULL OR a.ends_at>now()) AND (a.target_kind='all' OR EXISTS(
 SELECT 1 FROM public.ay3_links l JOIN public.ay3_persons p ON p.id=l.person_id JOIN public.site_units u ON u.id=l.unit_id JOIN public.site_blocks b ON b.id=u.block_id
 WHERE l.site_id=a.site_id AND p.auth_user_id=auth.uid() AND l.active AND l.archived_at IS NULL AND (l.starts_on IS NULL OR l.starts_on<=current_date) AND (l.ends_on IS NULL OR l.ends_on>=current_date) AND (
 (a.target_kind='owners' AND (l.role='owner' OR l.role='representative' AND 'owners'=ANY(l.mandates))) OR
 (a.target_kind='residents' AND (l.role='tenant' OR l.role='representative' AND 'residents'=ANY(l.mandates))) OR
 (a.target_kind='representatives' AND l.role='representative') OR
 (a.target_kind='units' AND l.unit_id=ANY(a.target_units)) OR (a.target_kind='blocks' AND b.code=ANY(a.target_blocks)))))))); $$;
ALTER POLICY ay2_announcements_read ON public.ay2_announcements USING(ay2_private.ay5_receives(id));

-- Security-definer only for this minimal projection: full bank rows are never returned.
CREATE FUNCTION ay2_private.ay5_payments(s uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(t),'[]'::jsonb) FROM (SELECT e.id,e.booked_on,'Ödeme'::text description,'Ödeme'::text category,sum(a.cents)::bigint cents FROM public.ay2_allocations a JOIN public.ay2_entries e ON e.id=a.entry_id WHERE a.site_id=s AND a.void_reason IS NULL AND ay2_private.view_charge(a.charge_id) GROUP BY e.id,e.booked_on) t WHERE auth.uid() IS NOT NULL AND ay2_private.view_site(s); $$;
CREATE FUNCTION public.ay5_workspace(p_site uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 result:=public.ay2_workspace(p_site);IF result IS NULL THEN RETURN NULL; END IF;
 result:=result||jsonb_build_object('exceptions',coalesce((SELECT jsonb_agg(x ORDER BY created_at DESC) FROM public.ay5_monthly_exceptions x WHERE site_id=p_site),'[]'::jsonb),'budget',(SELECT to_jsonb(x) FROM public.ay5_budget x WHERE site_id=p_site),'v5',true);
 IF NOT ay2_private.can(p_site,'finance') THEN result:=result||jsonb_build_object('entries',ay2_private.ay5_payments(p_site)); END IF;
 RETURN result;
END; $$;

CREATE FUNCTION ay2_private.ay5_payment_plan(s uuid,p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE entry public.ay2_entries; c record; available bigint; initial bigint; n bigint; rows jsonb:='[]';
BEGIN
 IF auth.uid() IS NULL OR NOT ay2_private.can(s,'finance') THEN RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING errcode='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.ay3_links WHERE site_id=s AND unit_id=(p->>'unit_id')::uuid AND person_id=(p->>'person_id')::uuid) THEN RAISE EXCEPTION 'Kişi seçin.'; END IF;
 SELECT * INTO entry FROM public.ay2_entries WHERE site_id=s AND id=(p->>'entry_id')::uuid FOR UPDATE;
 IF NOT FOUND OR entry.cents<=0 OR entry.reversal_of IS NOT NULL OR EXISTS(SELECT 1 FROM public.ay2_entries WHERE reversal_of=entry.id) THEN RAISE EXCEPTION 'Geçerli tahsilat bulunamadı.'; END IF;
 available:=entry.cents-coalesce((SELECT sum(cents) FROM public.ay2_allocations WHERE entry_id=entry.id AND void_reason IS NULL),0)-coalesce((SELECT sum(cents) FROM public.ay3_credits WHERE entry_id=entry.id AND void_reason IS NULL),0);initial:=available;
 IF available<=0 THEN RAISE EXCEPTION 'Kullanılabilir ödeme yok.'; END IF;
 FOR c IN SELECT x.*,x.cents-coalesce((SELECT sum(cents) FROM public.ay2_allocations WHERE charge_id=x.id AND void_reason IS NULL),0) remaining FROM public.ay2_charges x WHERE x.site_id=s AND x.unit_id=(p->>'unit_id')::uuid AND x.person_id=(p->>'person_id')::uuid AND (CASE WHEN x.debt_group='legacy' THEN 'legacy:'||x.category ELSE x.debt_group END)=p->>'group' AND x.void_reason IS NULL ORDER BY due_on,id FOR UPDATE OF x LOOP
  n:=least(available,c.remaining);IF n>0 THEN rows:=rows||jsonb_build_array(jsonb_build_object('charge_id',c.id,'cents',n,'due_on',c.due_on));available:=available-n;END IF;
 END LOOP;
 RETURN jsonb_build_object('entry_id',entry.id,'unit_id',p->>'unit_id','person_id',p->>'person_id','group',p->>'group','available_cents',initial,'allocations',rows,'credit_cents',available);
END; $$;
CREATE FUNCTION public.ay5_payment_plan(p_site uuid,p_payload jsonb) RETURNS jsonb LANGUAGE sql SET search_path='' AS $$SELECT ay2_private.ay5_payment_plan(p_site,p_payload);$$;

CREATE FUNCTION ay2_private.ay5_command(s uuid,act text,p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op public.ay5_operations; oid uuid; ident uuid; res jsonb; plan jsonb; row record; item jsonb; ids uuid[]; weights bigint[]; amounts bigint[]; denom numeric; total bigint; leftovers bigint; idx int; n int; cat text; ref text; l public.ay3_links; ex public.ay5_monthly_exceptions; old public.ay2_announcements; targets uuid[]; blocks text[]; start_on date;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Giriş gerekli.' USING errcode='42501';END IF;
 IF act='acknowledge' THEN
  SELECT * INTO old FROM public.ay2_announcements WHERE site_id=s AND id=(p->>'id')::uuid FOR SHARE;
  IF NOT FOUND OR NOT ay2_private.ay5_receives(old.id) OR NOT old.published OR old.revision IS DISTINCT FROM (p->>'revision')::int OR old.starts_at>now() OR old.ends_at<=now() THEN RAISE EXCEPTION 'Duyuru sürümü değişti. Yeniden açın.' USING errcode='42501';END IF;
  INSERT INTO public.ay3_acknowledgements VALUES(s,old.id,auth.uid(),old.revision,now()) ON CONFLICT DO NOTHING;RETURN jsonb_build_object('ok',true);
 END IF;
 IF act='announcement' THEN
  IF NOT ay2_private.can(s,'announcements') THEN RAISE EXCEPTION 'Yetkiniz yok.' USING errcode='42501';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(s::text,0));
  SELECT coalesce(array_agg(x::uuid),'{}') INTO targets FROM jsonb_array_elements_text(coalesce(p->'target_units','[]')) x;
  SELECT coalesce(array_agg(x),'{}') INTO blocks FROM jsonb_array_elements_text(coalesce(p->'target_blocks','[]')) x;
  IF EXISTS(SELECT 1 FROM unnest(targets) u WHERE NOT EXISTS(SELECT 1 FROM public.site_units WHERE id=u AND site_id=s)) OR EXISTS(SELECT 1 FROM unnest(blocks) b WHERE NOT EXISTS(SELECT 1 FROM public.site_blocks WHERE code=b AND site_id=s)) THEN RAISE EXCEPTION 'Hedef daire veya blok geçersiz.';END IF;
  IF p->>'target_kind'='units' AND cardinality(targets)=0 OR p->>'target_kind'='blocks' AND cardinality(blocks)=0 THEN RAISE EXCEPTION 'Hedef seçin.';END IF;
  res:=ay2_private.command(s,act,p);ident:=(res->>'id')::uuid;
  UPDATE public.ay2_announcements SET popup_on_login=coalesce((p->>'popup_on_login')::boolean,false),target_kind=coalesce(p->>'target_kind','all'),target_units=targets,target_blocks=blocks,title_de=coalesce(p->>'title_de',''),body_de=coalesce(p->>'body_de','') WHERE id=ident AND site_id=s;
  RETURN res;
 END IF;
 IF act IN ('assignment_add','assignment_edit','assignment_restore') THEN
  SELECT * INTO l FROM public.ay3_links WHERE site_id=s AND id=nullif(p->>'id','')::uuid;
  res:=ay2_private.command(s,act,p);
  IF p ? 'mandates' THEN
   UPDATE public.ay3_links SET mandates=CASE WHEN role='representative' THEN ARRAY(SELECT DISTINCT jsonb_array_elements_text(p->'mandates')) ELSE '{}' END WHERE id=(res->>'id')::uuid AND site_id=s;
   INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) SELECT s,auth.uid(),'notification_mandates',id,jsonb_build_object('before',coalesce(to_jsonb(l.mandates),'[]'::jsonb),'after',to_jsonb(mandates),'request_id',p->>'request_id') FROM public.ay3_links WHERE site_id=s AND id=(res->>'id')::uuid AND coalesce(l.mandates,'{}') IS DISTINCT FROM mandates;
  END IF;
  RETURN res;
 END IF;
 IF NOT ay2_private.can(s,'finance') THEN RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING errcode='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(s::text,0));
 SELECT * INTO op FROM public.ay5_operations WHERE site_id=s AND request_id=(p->>'request_id')::uuid;
 IF FOUND THEN IF op.payload IS DISTINCT FROM (p||jsonb_build_object('_action',act)) THEN RAISE EXCEPTION 'Bu istek farklı değerlerle kaydedildi.';END IF;RETURN op.result||'{"already_recorded":true}'::jsonb;END IF;
 INSERT INTO public.ay5_operations(site_id,request_id,payload,created_by) VALUES(s,(p->>'request_id')::uuid,p||jsonb_build_object('_action',act),auth.uid()) RETURNING id INTO oid;
 IF act='monthly_exception' THEN
  IF NOT EXISTS(SELECT 1 FROM public.site_units WHERE id=(p->>'unit_id')::uuid AND site_id=s) OR (nullif(p->>'person_id','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.ay3_links WHERE site_id=s AND unit_id=(p->>'unit_id')::uuid AND person_id=(p->>'person_id')::uuid)) THEN RAISE EXCEPTION 'Daire ve kişiyi kontrol edin.';END IF;
  IF EXISTS(SELECT 1 FROM public.ay5_monthly_exceptions WHERE site_id=s AND unit_id=(p->>'unit_id')::uuid AND kind=p->>'kind' AND disabled_at IS NULL AND daterange(valid_from,valid_to,'[]') && daterange((p->>'valid_from')::date,nullif(p->>'valid_to','')::date,'[]')) THEN RAISE EXCEPTION 'Bu dönem için istisna zaten var.';END IF;
  INSERT INTO public.ay5_monthly_exceptions(site_id,unit_id,person_id,kind,reference_cents,valid_from,valid_to,reason,decision_ref,created_by) VALUES(s,(p->>'unit_id')::uuid,nullif(p->>'person_id','')::uuid,p->>'kind',(p->>'reference_cents')::bigint,(p->>'valid_from')::date,nullif(p->>'valid_to','')::date,p->>'reason',p->>'decision_ref',auth.uid()) RETURNING id INTO ident;
 ELSIF act='disable_exception' THEN
  IF length(btrim(coalesce(p->>'reason','')))<3 THEN RAISE EXCEPTION 'Gerekçe gerekli.';END IF;
  UPDATE public.ay5_monthly_exceptions SET disabled_at=now() WHERE site_id=s AND id=(p->>'id')::uuid AND disabled_at IS NULL RETURNING id INTO ident;IF ident IS NULL THEN RAISE EXCEPTION 'Aktif istisna bulunamadı.';END IF;
 ELSIF act='budget' THEN
  INSERT INTO public.ay5_budget VALUES(s,(p->>'restricted_cents')::bigint,(p->>'planned_cents')::bigint,p->>'reason',auth.uid(),now()) ON CONFLICT(site_id) DO UPDATE SET restricted_cents=excluded.restricted_cents,planned_cents=excluded.planned_cents,reason=excluded.reason,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
 ELSIF act IN ('batch_charge','monthly_v5') THEN
  IF coalesce((p->>'confirmed')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'Önizlemeyi onaylayın.';END IF;
  IF length(btrim(coalesce(p->>'basis_ref','')))<3 THEN RAISE EXCEPTION 'Karar / dayanak referansı gerekli.';END IF;
  SELECT array_agg(u.id ORDER BY u.id) INTO ids FROM public.site_units u JOIN public.site_blocks b ON b.id=u.block_id WHERE u.site_id=s AND (p->>'scope'='all' OR b.code=p->>'scope' OR p->>'scope'='selected' AND u.id::text IN (SELECT jsonb_array_elements_text(coalesce(p->'unit_ids','[]'))));
  FOR item IN SELECT value FROM jsonb_array_elements(coalesce(p->'exclusions','[]')) LOOP
   IF NOT ((item->>'unit_id')::uuid=ANY(ids)) OR length(btrim(coalesce(item->>'reason','')))<3 THEN RAISE EXCEPTION 'Hariç tutma gerekçesi gerekli.';END IF;
   ids:=array_remove(ids,(item->>'unit_id')::uuid);
  END LOOP;
  IF coalesce(cardinality(ids),0) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION '1–20 daire seçin.';END IF;
  total:=(p->>'cents')::bigint;IF total IS NULL OR total NOT BETWEEN 1 AND 900000000000 THEN RAISE EXCEPTION 'Tutar geçersiz.';END IF;
  IF coalesce(p->>'distribution','') NOT IN ('total','per_unit','shares') THEN RAISE EXCEPTION 'Dağıtım türünü seçin.';END IF;
  weights:='{}';amounts:='{}';denom:=0;
  FOREACH ident IN ARRAY ids LOOP n:=CASE WHEN p->>'distribution'='shares' THEN (p->'weights'->>ident::text)::int ELSE 1 END;IF n IS NULL OR n<=0 OR n>1000000000 THEN RAISE EXCEPTION 'Arsa paylarını kontrol edin.';END IF;weights:=array_append(weights,n);denom:=denom+n;END LOOP;
  FOR idx IN 1..cardinality(ids) LOOP amounts:=array_append(amounts,CASE WHEN p->>'distribution'='per_unit' THEN total ELSE floor(total::numeric*weights[idx]/denom)::bigint END);END LOOP;
  IF p->>'distribution'<>'per_unit' THEN
   SELECT total-sum(x) INTO leftovers FROM unnest(amounts) x;
   FOR row IN SELECT i FROM generate_subscripts(weights,1) i ORDER BY mod(total::numeric*weights[i],denom) DESC,i LIMIT leftovers LOOP amounts[row.i]:=amounts[row.i]+1;END LOOP;
  END IF;
  IF (SELECT sum(x) FROM unnest(amounts) x)>900000000000 OR 0=ANY(amounts) THEN RAISE EXCEPTION 'Dağıtım tutarını kontrol edin.';END IF;
  cat:=CASE WHEN act='monthly_v5' THEN 'Aidat' ELSE p->>'category' END;
  IF act='batch_charge' AND cat NOT IN ('Genel Gider / İşletme','Bakım ve Onarım','Demirbaş') THEN RAISE EXCEPTION 'Kategori seçin.';END IF;
  IF p->>'debt_group' NOT IN ('general','capital','legal') THEN RAISE EXCEPTION 'Borç grubunu seçin.';END IF;
  start_on:=(p->>'due_on')::date;res:=jsonb_build_object('charges','[]'::jsonb,'excluded','[]'::jsonb,'operation_id',oid);
  FOR idx IN 1..cardinality(ids) LOOP
   SELECT * INTO l FROM public.ay3_links WHERE site_id=s AND id=(p->'debtors'->>ids[idx]::text)::uuid AND unit_id=ids[idx] AND role IN ('owner','tenant') AND active AND archived_at IS NULL AND (starts_on IS NULL OR starts_on<=start_on) AND (ends_on IS NULL OR ends_on>=start_on);
   IF NOT FOUND THEN RAISE EXCEPTION 'Her daire için sorumlu kişiyi seçin.';END IF;
   IF act='monthly_v5' THEN
    SELECT * INTO ex FROM public.ay5_monthly_exceptions WHERE site_id=s AND unit_id=ids[idx] AND (person_id IS NULL OR person_id=l.person_id) AND kind='exemption' AND disabled_at IS NULL AND valid_from<=start_on AND (valid_to IS NULL OR valid_to>=start_on) ORDER BY created_at LIMIT 1;
    IF FOUND THEN IF ex.reference_cents IS DISTINCT FROM amounts[idx] THEN RAISE EXCEPTION 'İstisna tutarı değişti. Kararı yeniden kontrol edin.';END IF;res:=jsonb_set(res,'{excluded}',res->'excluded'||jsonb_build_array(to_jsonb(ex)));CONTINUE;END IF;
   END IF;
   IF (p->'expected'->>ids[idx]::text)::bigint IS DISTINCT FROM amounts[idx] THEN RAISE EXCEPTION 'Önizleme değişti. Yeniden kontrol edin.';END IF;
   ref:=CASE WHEN act='monthly_v5' THEN 'monthly:'||date_trunc('month',start_on)::date ELSE 'batch:'||oid END;
   IF EXISTS(SELECT 1 FROM public.ay2_charges WHERE site_id=s AND unit_id=ids[idx] AND reference=ref) THEN RAISE EXCEPTION 'Bu dönem için aidat zaten oluşturuldu.';END IF;
   item:=ay2_private.command(s,'charge',jsonb_build_object('unit_id',ids[idx],'link_id',l.id,'category',cat,'label',p->>'label','due_on',start_on,'cents',amounts[idx],'payer',l.role,'reference',ref,'period_from',p->>'period_from','period_to',p->>'period_to'));
   ident:=(item->>'id')::uuid;
   UPDATE public.ay2_charges SET operation_id=oid,debt_group=p->>'debt_group',distribution_basis=jsonb_build_object('distribution',p->>'distribution','weight',weights[idx],'basis_ref',p->>'basis_ref') WHERE id=ident;
   res:=jsonb_set(res,'{charges}',res->'charges'||jsonb_build_array(jsonb_build_object('id',ident,'unit_id',ids[idx],'cents',amounts[idx])));
  END LOOP;
 ELSIF act='auto_allocate' THEN
  IF coalesce((p->>'confirmed')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'Önizlemeyi onaylayın.';END IF;
  plan:=ay2_private.ay5_payment_plan(s,p);IF plan IS DISTINCT FROM p->'expected_plan' THEN RAISE EXCEPTION 'Ödeme bakiyesi değişti. Yeniden kontrol edin.';END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(plan->'allocations') LOOP PERFORM ay2_private.command(s,'allocate',jsonb_build_object('request_id',gen_random_uuid(),'entry_id',p->>'entry_id','charge_id',item->>'charge_id','cents',item->>'cents'));END LOOP;
  IF (plan->>'credit_cents')::bigint>0 THEN
   item:=ay2_private.command(s,'credit',jsonb_build_object('request_id',gen_random_uuid(),'entry_id',p->>'entry_id','unit_id',p->>'unit_id','person_id',p->>'person_id','cents',plan->>'credit_cents'));
   UPDATE public.ay3_credits SET debt_group=p->>'group' WHERE id=(item->>'id')::uuid;
  END IF;res:=plan;
 ELSE RAISE EXCEPTION 'Bilinmeyen işlem.';
 END IF;
 res:=coalesce(res,jsonb_build_object('ok',true,'id',ident));UPDATE public.ay5_operations SET result=res WHERE id=oid;
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(s,auth.uid(),act,oid,jsonb_build_object('request_id',p->>'request_id','payload',p,'result',res));
 RETURN res;
END; $$;
CREATE FUNCTION public.ay5_command(p_site uuid,p_action text,p_payload jsonb) RETURNS jsonb LANGUAGE sql SET search_path='' AS $$SELECT ay2_private.ay5_command(p_site,p_action,p_payload);$$;
-- Route old notification/assignment callers through the same guarded server implementation.
CREATE OR REPLACE FUNCTION public.ay2_command(p_site uuid,p_action text,p_payload jsonb) RETURNS jsonb LANGUAGE sql SET search_path='' AS $$
 SELECT CASE WHEN p_action IN ('announcement','acknowledge','assignment_add','assignment_edit','assignment_restore') THEN ay2_private.ay5_command(p_site,p_action,p_payload) ELSE ay2_private.command(p_site,p_action,p_payload) END; $$;
REVOKE ALL ON FUNCTION public.ay5_workspace(uuid),public.ay5_command(uuid,text,jsonb),public.ay5_payment_plan(uuid,jsonb),ay2_private.ay5_unit(uuid),ay2_private.ay5_receives(uuid),ay2_private.ay5_payments(uuid),ay2_private.ay5_payment_plan(uuid,jsonb),ay2_private.ay5_command(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ay5_workspace(uuid),public.ay5_command(uuid,text,jsonb),public.ay5_payment_plan(uuid,jsonb),ay2_private.ay5_unit(uuid),ay2_private.ay5_receives(uuid),ay2_private.ay5_payments(uuid),ay2_private.ay5_payment_plan(uuid,jsonb),ay2_private.ay5_command(uuid,text,jsonb) TO authenticated;
COMMIT;
