-- Guard exact identities only; shared family contacts or homonyms alone are insufficient.
create function ay2_private.prevent_duplicate_person() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('person-identity:'||new.site_id::text,0));
 if exists(select 1 from public.ay3_persons p where p.site_id=new.site_id
 and lower(translate(regexp_replace(btrim(p.full_name),'\s+',' ','g'),'ÇĞİIÖŞÜçğıöşü','cgiiosucgiosu'))
 =lower(translate(regexp_replace(btrim(new.full_name),'\s+',' ','g'),'ÇĞİIÖŞÜçğıöşü','cgiiosucgiosu'))
 and ((btrim(coalesce(new.email,''))<>'' and lower(btrim(p.email))=lower(btrim(new.email)))
 or (regexp_replace(coalesce(new.phone,''),'\D','','g')<>'' and
 regexp_replace(p.phone,'\D','','g')=regexp_replace(new.phone,'\D','','g'))
 or (btrim(coalesce(new.email,''))='' and btrim(coalesce(new.phone,''))=''
 and btrim(p.email)='' and btrim(p.phone)='')))
 then raise exception 'Bu kişi zaten kayıtlı. Mevcut kişiyi seçin; arşivdeyse önce geri getirin.';end if;
 return new;
end;$$;
revoke all on function ay2_private.prevent_duplicate_person() from PUBLIC,anon,authenticated;
create trigger ay3_person_no_duplicate before insert on public.ay3_persons
for each row execute function ay2_private.prevent_duplicate_person();
