// AYAPARK 2 — invitation links are *not* authentication credentials.
// Deploy with verify_jwt=false: 'inspect' is public; 'create' authenticates explicitly.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const origins = new Set(['https://kemcap.github.io', 'https://ayapark2-v2-private.kemcap.chatgpt.site']);
const appOrigin = 'https://kemcap.github.io/ayapark2/';
const encoder = new TextEncoder();
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const lifetimeSeconds = 48 * 60 * 60;
const today = () => new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

const b64url = (bytes:Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
function unbase64(text:string) {
 if(!/^[a-zA-Z0-9_-]+$/.test(text))throw Error('bad_token');
 const decoded = atob(text.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-text.length%4)%4));
 return Uint8Array.from(decoded, c=>c.charCodeAt(0));
}
async function signingKey() {
 const secret = Deno.env.get('AY2_INVITE_SIGNING_KEY') || '';
 if(secret.length < 32)throw Error('missing_signing_key');
 return crypto.subtle.importKey('raw',encoder.encode(secret),'HMAC',false,['sign','verify']);
}
async function sign(value:{v:number,person:string,site:string,unit:string,exp:number}) {
 const body=b64url(encoder.encode(JSON.stringify(value)));
 const sig=new Uint8Array(await crypto.subtle.sign('HMAC',await signingKey(),encoder.encode(body)));
 return body+'.'+b64url(sig);
}
async function verify(token:string) {
 const parts=token.split('.');
 if(parts.length!==2||token.length>2048)throw Error('bad_token');
 const [body,signature]=parts;
 const valid=await crypto.subtle.verify('HMAC',await signingKey(),unbase64(signature),encoder.encode(body));
 if(!valid)throw Error('bad_token');
 const value=JSON.parse(new TextDecoder().decode(unbase64(body)));
 if(value.v!==1||!idPattern.test(value.person)||!idPattern.test(value.site)||!idPattern.test(value.unit)||
   !Number.isSafeInteger(value.exp)||value.exp<=Math.floor(Date.now()/1000)||
   value.exp>Math.floor(Date.now()/1000)+lifetimeSeconds)throw Error('expired_token');
 return value as {v:1,person:string,site:string,unit:string,exp:number};
}
function isActive(link:{starts_on:string|null,ends_on:string|null,role:string},day:string) {
 return ['owner','tenant'].includes(link.role) && (!link.starts_on||link.starts_on<=day) && (!link.ends_on||link.ends_on>=day);
}
Deno.serve(async req=>{
 const origin=req.headers.get('Origin')||'';
 const cors={
  'Access-Control-Allow-Origin':origins.has(origin)?origin:'https://kemcap.github.io',
  'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods':'POST,OPTIONS', 'Vary':'Origin',
  'Content-Type':'application/json;charset=utf-8', 'Cache-Control':'no-store'
 };
 const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
 if(origin&&!origins.has(origin))return respond({error:'forbidden_origin'},403);
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return respond({error:'method_not_allowed'},405);
 try {
  const raw=await req.text();
  if(raw.length>8192)return respond({error:'request_too_large'},413);
  const input=JSON.parse(raw);
  const action=String(input?.action||'');
  if(!['create','inspect'].includes(action))return respond({error:'invalid_request'},400);
  const url=Deno.env.get('SUPABASE_URL');
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!serviceKey)return respond({error:'server_unavailable'},503);
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});

  if(action==='inspect'){
   let signed:{v:1,person:string,site:string,unit:string,exp:number};
   try{signed=await verify(String(input.token||''));}
   catch(err){return respond({error:err instanceof Error && err.message==='missing_signing_key'?'not_configured':'expired_or_invalid'},err instanceof Error && err.message==='missing_signing_key'?503:410);}
   const {data:person,error}=await admin.from('ay3_persons').select('id,site_id,first_name,auth_user_id').eq('id',signed.person).eq('site_id',signed.site).maybeSingle();
   if(error||!person?.auth_user_id)return respond({error:'invite_unavailable'},410);
   const {data:links,error:linksError}=await admin.from('ay3_links').select('unit_id,role,starts_on,ends_on').eq('person_id',person.id).eq('site_id',signed.site).eq('unit_id',signed.unit);
   if(linksError||!(links||[]).some(l=>isActive(l,today())))return respond({error:'invite_unavailable'},410);
   const {data:unit}=await admin.from('site_units').select('code').eq('id',signed.unit).eq('site_id',signed.site).maybeSingle();
   return respond({valid:true,first_name:String(person.first_name||'').slice(0,70),unit_code:String(unit?.code||'AYAPARK 2'),expires_at:new Date(signed.exp*1000).toISOString()});
  }

  const bearer=/^Bearer\s+(.+)$/i.exec(req.headers.get('Authorization')||'')?.[1];
  if(!bearer)return respond({error:'sign_in_required'},401);
  const {data:identity,error:authError}=await admin.auth.getUser(bearer);
  if(authError||!identity.user)return respond({error:'invalid_session'},401);
  const personId=String(input.person_id||'');
  if(!idPattern.test(personId))return respond({error:'invalid_person'},400);
  const {data:person,error:personError}=await admin.from('ay3_persons').select('id,site_id,auth_user_id').eq('id',personId).maybeSingle();
  if(personError||!person)return respond({error:'invalid_person'},404);
  const {data:permission,error:permissionError}=await admin.from('site_staff_memberships')
   .select('role').eq('site_id',person.site_id).eq('user_id',identity.user.id).eq('role','manager').maybeSingle();
  if(permissionError||!permission)return respond({error:'access_denied'},403);
  if(!person.auth_user_id)return respond({error:'provision_access_first'},409);
  const {data:links,error:linksError}=await admin.from('ay3_links')
   .select('unit_id,role,starts_on,ends_on').eq('site_id',person.site_id).eq('person_id',person.id);
  if(linksError)return respond({error:'invalid_person'},400);
  const link=(links||[]).find(l=>isActive(l,today()));
  if(!link)return respond({error:'active_apartment_required'},409);
  await signingKey(); // Fail before constructing a link if the server has no configured HMAC secret.
  const exp=Math.floor(Date.now()/1000)+lifetimeSeconds;
  const token=await sign({v:1,person:person.id,site:person.site_id,unit:link.unit_id,exp});
  return respond({url:appOrigin+'?invite='+encodeURIComponent(token),expires_at:new Date(exp*1000).toISOString()});
 }catch(error){
  if(error instanceof Error && error.message==='missing_signing_key')return respond({error:'not_configured'},503);
  return respond({error:'invitation_failed'},500);
 }
});
