-- PUBLIC claim data only. SAFE to commit to public GitHub (does not contain names).
-- Run in Supabase SQL Editor AFTER 01_schema.sql.
begin;
insert into public.ayapark_claims (id,sort_order,amount,person_kind,followup_kind,is_paid,message_sent) values ('k-1f17b0c04521',1,20180,'M','general',false,false) on conflict (id) do nothing;
insert into public.ayapark_claims (id,sort_order,amount,person_kind,followup_kind,is_paid,message_sent) values ('k-505b8197fbf4',2,16603,'M','general',false,false) on conflict (id) do nothing;
insert into public.ayapark_claims (id,sort_order,amount,person_kind,followup_kind,is_paid,message_sent) values ('k-8e937cb6db3c',3,16380,'M','general',false,false) on conflict (id) do nothing;
insert into public.ayapark_claims (id,sort_order,amount,person_kind,followup_kind,is_paid,message_sent) values ('k-67eb33aae8a3',4,11000,'M','general',false,false) on conflict (id) do nothing;
insert into public.ayapark_claims (id,sort_order,amount,person_kind,followup_kind,is_paid,message_sent) values ('k-b7a431a8de3a',5,20480,'K','general',false,false) on conflict (id) do nothing;
insert into public.ayapark_claims (id,sort_order,amount,person_kind,followup_kind,is_paid,message_sent) values ('k-b547fcf3615f',6,7780,'M','general',false,false) on conflict (id) do nothing;
insert into public.ayapark_claims (id,sort_order,amount,person_kind,followup_kind,is_paid,message_sent) values ('k-748d654229c4',7,7500,'M','general',false,false) on conflict (id) do nothing;
insert into public.ayapark_claims (id,sort_order,amount,person_kind,followup_kind,is_paid,message_sent) values ('k-94d60c2c374d',8,4280,'M','general',false,false) on conflict (id) do nothing;
insert into public.ayapark_claims (id,sort_order,amount,person_kind,followup_kind,is_paid,message_sent) values ('k-386226823cae',9,9100,'M','general',false,false) on conflict (id) do nothing;
insert into public.ayapark_claims (id,sort_order,amount,person_kind,followup_kind,is_paid,message_sent) values ('k-b50893983ff3',10,11380,'M','general',false,false) on conflict (id) do nothing;
insert into public.ayapark_claims (id,sort_order,amount,person_kind,followup_kind,is_paid,message_sent) values ('k-93833dcc9ed9',11,4100,'M','general',false,false) on conflict (id) do nothing;
insert into public.ayapark_claims (id,sort_order,amount,person_kind,followup_kind,is_paid,message_sent) values ('k-9091c2aca25e',12,6620,'?','icra',false,false) on conflict (id) do nothing;
insert into public.ayapark_claims (id,sort_order,amount,person_kind,followup_kind,is_paid,message_sent) values ('k-e17c0959f3e2',13,58880,'K','icra',false,false) on conflict (id) do nothing;
insert into public.ayapark_claims (id,sort_order,amount,person_kind,followup_kind,is_paid,message_sent) values ('k-50232fab9bb8',14,9100,'M','general',false,false) on conflict (id) do nothing;
commit;
