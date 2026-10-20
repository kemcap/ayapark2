// This V2 adapter only reads business data. No table mutation or RPC is exposed.
const URL='https://eisozwhhinqszfikemot.supabase.co';
const KEY='sb_publishable_KGkvInvbdFRRF0716v9AuQ_fZjwkkBc';
const TABLES=new Set(['site_sites','site_units','site_blocks','site_staff_memberships','site_resident_units']);
export class ReadonlyApi {
 constructor(fetcher=globalThis.fetch) {this.fetcher=fetcher;this.generation=0;this.clear();}
 clear(){this.generation++;this.session=null;this.expiry=0;this.refreshing=null;}
 async raw(path,method='GET',body,token) {
  const response=await this.fetcher(URL+path,{method,headers:{apikey:KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)});
  const data=await response.json().catch(()=>null);
  if(!response.ok){const error=Error(response.status===401?'Oturum sona erdi. Yeniden giriş yapın.':response.status===429?'Çok fazla deneme yapıldı. Biraz sonra tekrar deneyin.':'Bağlantı veya erişim doğrulanamadı. Bilgilerinizi kontrol edip tekrar deneyin.');error.status=response.status;throw error;}
  return data;
 }
 accept(session,generation){
  if(generation!==this.generation)throw Error('Oturum değişti. Yeniden giriş yapın.');
  if(!session?.access_token||!session.user?.id)throw Error('Geçerli oturum alınamadı.');
  this.session=session;this.expiry=Date.now()+Number(session.expires_in||3600)*1000;
 }
 async login(email,password){
  this.clear();const generation=this.generation;
  this.accept(await this.raw('/auth/v1/token?grant_type=password','POST',{email,password}),generation);
  const user=await this.raw('/auth/v1/user','GET',undefined,this.session.access_token);
  if(generation!==this.generation)throw Error('Oturum değişti.');
  if(!user?.id||user.id!==this.session.user.id)throw Error('Kimlik doğrulanamadı.');
  return user;
 }
 async token(){
  if(!this.session)throw Error('Giriş yapın.');
  if(this.expiry>Date.now()+60000)return this.session.access_token;
  if(!this.refreshing){
   const generation=this.generation;
   this.refreshing=this.raw('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:this.session.refresh_token}).then(s=>this.accept(s,generation)).finally(()=>{if(generation===this.generation)this.refreshing=null;});
  }
  await this.refreshing;
  if(!this.session)throw Error('Giriş yapın.');
  return this.session.access_token;
 }
 async read(table,query){
  if(!TABLES.has(table))throw Error('Bu tablo V2 okuma kapsamı dışında.');
  const generation=this.generation;
  const token=await this.token();
  const data=await this.raw(`/rest/v1/${table}?${query}`,'GET',undefined,token);
  if(generation!==this.generation)throw Error('Oturum değişti.');
  if(!Array.isArray(data))throw Error('Veri biçimi geçersiz.');
  return data;
 }
 async load(){
  const userId=encodeURIComponent(this.session?.user.id||'');
  const sites=await this.read('site_sites','select=id,name,slug&slug=eq.aya-park-2&limit=1');
  if(!sites.length){const error=Error('Ayapark 2 erişiminiz bulunamadı. Yöneticiye danışın.');error.status=403;throw error;}
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
  return {site,role,serverRole,ownIds,transactions:[],opening:null,units:units.filter(u=>role!=='resident'||ownIds.includes(u.id)).map(u=>({...u,block:blocks.find(b=>b.id===u.block_id)?.code||'?',debt:null}))};
 }
 async logout(){const token=this.session?.access_token;this.clear();if(token)await this.raw('/auth/v1/logout?scope=local','POST',undefined,token);}
}
