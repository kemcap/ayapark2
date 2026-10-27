// AYAPARK 2: manual WhatsApp onboarding, no resident email required.
// Deploy verify_jwt=false. create validates manager bearer; inspect/activate validate a single-use secret.
import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
const origins=new Set((Deno.env.get('AY_INVITE_ALLOWED_ORIGINS')||'https://kemcap.github.io,https://ayapark2-v2-private.kemcap.chatgpt.site').split(',').filter(Boolean));
const appUrl=Deno.env.get('AY_INVITE_APP_URL')||'https://kemcap.github.io/ayapark2/';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const day=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const normalizedPhone=(input:unknown)=>{
 const source=String(input||'').trim();
 if(!/^[+()\d\s./-]+$/.test(source))return '';
 let digits=source.replace(/\D/g,'');
 if(digits.startsWith('00'))digits=digits.slice(2);
 if(digits.length===10&&digits.startsWith('5'))digits='90'+digits;
 else if(digits.length===11&&digits.startsWith('05'))digits='90'+digits.slice(1);
 return /^[1-9]\d{9,14}$/.test(digits)?'+'+digits:'';
};
const eligible=(r:{role:string,starts_on:string|null,archive_reason?:string|null})=>
 ['owner','tenant','representative'].includes(r.role)&&r.archive_reason!=='mistake'&&(!r.starts_on||r.starts_on<=day());
