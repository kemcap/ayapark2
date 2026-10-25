import {t as tr} from './i18n.mjs';
// Existing site tables are read-only; V2 mutations use a checked transactional RPC.
const URL='https://eisozwhhinqszfikemot.supabase.co';
const KEY='sb_publishable_KGkvInvbdFRRF0716v9AuQ_fZjwkkBc';
const TABLES=new Set(['site_sites','site_units','site_blocks','site_staff_memberships','site_resident_units','ay2_settings','ay2_permissions','ay2_entries','ay2_charges','ay2_allocations','ay2_people','ay2_announcements','ay2_reports','ay2_audit','ay2_staged_charges']);
export class AyaparkApi {
 constructor(fetcher=(...args)=>globalThis.fetch(...args),{persist=true,storage,previewOnly=false}={}) {
  this.previewOnly=previewOnly;this.fetcher=fetcher;this.generation=0;this.session=null;this.expiry=0;this.refreshing=null;
  try{this.storage=persist?(storage??globalThis.localStorage):null;}catch{this.storage=null;}this.storageKey='ayapark2-v3-session:'+((globalThis.location&&new globalThis.URL('.',globalThis.location.href).pathname)||'/');
 }
 clear(remove=true){this.generation++;this.session=null;this.expiry=0;this.refreshing=null;if(remove)try{this.storage?.removeItem(this.storageKey);}catch{}}
 saved(){try{const s=JSON.parse(this.storage?.getItem(this.storageKey)||'null');return s?.access_token&&s?.refresh_token&&s?.user?.id?s:null;}catch{return null;}}
 persist(){try{this.storage?.setItem(this.storageKey,JSON.stringify({...this.session,expires_at:this.expiry}));}catch{}}
 async restore(){
  const saved=this.saved();if(!saved)return false;
  this.session=saved;this.expiry=Number(saved.expires_at)||0;const generation=this.generation;
  try{const token=await this.token(),user=await this.raw('/auth/v1/user','GET',undefined,token);if(generation!==this.generation)return false;if(user?.id!==this.session?.user.id)throw Object.assign(Error(tr('Kimlik doğrulanamadı.')),{status:401});this.session.user=user;this.persist();return true;}
  catch(error){if([400,401,403].includes(error.status))this.clear();throw error;}
 }
 async requestCode(email){return this.raw('/auth/v1/otp?redirect_to='+encodeURIComponent(new globalThis.URL('./',globalThis.location.href).href),'POST',{email,create_user:false});}
 async verifyCode(email,token){this.clear();const generation=this.generation;this.accept(await this.raw('/auth/v1/verify','POST',{email,token,type:'email'}),generation);return this.session.user;}
 async acceptLink(access_token,refresh_token){
  this.clear();const generation=this.generation;
  const user=await this.raw('/auth/v1/user','GET',undefined,access_token);
  this.accept({access_token,refresh_token,expires_in:0,user},generation);await this.token();return user;
 }
 async provision(payload){return this.raw('/functions/v1/ay3-user-access','POST',payload,await this.token());}
 async raw(path,method='GET',body,token) {
  if(this.previewOnly)throw Error(tr('Bu önizleme yalnızca örnek veriler kullanır. Canlı hesaba bağlanılmaz.'));
  const response=await this.fetcher(URL+path,{method,headers:{apikey:KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)});
  const data=await response.json().catch(()=>null);
  if(!response.ok){const announcementErrors={ay2_announcements_title_check:tr('Duyuru başlığı en fazla 150 karakter olabilir.'),ay2_announcements_body_check:tr('Duyuru metni en fazla 5000 karakter olabilir.'),ay2_announcements_check:tr('Yayın bitişi başlangıçtan sonra olmalıdır.')};const knownAnnouncement=Object.entries(announcementErrors).find(([constraint])=>String(data?.message).includes('\"'+constraint+'\"'))?.[1];
  const accessMessages={access_denied:'Yalnızca Süper Admin kullanıcı erişimi verebilir.',invalid_email:'Geçerli bir e-posta adresi girin.',apartment_required:'Sakin erişimi için önce güncel bir daire ilişkisi ekleyin.',account_mismatch:'Bu kişi başka bir hesaba bağlı. Hesap bağlantısını kontrol edin.',role_conflict:'Bu hesabın farklı bir yönetim rolü var. Mevcut rolü önce kontrol edin.',invalid_person:'Ad, soyad ve geçerli e-posta gerekli.',account_failed:'Hesap hazırlanamadı. Lütfen tekrar deneyin.',assignment_failed:'Erişim kaydedilemedi. Lütfen yöneticiye bildirin.',invalid_request:'Kişi, rol ve onay alanlarını kontrol edin.'};
  const error=Error((path.startsWith('/functions/v1/ay3-user-access')&&accessMessages[data?.error]?tr(accessMessages[data.error]):null)||knownAnnouncement||(data?.code==='23514'&&String(data.message).includes('ay3_links_check')?tr('Çıkış tarihi başlangıç tarihinden önce olamaz.'):response.status===403?tr('Bu işlem için yetkiniz yok.'):path.startsWith('/auth/v1/')&&response.status===400?tr('Kod, e-posta veya şifre geçersiz olabilir. Tekrar kontrol edin.'):response.status===401?tr("Oturum sona erdi. Yeniden giriş yapın."):response.status===429?tr("Çok fazla deneme yapıldı. Biraz sonra tekrar deneyin."):(['P0001','42501'].includes(data?.code)?tr(data.message):tr("İşlem tamamlanamadı. Bağlantıyı, erişimi ve zorunlu alanları kontrol edin."))));error.status=response.status;throw error;}
  return data;
 }
 accept(session,generation){
  if(generation!==this.generation)throw Error(tr("Oturum değişti. Yeniden giriş yapın."));
  if(!session?.access_token||!session.user?.id)throw Error(tr("Geçerli oturum alınamadı."));
  this.session=session;this.expiry=Date.now()+Number(session.expires_in??3600)*1000;this.persist();
 }
 async setPassword(password){
  if(!this.session)throw Error(tr('Giriş yapın.'));
  const generation=this.generation,token=await this.token();
  const updated=await this.raw('/auth/v1/user','PUT',{password},token);
  if(generation!==this.generation)throw Error(tr('Oturum değişti.'));
  return updated;
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
   const refresh=async()=>{
    if(generation!==this.generation)throw Error(tr('Oturum değişti.'));
    const saved=this.saved();
    if(saved&&saved.user.id===this.session?.user.id&&Number(saved.expires_at)>Date.now()+60000){this.session=saved;this.expiry=Number(saved.expires_at);return;}
    try{this.accept(await this.raw('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:saved?.user.id===this.session?.user.id?saved.refresh_token:this.session.refresh_token}),generation);}
    catch(error){if(generation===this.generation&&[400,401,403].includes(error.status))this.clear();throw error;}
   };
   const locks=globalThis.navigator?.locks;
   this.refreshing=(locks?locks.request(this.storageKey,refresh):refresh()).finally(()=>{if(generation===this.generation)this.refreshing=null;});
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
  if(!['ay2_command','ay2_capabilities','ay2_workspace','ay3_financial_summary','ay3_provider_directory','ay3_preferences','ay3_review_state','ay3_review_selected','ay3_staff_directory','ay3_audit_page','ay3_remove_staff_member'].includes(name))throw Error(tr("İşlem kapsam dışında."));
  const generation=this.generation,token=await this.token();
  const result=await this.raw('/rest/v1/rpc/'+name,'POST',body,token);
  if(generation!==this.generation)throw Error(tr("Oturum değişti."));return result;
 }
 async readAll(table,query){const generation=this.generation;let out=[];for(let offset=0;;offset+=1000){const rows=await this.read(table,query+'&limit=1000&offset='+offset);if(generation!==this.generation)throw Error(tr("Oturum değişti."));out.push(...rows);if(rows.length<1000)return out;}}
 async command(site,action,payload){return this.rpc('ay2_command',{p_site:site,p_action:action,p_payload:payload});}
 async load(){
  const generation=this.generation;
  const assertSession=()=>{if(generation!==this.generation)throw Error(tr("Oturum değişti."));};
  const userId=encodeURIComponent(this.session?.user.id||'');
  const sites=await this.read('site_sites','select=id,name,slug&slug=eq.aya-park-2&limit=1');
  assertSession();
  if(!sites.length){const error=Error(tr("Ayapark 2 erişiminiz bulunamadı. Yöneticiye danışın."));error.status=403;throw error;}
  const site=sites[0],sid=encodeURIComponent(site.id);
  const [memberships,units,blocks,links]=await Promise.all([
   this.read('site_staff_memberships',`select=role&site_id=eq.${sid}&user_id=eq.${userId}`),
   this.read('site_units',`select=id,code,number,block_id,occupancy_status&site_id=eq.${sid}&order=number.asc`),
   this.read('site_blocks',`select=id,code&site_id=eq.${sid}`),
   this.read('site_resident_units',`select=unit_id&user_id=eq.${userId}&active=eq.true`)
  ]);
  assertSession();
  const serverRole=memberships[0]?.role||'resident';
  const role=serverRole==='manager'?'super':['deputy','auditor'].includes(serverRole)?'staff':'resident';
  const ownIds=links.map(l=>l.unit_id);
  const [byName,summary,reviewState,staff,residentAccounts]=await Promise.all([this.rpc('ay2_workspace',{p_site:site.id}),this.rpc('ay3_financial_summary',{p_site:site.id}),this.rpc('ay3_review_state',{p_site:site.id}),role==='super'?this.rpc('ay3_staff_directory',{p_site:site.id}):Promise.resolve([]),role==='super'?this.readAll('site_resident_units',`select=user_id,unit_id&active=eq.true&unit_id=in.(${units.map(u=>u.id).join(',')})`):Promise.resolve([])]);
  assertSession();
  if(!byName)throw Error(tr("Çalışma alanı erişimi doğrulanamadı."));
  const capabilities=byName.capabilities;
  if(!capabilities.people)byName.providers=await this.rpc('ay3_provider_directory',{p_site:site.id});

  assertSession();
  const linksV3=byName.links||[],persons=byName.persons||[];
  const ownPersonIds=[...new Set(linksV3.filter(l=>role==='resident'||persons.find(p=>p.id===l.person_id)?.auth_user_id===this.session.user.id).map(l=>l.person_id))];
  for(const link of linksV3)if(role==='resident'&&!ownIds.includes(link.unit_id))ownIds.push(link.unit_id);
  const transactions=byName.entries.map(t=>({...t,date:t.booked_on,desc:t.description,iban:t.sender_iban||'',cents:Number(t.cents)})).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
  const charges=byName.charges.map(c=>({...c,cents:Number(c.cents)})),allocations=byName.allocations.map(a=>({...a,cents:Number(a.cents)}));
  // Index once per response; repeated charge/allocation scans grow quadratically.
  const paidByCharge=new Map(),debtByUnit=new Map(),blockById=new Map(blocks.map(b=>[b.id,b.code]));
  for(const a of allocations)if(!a.void_reason)paidByCharge.set(a.charge_id,(paidByCharge.get(a.charge_id)||0)+a.cents);
  for(const c of charges)if(!c.void_reason)debtByUnit.set(c.unit_id,(debtByUnit.get(c.unit_id)||0)+c.cents-(paidByCharge.get(c.id)||0));
  const unitData=units.filter(u=>role!=='resident'||ownIds.includes(u.id)).map(u=>({...u,block:blockById.get(u.block_id)||'?',debt:capabilities.finance||ownIds.includes(u.id)?debtByUnit.get(u.id)||0:null}));
  return {reviewState,userId:this.session.user.id,persons,links:linksV3,occupancyChanges:byName.occupancy_changes||[],credits:(byName.credits||[]).map(c=>({...c,cents:Number(c.cents)})),ownPersonIds,matchRules:byName.match_rules||[],providers:byName.providers||[],providerNotes:byName.provider_notes||[],acknowledgements:byName.acknowledgements||[],residentAccounts:[...new Map(residentAccounts.filter(r=>r.user_id).map(r=>[r.user_id,{...r,label:(units.find(u=>u.id===r.unit_id)?.code||'')+' · '+r.user_id.slice(0,8)}])).values()],summaryDays:summary?.days||[],summaryOpening:summary?.opening_cents==null?null:Number(summary.opening_cents),summaryBalance:summary?.balance_cents==null?null:Number(summary.balance_cents),sourceLastDate:summary?.source_last_date,site,role,serverRole,ownIds,capabilities,transactions,charges,allocations,people:byName.people,announcements:byName.announcements,reports:byName.reports,staged:byName.staged_charges,audit:byName.audit,permissions:byName.permissions,staff,opening:byName.settings[0]?.initialized?Number(byName.settings[0].opening_cents):null,openingDate:byName.settings[0]?.opening_date||null,units:unitData};
 }
 async logout(){const token=this.session?.access_token;this.clear();if(token)await this.raw('/auth/v1/logout?scope=local','POST',undefined,token);}
}
