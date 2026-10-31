import {archivePath,MAX_DOCUMENT_BYTES} from './archive-files.mjs?v=5.9.42';
import {classifyIdentifier,newPasswordError} from './auth-policy.mjs?v=5.8.1';
import {ENABLE_VERIFIED_PHONE_LOGIN} from './auth-features.mjs?v=5.8.1';
import {t as tr} from './i18n.mjs?v=5.9.28';
// Existing site tables are read-only; V2 mutations use a checked transactional RPC.
const URL='https://eisozwhhinqszfikemot.supabase.co';
const KEY='sb_publishable_KGkvInvbdFRRF0716v9AuQ_fZjwkkBc';
export function loginIdentifier(input){
 const raw=String(input||'').trim();
 if(raw.includes('@'))return raw;
 if(!/^[+()\d\s./-]+$/.test(raw))return raw;
 let digits=raw.replace(/\D/g,'');
 if(digits.startsWith('00'))digits=digits.slice(2);
 if(digits.length===10&&digits.startsWith('5'))digits='90'+digits;
 else if(digits.length===11&&digits.startsWith('05'))digits='90'+digits.slice(1);
 return /^[1-9]\d{9,14}$/.test(digits)?'resident-'+digits+'@ayapark2.invalid':raw;
}
const TABLES=new Set(['site_sites','site_units','site_blocks','site_staff_memberships','site_resident_units','ay2_settings','ay2_permissions','ay2_entries','ay2_charges','ay2_allocations','ay2_people','ay2_announcements','ay2_reports','ay2_audit','ay2_staged_charges','ay2_devir_snapshot']);
export class AyaparkApi {
 constructor(fetcher=(...args)=>globalThis.fetch(...args),{persist=true,storage,previewOnly=false,verifiedPhoneLogin=ENABLE_VERIFIED_PHONE_LOGIN}={}) {
  this.verifiedPhoneLogin=verifiedPhoneLogin;this.previewOnly=previewOnly;this.fetcher=fetcher;this.generation=0;this.session=null;this.expiry=0;this.refreshing=null;
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
 async siteClaims(){return this.raw('/functions/v1/ay3-site-open-claims','POST',{},await this.token());}
 async accessRequests(payload,authenticated=false){return this.raw('/functions/v1/ay3-access-requests','POST',payload,authenticated?await this.token():undefined);}
 async provision(payload){return this.raw('/functions/v1/ay3-user-access','POST',payload,await this.token());}
 async invitation(payload,authenticated=false){return this.raw('/functions/v1/ay3-whatsapp-invite','POST',payload,authenticated?await this.token():undefined);}
 async storageDocument(path,{bytes,mime,signal}={}){
  if(this.previewOnly)throw Error(tr('Bu önizleme yalnızca örnek veriler kullanır. Canlı hesaba bağlanılmaz.'));
  archivePath(path);const uploading=bytes!==undefined;
  if(uploading&&(!(bytes instanceof Uint8Array)||bytes.byteLength<1||bytes.byteLength>MAX_DOCUMENT_BYTES))throw Error('Invalid document size');
  const generation=this.generation,token=await this.token(),controller=new AbortController(),abort=()=>controller.abort();
  const timer=setTimeout(abort,60000);if(signal?.aborted)abort();signal?.addEventListener('abort',abort,{once:true});
  try{
   const response=await this.fetcher(URL+'/storage/v1/object/'+(uploading?'':'authenticated/')+'ayapark2-documents/'+path,{method:uploading?'POST':'GET',headers:{apikey:KEY,Authorization:'Bearer '+token,...(uploading?{'Content-Type':mime,'x-upsert':'false'}:{})},body:uploading?new Blob([bytes],{type:mime}):undefined,credentials:'omit',cache:'no-store',signal:controller.signal});
   if(generation!==this.generation)throw Error(tr('Oturum değişti.'));
   if(uploading&&response.status===409)return {already_uploaded:true};
   if(!response.ok){const error=Error(tr(response.status===403?'Bu işlem için yetkiniz yok.':'Dosya işlemi tamamlanamadı.'));error.status=response.status;throw error;}
   if(uploading)return {uploaded:true};
   const length=Number(response.headers.get('content-length'));if(Number.isFinite(length)&&length>MAX_DOCUMENT_BYTES){abort();throw Error('Invalid document size');}
   const data=new Uint8Array(await response.arrayBuffer());if(generation!==this.generation)throw Error(tr('Oturum değişti.'));if(data.byteLength>MAX_DOCUMENT_BYTES)throw Error('Invalid document size');return data;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }
 async raw(path,method='GET',body,token) {
  if(this.previewOnly)throw Error(tr('Bu önizleme yalnızca örnek veriler kullanır. Canlı hesaba bağlanılmaz.'));
  const response=await this.fetcher(URL+path,{method,headers:{apikey:KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)});
  const data=await response.json().catch(()=>null);
  if(!response.ok){const announcementErrors={ay2_announcements_title_check:tr('Duyuru başlığı en fazla 150 karakter olabilir.'),ay2_announcements_body_check:tr('Duyuru metni en fazla 5000 karakter olabilir.'),ay2_announcements_check:tr('Yayın bitişi başlangıçtan sonra olmalıdır.')};const knownAnnouncement=Object.entries(announcementErrors).find(([constraint])=>String(data?.message).includes('\"'+constraint+'\"'))?.[1];
  const accessMessages={access_denied:'Yalnızca Süper Admin kullanıcı erişimi verebilir.',invalid_email:'Geçerli bir e-posta adresi girin.',apartment_required:'Sakin erişimi için önce güncel bir daire ilişkisi ekleyin.',account_mismatch:'Bu kişi başka bir hesaba bağlı. Hesap bağlantısını kontrol edin.',role_conflict:'Bu hesabın farklı bir yönetim rolü var. Mevcut rolü önce kontrol edin.',invalid_person:'Ad, soyad ve geçerli e-posta gerekli.',account_failed:'Hesap hazırlanamadı. Lütfen tekrar deneyin.',assignment_failed:'Erişim kaydedilemedi. Lütfen yöneticiye bildirin.',invalid_request:'Kişi, rol ve onay alanlarını kontrol edin.'};
  const phoneLoginMessages={invalid_credentials:'Telefon veya şifre geçersiz. Bilgilerinizi kontrol edin.',try_later:'Çok fazla deneme yapıldı. Biraz sonra tekrar deneyin.',not_enabled:'Telefonla giriş henüz kullanıma hazır değil. E-posta ile giriş yapın veya yönetime başvurun.',service_unavailable:'Giriş hizmetine şu anda ulaşılamıyor. Lütfen tekrar deneyin.'};
  const inviteMessages={invalid_email:'Geçerli bir e-posta adresi girin.',activation_reconciliation_required:'Hesabın durumu yönetim tarafından kontrol edilmelidir. Yeni bir hesap oluşturmayın.',weak_password:'En az 6 karakterli bir şifre kullanın.',invalid_phone:'Geçerli bir WhatsApp telefon numarası girin.',already_activated:'Bu kişinin hesabı zaten etkinleştirildi.',account_exists_or_unavailable:'Bu telefon numarası için zaten bir hesap var veya hesap oluşturulamadı.',recovery_confirmation_required:'Önceki hesap bulundu. Kimliği doğrulayın ve erişimi güvenli şekilde yenileyin.',account_already_linked_elsewhere:'Bu giriş bilgisi başka aktif hesaba veya kişiye bağlı. Otomatik birleştirme yapılamaz.',activation_failed:'Hesap etkinleştirilemedi. Yönetimden yeni bağlantı isteyin.',not_configured:'Davet bağlantısı hizmeti henüz sunucuda ayarlanmadı.',expired_or_invalid:'Davet bağlantısının süresi doldu veya bağlantı geçersiz.',invite_unavailable:'Bu davet artık geçerli değil.',active_apartment_required:'Bu kişi için güncel bir daire ilişkisi bulunamadı.',invitation_failed:'Davet bağlantısı oluşturulamadı.'};
  const error=Error((path.startsWith('/functions/v1/ay3-password-login')&&phoneLoginMessages[data?.error]?tr(phoneLoginMessages[data.error]):null)||(path.startsWith('/functions/v1/ay3-whatsapp-invite')&&inviteMessages[data?.error]?tr(inviteMessages[data.error]):null)||(path.startsWith('/functions/v1/ay3-user-access')&&accessMessages[data?.error]?tr(accessMessages[data.error]):null)||knownAnnouncement||(data?.code==='23514'&&String(data.message).includes('ay3_links_check')?tr('Çıkış tarihi başlangıç tarihinden önce olamaz.'):response.status===403?tr('Bu işlem için yetkiniz yok.'):path.startsWith('/auth/v1/')&&response.status===400?tr('Kod, e-posta veya şifre geçersiz olabilir. Tekrar kontrol edin.'):response.status===401?tr("Oturum sona erdi. Yeniden giriş yapın."):response.status===429?tr("Çok fazla deneme yapıldı. Biraz sonra tekrar deneyin."):(['P0001','42501'].includes(data?.code)?tr(data.message):tr("İşlem tamamlanamadı. Bağlantıyı, erişimi ve zorunlu alanları kontrol edin."))));error.status=response.status;error.code=data?.error;throw error;}
  return data;
 }
 accept(session,generation){
  if(generation!==this.generation)throw Error(tr("Oturum değişti. Yeniden giriş yapın."));
  if(!session?.access_token||!session.user?.id)throw Error(tr("Geçerli oturum alınamadı."));
  this.session=session;this.expiry=Date.now()+Number(session.expires_in??3600)*1000;this.persist();
 }
 async setPassword(password){
  if(!this.session)throw Error(tr('Giriş yapın.'));
  const problem=newPasswordError(password);if(problem)throw Error(tr(problem==='short'?'En az 6 karakter kullan.':'Şifre en fazla 256 karakter olabilir.'));
  const generation=this.generation,token=await this.token();
  const updated=await this.raw('/auth/v1/user','PUT',{password},token);
  if(generation!==this.generation)throw Error(tr('Oturum değişti.'));
  return updated;
 }
 async login(email,password){
  this.clear();const generation=this.generation;
  const identifier=classifyIdentifier(email);
  const session=this.verifiedPhoneLogin&&identifier?.kind==='phone'
   ?await this.raw('/functions/v1/ay3-password-login','POST',{identifier:identifier.value,password})
   :await this.raw('/auth/v1/token?grant_type=password','POST',{email:loginIdentifier(email),password});
  this.accept(session,generation);
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
  if(!['ay3_add_historical_assignment','ay3_closing_preview','ay3_closing_workspace','ay3_finalize_period','ay3_reopen_period','ay3_community_report_summaries','ay3_release_report','ay3_report_release_workspace','ay3_revoke_report_release','ay3_document_levy_review','ay3_levy_review_workspace','ay3_owner_levy_previews','ay3_share_levy_review','ay3_withdraw_levy_review','ay6_bind_budget_payment','ay6_budget_workspace','ay6_release_reserve','ay6_review_legacy_budget','ay6_save_budget_plan','ay6_unbind_budget_payment','ay6_archive_document','ay6_confirm_document','ay6_document_download','ay6_document_workspace','ay6_meeting_workspace','ay6_prepare_document','ay6_save_meeting','ay6_set_document_access','ay3_contact_workspace','ay3_request_contact_change','ay3_decide_contact_change','ay3_withdraw_contact_change','ay3_set_task_grants','ay3_draft_workspace','ay3_submit_charge_draft','ay3_decide_charge_draft','ay5_command','ay5_workspace','ay5_payment_plan','ay2_command','ay2_capabilities','ay2_workspace','ay3_financial_summary','ay3_provider_directory','ay3_preferences','ay3_review_state','ay3_review_selected','ay3_staff_directory','ay3_audit_page','ay3_remove_staff_member','ay3_manage_person','ay3_manage_person_v2'].includes(name))throw Error(tr("İşlem kapsam dışında."));
  const generation=this.generation,token=await this.token();
  const result=await this.raw('/rest/v1/rpc/'+name,'POST',body,token);
  if(generation!==this.generation)throw Error(tr("Oturum değişti."));return result;
 }
 async readAll(table,query){const generation=this.generation;let out=[];for(let offset=0;;offset+=1000){const rows=await this.read(table,query+'&limit=1000&offset='+offset);if(generation!==this.generation)throw Error(tr("Oturum değişti."));out.push(...rows);if(rows.length<1000)return out;}}
 async command(site,action,payload){if(action==='permissions'&&Array.isArray(payload.tasks))return this.rpc('ay3_set_task_grants',{p_site:site,p_user:payload.user_id,p_tasks:payload.tasks});if(['batch_charge','monthly_v5'].includes(action))return this.rpc('ay3_submit_charge_draft',{p_site:site,p_request:payload.request_id,p_action:action,p_payload:payload});return this.rpc(['batch_charge','monthly_v5','auto_allocate','monthly_exception','disable_exception','budget'].includes(action)?'ay5_command':'ay2_command',{p_site:site,p_action:action,p_payload:payload});}
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
  const [byName,summary,reviewState,staff,residentAccounts,siteClaims,devirSnapshot]=await Promise.all([this.rpc('ay5_workspace',{p_site:site.id}),this.rpc('ay3_financial_summary',{p_site:site.id}),this.rpc('ay3_review_state',{p_site:site.id}),role==='super'?this.rpc('ay3_staff_directory',{p_site:site.id}):Promise.resolve([]),role==='super'?this.readAll('site_resident_units',`select=user_id,unit_id&active=eq.true&unit_id=in.(${units.map(u=>u.id).join(',')})`):Promise.resolve([]),role==='resident'&&this.session?.access_token?this.siteClaims().catch(()=>null):Promise.resolve(null),this.read('ay2_devir_snapshot',`select=unit_id,source_row,source_name,source_role,source_date,source_period,categories,total_cents&site_id=eq.${sid}&order=source_row.asc`)]);
  assertSession();
  if(!byName)throw Error(tr("Çalışma alanı erişimi doğrulanamadı."));
  const [draftWorkspace,contactWorkspace]=await Promise.all([this.rpc('ay3_draft_workspace',{p_site:site.id}),this.rpc('ay3_contact_workspace',{p_site:site.id})]);
  const capabilities=byName.capabilities;
  if(!capabilities.people&&!capabilities.finance&&draftWorkspace?.tasks?.charges_prepare){byName.persons=draftWorkspace.preparation?.persons||[];byName.links=draftWorkspace.preparation?.links||[];byName.exceptions=draftWorkspace.preparation?.exceptions||[];}
  if(!capabilities.people)byName.providers=await this.rpc('ay3_provider_directory',{p_site:site.id});

  assertSession();
  const linksV3=byName.links||[],persons=(byName.persons||[]).map(p=>({...p,...(byName.person_access?.[p.id]||{})}));
  const ownPersonIds=[...new Set(persons.filter(p=>p.is_self===true||p.auth_user_id===this.session.user.id).map(p=>p.id))];
  // Unit access comes only from active, server-verified resident grants, not from historical person links.
  const transactions=byName.entries.map(t=>({...t,date:t.booked_on,desc:t.description,iban:t.sender_iban||'',cents:Number(t.cents)})).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
  const charges=byName.charges.map(c=>({...c,cents:Number(c.cents)})),allocations=byName.allocations.map(a=>({...a,cents:Number(a.cents)}));
  // Index once per response; repeated charge/allocation scans grow quadratically.
  const paidByCharge=new Map(),debtByUnit=new Map(),blockById=new Map(blocks.map(b=>[b.id,b.code]));
  for(const a of allocations)if(!a.void_reason)paidByCharge.set(a.charge_id,(paidByCharge.get(a.charge_id)||0)+a.cents);
  for(const c of charges)if(!c.void_reason)debtByUnit.set(c.unit_id,(debtByUnit.get(c.unit_id)||0)+c.cents-(paidByCharge.get(c.id)||0));
  // Keep labels for server-authorized personal history; do not add current unit grants.
  const historicalUnitIds=new Set(charges.filter(c=>ownPersonIds.includes(c.person_id)).map(c=>c.unit_id));
  const unitData=units.filter(u=>role!=='resident'||ownIds.includes(u.id)||historicalUnitIds.has(u.id)).map(u=>({...u,block:blockById.get(u.block_id)||'?',debt:capabilities.finance||ownIds.includes(u.id)?debtByUnit.get(u.id)||0:null}));
  return {contactWorkspace,taskGrants:draftWorkspace?.grants||[],taskCapabilities:draftWorkspace?.tasks||{},chargeDrafts:draftWorkspace?.drafts||[],communityAccess:byName.community_access,currentMember:byName.current_member,personalScope:byName.personal_scope===true,siteClaims,devirSnapshot:devirSnapshot.map(r=>({...r,total_cents:Number(r.total_cents),categories:Object.fromEntries(Object.entries(r.categories||{}).map(([k,v])=>[k,Number(v)]))})),v5:byName.v5,financialUnitIds:byName.personal_scope?[]:byName.v5?ownIds:[],exceptions:byName.exceptions||[],budget:byName.budget||null,reviewState,userId:this.session.user.id,persons,links:linksV3,occupancyChanges:byName.occupancy_changes||[],credits:(byName.credits||[]).map(c=>({...c,cents:Number(c.cents)})),ownPersonIds,matchRules:byName.match_rules||[],providers:byName.providers||[],providerNotes:byName.provider_notes||[],acknowledgements:byName.acknowledgements||[],residentAccounts:[...new Map(residentAccounts.filter(r=>r.user_id).map(r=>[r.user_id,{...r,label:(units.find(u=>u.id===r.unit_id)?.code||'')+' · '+r.user_id.slice(0,8)}])).values()],summaryDays:summary?.days||[],summaryOpening:summary?.opening_cents==null?null:Number(summary.opening_cents),summaryBalance:summary?.balance_cents==null?null:Number(summary.balance_cents),sourceLastDate:summary?.source_last_date,site,role,serverRole,ownIds,capabilities,transactions,charges,allocations,people:byName.people,announcements:byName.announcements,reports:byName.reports,staged:byName.staged_charges,audit:byName.audit,permissions:byName.permissions,staff,opening:byName.settings[0]?.initialized?Number(byName.settings[0].opening_cents):null,openingDate:byName.settings[0]?.opening_date||null,units:unitData};
 }
 async logout(){const token=this.session?.access_token;this.clear();if(token)await this.raw('/auth/v1/logout?scope=local','POST',undefined,token);}
}