const emailAlias=(phone:string)=>'resident-'+phone.slice(1)+'@ayapark2.invalid';
const b64url=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function sha256(value:string){
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
 return Array.from(hash,b=>b.toString(16).padStart(2,'0')).join('');
}
Deno.serve(async req=>{
 const origin=req.headers.get('Origin')||'';
 const headers={
  'Access-Control-Allow-Origin':origins.has(origin)?origin:'https://kemcap.github.io',
  'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','Vary':'Origin'
 };
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!origins.has(origin))return reply({error:'forbidden_origin'},403);
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
 try{
  if(Deno.env.get('ENABLE_INVITATIONS_V2')!=='true')return reply({error:'not_configured'},503);
  if(!origins.has(new URL(appUrl).origin)||new URL(appUrl).protocol!=='https:')return reply({error:'not_configured'},503);
  const reader=req.body?.getReader();if(!reader)return reply({error:'invalid_request'},400);
  const chunks:Uint8Array[]=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();return reply({error:'request_too_large'},413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const raw=new TextDecoder().decode(bytes);
  const input=JSON.parse(raw);
  const action=String(input?.action||'');
  if(!['create','inspect','activate','revoke'].includes(action))return reply({error:'invalid_request'},400);
  const url=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!service)return reply({error:'server_unavailable'},503);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  if(action==='inspect'||action==='activate'){
   const token=String(input.token||'');
   if(!/^[A-Za-z0-9_-]{40,90}$/.test(token))return reply({error:'expired_or_invalid'},410);
   const token_hash=await sha256(token);
   for(const [bucket,limit] of [['global:'+await sha256('invite-global'),300],['phone:'+await sha256('invite:'+token),20]] as const){const {data:allowed,error}=await admin.rpc('ay_auth_login_limit',{p_bucket:bucket,p_limit:limit});if(error)return reply({error:'invitation_failed'},503);if(!allowed)return reply({error:'try_later'},429);}
   const {data:ticket,error:tokenError}=await admin.from('ay3_invite_tokens')
    .select('site_id,person_id,unit_id,issued_by,phone_e164,email,expires_at,consumed_at,revoked_at')
    .eq('token_hash',token_hash).maybeSingle();
   if(tokenError)return reply({error:'invitation_failed'},500);
   if(!ticket||ticket.consumed_at||ticket.revoked_at||new Date(ticket.expires_at).getTime()<=Date.now())
    return reply({error:'expired_or_invalid'},410);
   const {data:person}=await admin.from('ay3_persons')
    .select('id,first_name,auth_user_id,archived_at').eq('id',ticket.person_id).eq('site_id',ticket.site_id).maybeSingle();
   if(!person||person.auth_user_id)return reply({error:'invite_unavailable'},410);
   const {data:roles}=await admin.from('ay3_links').select('role,active,starts_on,ends_on,archive_reason')
    .eq('site_id',ticket.site_id).eq('person_id',ticket.person_id).eq('unit_id',ticket.unit_id);
   if(!(roles||[]).some(eligible))return reply({error:'invite_unavailable'},410);
   const {data:staff}=await admin.from('site_staff_memberships').select('role')
    .eq('site_id',ticket.site_id).eq('user_id',ticket.issued_by).eq('role','manager').maybeSingle();
   if(!staff)return reply({error:'invite_unavailable'},410);
   if(action==='inspect'){
     return reply({valid:true,first_name:String(person.first_name||'').slice(0,70),
      phone_hint:ticket.phone_e164?'••'+ticket.phone_e164.slice(-3):'••@'+String(ticket.email).split('@')[1],
      expires_at:ticket.expires_at});
   }
   const password=String(input.password||'');
   if([...password].length<6||[...password].length>256)return reply({error:'weak_password'},400);
   // A dummy internal email identifier is used for password auth; residents never supply an email.
   // The manual WhatsApp invitation is NOT independent proof of ownership of this phone number.
   const {data:created,error:createError}=await admin.auth.admin.createUser({
    email:ticket.email||emailAlias(ticket.phone_e164),email_confirm:true,password
   });
   if(createError||!created.user)return reply({error:'account_exists_or_unavailable'},409);
   const userId=created.user.id;
   if(created.user.email?.toLowerCase()!==(ticket.email||emailAlias(ticket.phone_e164)).toLowerCase())return reply({error:'activation_reconciliation_required'},409);
   try{
    const {data:bound,error:bindError}=await admin.rpc('ay3_redeem_phone_invite',{p_token_hash:token_hash,p_user:userId});
    if(bindError||!bound?.ok)throw Error('bind_failed');
   }catch{
    // A failed RPC response can hide a COMMITTED binding. Never delete the new Auth user here.
    // Quarantine for operator reconciliation; no blind retry that could overwrite another account.
    const {data:linked}=await admin.from('ay3_persons').select('auth_user_id').eq('id',ticket.person_id).eq('site_id',ticket.site_id).maybeSingle();
    if(linked?.auth_user_id!==userId)return reply({error:'activation_reconciliation_required'},409);
   }
   return reply({ok:true,phone:ticket.phone_e164,identifier:ticket.email||ticket.phone_e164});
  }
  const bearer=/^Bearer\s+(.+)$/i.exec(req.headers.get('Authorization')||'')?.[1];
  if(!bearer)return reply({error:'sign_in_required'},401);
  const {data:identity,error:authError}=await admin.auth.getUser(bearer);
  if(authError||!identity.user)return reply({error:'invalid_session'},401);
  const personId=String(input.person_id||'');
  const phone=normalizedPhone(input.phone);
  const email=input.contact_kind==='email'?String(input.email||'').trim().toLowerCase():'';
  const emailMode=input.contact_kind==='email';
  if(!uuid.test(personId))return reply({error:'invalid_person'},400);
  if(action==='create'&&emailMode&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254))return reply({error:'invalid_email'},400);
  if(action==='create'&&!emailMode&&!phone)return reply({error:'invalid_phone'},400);
  if(input.confirmed!==true)return reply({error:'confirmation_required'},400);
  const {data:person}=await admin.from('ay3_persons')
   .select('id,site_id,auth_user_id,archived_at').eq('id',personId).maybeSingle();
  if(!person)return reply({error:'invalid_person'},404);
  const {data:staff}=await admin.from('site_staff_memberships').select('role')
   .eq('site_id',person.site_id).eq('user_id',identity.user.id).eq('role','manager').maybeSingle();
  if(!staff)return reply({error:'access_denied'},403);
  if(action==='revoke'){const {error}=await admin.rpc('ay_auth_revoke_invites',{p_actor:identity.user.id,p_person:personId});return error?reply({error:'invitation_failed'},409):reply({ok:true});}
  if(person.auth_user_id)return reply({error:'already_activated'},409);
  const {data:roles,error:rolesError}=await admin.from('ay3_links')
   .select('unit_id,role,active,starts_on,ends_on,archive_reason')
   .eq('site_id',person.site_id).eq('person_id',personId);
  if(rolesError)return reply({error:'invitation_failed'},500);
  const role=(roles||[]).find(eligible);
  if(!role)return reply({error:'active_apartment_required'},409);
  const token=b64url(crypto.getRandomValues(new Uint8Array(32)));
  const token_hash=await sha256(token);
  const {data:expires_at,error:insertError}=await admin.rpc(emailMode?'ay_auth_issue_email_invite':'ay_auth_issue_invite',{p_actor:identity.user.id,p_person:personId,...(emailMode?{p_email:email}:{p_phone:phone}),p_hash:token_hash});
  if(insertError)return reply({error:'invitation_failed'},409);
  return reply({url:appUrl+'?invite='+encodeURIComponent(token),expires_at});
 }catch{
  return reply({error:'invitation_failed'},500);
 }
});
