import {t as tr} from './i18n.mjs';
// Existing site tables are read-only; V2 mutations use a checked transactional RPC.
const URL='https://eisozwhhinqszfikemot.supabase.co';
const KEY='sb_publishable_KGkvInvbdFRRF0716v9AuQ_fZjwkkBc';
const TABLES=new Set(['site_sites','site_units','site_blocks','site_staff_memberships','site_resident_units','ay2_settings','ay2_permissions','ay2_entries','ay2_charges','ay2_allocations','ay2_people','ay2_announcements','ay2_reports','ay2_audit','ay2_staged_charges']);
export class AyaparkApi {
 constructor(fetcher=globalThis.fetch) {this.fetcher=fetcher;this.generation=0;this.clear();}
 clear(){this.generation++;this.session=null;this.expiry=0;this.refreshing=null;}
 async raw(path,method='GET',body,token) {
  const response=await this.fetcher(URL+path,{method,headers:{apikey:KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)});
  const data=await response.json().catch(()=>null);
  if(!response.ok){const error=Error(response.status===401?tr("Oturum sona erdi. Yeniden giriş yapın."):response.status===429?tr("Çok fazla deneme yapıldı. Biraz sonra tekrar deneyin."):(['P0001','42501'].includes(data?.code)?data.message:tr("İşlem tamamlanamadı. Bağlantıyı, erişimi ve zorunlu alanları kontrol edin.")));error.status=response.status;throw error;}
  return data;
 }
 accept(session,generation){
  if(generation!==this.generation)throw Error(tr("Oturum değişti. Yeniden giriş yapın."));
  if(!session?.access_token||!session.user?.id)throw Error(tr("Geçerli oturum alınamadı."));
  this.session=session;this.expiry=Date.now()+Number(session.expires_in||3600)*1000;
 }
 async login(email,password){
  this.clear();const generation=this.generation;
  this.accept(await this.raw('/auth/v1/token?grant_type=password','POST',{email,password}),generation);
  const user=await this.raw('/auth/v1/user','GET',undefined,this.session.access_token);
  if(generation!==this.generation)throw Error(tr("Oturum değişti."));
  if(!user?.id||user.id!==this.session.user.id)throw Error(tr("Kimlik doğrulanamadı."));
  return user;
 }
 async token(){
  if(!this.session)throw Error(tr("Giriş yapın."));
  if(this.expiry>Date.now()+60000)return this.session.access_token;
  if(!this.refreshing){
   const generation=this.generation;
   this.refreshing=this.raw('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:this.session.refresh_token}).then(s=>this.accept(s,generation)).finally(()=>{if(generation===this.generation)this.refreshing=null;});
  }
  await this.refreshing;
  if(!this.session)throw Error(tr("Giriş yapın."));
  return this.session.access_token;
 }
 async read(table,query){
  if(!TABLES.has(table))throw Error(tr("Bu tablo V2 okuma kapsamı dışında."));
  const generation=this.generation;
  const token=await this.token();
  const data=await this.raw(`/rest/v1/${table}?${query}`,'GET',undefined,token);
  if(generation!==this.generation)throw Error(tr("Oturum değişti."));
  if(!Array.isArray(data))throw Error(tr("Veri biçimi geçersiz."));
  return data;
 }
 async rpc(name,body){
  if(!['ay2_command','ay2_capabilities','ay2_workspace'].includes(name))throw Error(tr("İşlem kapsam dışında."));
  const generation=this.generation,token=await this.token();
  const result=await this.raw('/rest/v1/rpc/'+name,'POST',body,token);
  if(generation!==this.generation)throw Error(tr("Oturum değişti."));return result;
 }
 async readAll(table,query){let out=[];for(let offset=0;offset<100000;offset+=1000){const rows=await this.read(table,query+'&limit=1000&offset='+offset);out.push(...rows);if(rows.length<1000)return out;}throw Error(tr("Çok fazla kayıt var. Dönem filtresi gerekli."));}
 async command(site,action,payload){return this.rpc('ay2_command',{p_site:site,p_action:action,p_payload:payload});}
 async load(){
  const userId=encodeURIComponent(this.session?.user.id||'');
  const sites=await this.read('site_sites','select=id,name,slug&slug=eq.aya-park-2&limit=1');
  if(!sites.length){const error=Error(tr("Ayapark 2 erişiminiz bulunamadı. Yöneticiye danışın."));error.status=403;throw error;}
  const site=sites[0],sid=encodeURIComponent(site.id);
  const [memberships,units,blocks,links]=await Promise.all([
   this.read('site_staff_memberships',`select=role&site_id=eq.${sid}&user_id=eq.${userId}`),
   this.read('site_units',`select=id,code,number,block_id,occupancy_status&site_id=eq.${sid}&order=number.asc`),
   this.read('site_blocks',`select=id,code&site_id=eq.${sid}`),
   this.read('site_resident_units',`select=unit_id&user_id=eq.${userId}&active=eq.true`)
  ]);
  const serverRole=memberships[0]?.role||'resident';
  const role=serverRole==='manager'?'super':['deputy','auditor'].includes(serverRole)?'staff':'resident';
  const ownIds=links.map(l=>l.unit_id);
  const byName=await this.rpc('ay2_workspace',{p_site:site.id});
  if(!byName)throw Error(tr("Çalışma alanı erişimi doğrulanamadı."));
  const capabilities=byName.capabilities;
  const transactions=byName.entries.map(t=>({...t,date:t.booked_on,desc:t.description,cents:Number(t.cents)})).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
  const charges=byName.charges.map(c=>({...c,cents:Number(c.cents)})),allocations=byName.allocations.map(a=>({...a,cents:Number(a.cents)}));
  const unitData=units.filter(u=>role!=='resident'||ownIds.includes(u.id)).map(u=>({...u,block:blocks.find(b=>b.id===u.block_id)?.code||'?',debt:capabilities.finance||ownIds.includes(u.id)?charges.filter(c=>c.unit_id===u.id&&!c.void_reason).reduce((n,c)=>n+c.cents-allocations.filter(a=>a.charge_id===c.id&&!a.void_reason).reduce((x,a)=>x+a.cents,0),0):null}));
  const staff=role==='super'?await this.read('site_staff_memberships',`select=user_id,role&site_id=eq.${sid}`):[];
  return {site,role,serverRole,ownIds,capabilities,transactions,charges,allocations,people:byName.people,announcements:byName.announcements,reports:byName.reports,staged:byName.staged_charges,audit:byName.audit,permissions:byName.permissions,staff,opening:byName.settings[0]?.initialized?Number(byName.settings[0].opening_cents):null,openingDate:byName.settings[0]?.opening_date||null,units:unitData};
 }
 async logout(){const token=this.session?.access_token;this.clear();if(token)await this.raw('/auth/v1/logout?scope=local','POST',undefined,token);}
}
