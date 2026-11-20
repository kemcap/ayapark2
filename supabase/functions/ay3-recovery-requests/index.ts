import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
const url=Deno.env.get('SUPABASE_URL')||'',service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',
 secret=Deno.env.get('AY_AUTH_RATE_SECRET')||'',site=Deno.env.get('AY_ACCESS_SITE_ID')||'';
const admin=createClient(url||'https://unconfigured.invalid',service||'disabled',{auth:{persistSession:false,autoRefreshToken:false}});
const origins=new Set((Deno.env.get('AY_AUTH_ALLOWED_ORIGINS')||'').split(',').filter(Boolean));
const enabled=Boolean(url&&service&&secret.length>=32&&/^[a-f0-9-]{36}$/i.test(site));
const bytes=new TextEncoder();
async function signed(value:string){
 const key=await crypto.subtle.importKey('raw',bytes.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,bytes.encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function rpc(name:string,args:Record<string,unknown>){const r=await admin.rpc(name,args);if(r.error)throw r.error;return r.data;}
function reply(status:number,data:Record<string,unknown>,origin:string){
 return new Response(JSON.stringify(data),{status,headers:{
 'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Vary':'Origin',
 ...(origins.has(origin)?{'Access-Control-Allow-Origin':origin}:{}) ,
 'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}});
}
Deno.serve(async req=>{
 const origin=req.headers.get('Origin')||'';
 if(origin&&!origins.has(origin))return reply(403,{error:'access_denied'},origin);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Vary':'Origin','Access-Control-Allow-Origin':origins.has(origin)?origin:'','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}});
 if(req.method!=='POST')return reply(405,{error:'invalid_request'},origin);
 if(!enabled)return reply(503,{error:'not_enabled'},origin);
 let body:any;
 try{
  const reader=req.body?.getReader();if(!reader)return reply(400,{error:'invalid_request'},origin);
  const chunks:Uint8Array[]=[];let n=0;
  while(true){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>2048){await reader.cancel();return reply(413,{error:'invalid_request'},origin);}chunks.push(value);}
  const total=new Uint8Array(n);let pos=0;for(const chunk of chunks){total.set(chunk,pos);pos+=chunk.length;}
  body=JSON.parse(new TextDecoder().decode(total));
  if(!body||typeof body!=='object'||Array.isArray(body))return reply(400,{error:'invalid_request'},origin);
 }catch{return reply(400,{error:'invalid_request'},origin);}
 if(body.action==='submit'){
  const phone=body.phone;
  if(typeof phone!=='string'||!/^\+[1-9][0-9]{9,14}$/.test(phone))return reply(400,{error:'invalid_request'},origin);
  const ip=Deno.env.get('AY_AUTH_TRUST_INGRESS_IP')==='true'?
   req.headers.get('x-forwarded-for')?.split(',')[0]?.trim():null;
  if(!ip)return reply(503,{error:'not_enabled'},origin);
  try{
   const buckets=[['recovery-global:'+await signed('all'),100],['recovery-ip:'+await signed('ip:'+ip),5],['recovery-phone:'+await signed('phone:'+phone),3]] as const;
   for(const [bucket,limit] of buckets){if(!await rpc('ay_auth_login_limit',{p_bucket:bucket,p_limit:limit}))return reply(429,{error:'try_later'},origin);}
   const id=await rpc('ay_recovery_request_submit',{p_site:site,p_phone:phone});
   // No existence information is ever exposed. Only a new valid request creates a notification.
   if(id){
    try{
     const ts=Date.now(),signature=await signed(String(id)+':'+ts);
     await fetch(url+'/functions/v1/ay10-web-push-send',{method:'POST',
      headers:{Authorization:'Bearer '+service,apikey:service,'Content-Type':'application/json'},
      body:JSON.stringify({kind:'phone_recovery',request_id:id,ts,signature})});
    }catch{/* The saved pending request remains visible even if push is unavailable. */}
   }
   return reply(200,{ok:true},origin);
  }catch{return reply(500,{error:'server_error'},origin);}
 }
 const auth=/^Bearer (.+)$/i.exec(req.headers.get('Authorization')||'')?.[1];
 if(!auth)return reply(401,{error:'access_denied'},origin);
 const {data,error}=await admin.auth.getUser(auth);
 if(error||!data.user)return reply(401,{error:'access_denied'},origin);
 try{
  if(body.action==='list'){
   return reply(200,await rpc('ay_recovery_request_list',{p_site:site,p_actor:data.user.id}),origin);
  }
  if(body.action==='update'&&typeof body.id==='string'&&/^[a-f0-9-]{36}$/i.test(body.id)&&['completed','rejected'].includes(body.status)){
   const updated=await rpc('ay_recovery_request_update',{p_site:site,p_actor:data.user.id,p_id:body.id,p_action:body.status});
   return reply(updated?200:409,{ok:!!updated},origin);
  }
  return reply(400,{error:'invalid_request'},origin);
 }catch(err:any){
  return reply(err?.code==='42501'?403:409,{error:'request_failed'},origin);
 }
});
