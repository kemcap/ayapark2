import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {passwordLoginHandler} from './handler.mjs';
const url=Deno.env.get('SUPABASE_URL')||'',key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const publishable=Deno.env.get('AY_AUTH_PUBLISHABLE_KEY')||'';
const secret=Deno.env.get('AY_AUTH_RATE_SECRET')||'';
const origins=new Set((Deno.env.get('AY_AUTH_ALLOWED_ORIGINS')||'').split(',').filter(Boolean));
const admin=createClient(url||'https://unconfigured.invalid',key||'disabled',{auth:{persistSession:false,autoRefreshToken:false}});
async function rpc(name:string,args:Record<string,unknown>){const {data,error}=await admin.rpc(name,args);if(error)throw error;return data;}
Deno.serve(passwordLoginHandler({
 enabled:Deno.env.get('ENABLE_VERIFIED_PHONE_LOGIN')==='true'&&!!url&&!!key&&!!publishable&&secret.length>=32&&origins.size>0,
 origins,
 // The named header must be overwritten by a trusted ingress, never supplied by arbitrary callers.
 // Default off until the staging ingress has been verified. Origin checks are not a rate limiter.
 clientIp:(req:Request)=>Deno.env.get('AY_AUTH_TRUST_INGRESS_IP')==='true'?req.headers.get('x-forwarded-for')?.split(',')[0]?.trim():null,
 hash:async(value:string)=>{const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(value));return [...new Uint8Array(sig)].map(n=>n.toString(16).padStart(2,'0')).join('');},
 admin:{
  user:async(token:string)=>{const {data,error}=await admin.auth.getUser(token);return error?null:data.user;},
  account:async(id:string)=>{const {data,error}=await admin.auth.admin.getUserById(id);if(error)throw error;return data.user;},
  lookup:(phone:string)=>rpc('ay_auth_phone_lookup',{p_phone:phone}),
  limit:(bucket:string,limit:number)=>rpc('ay_auth_login_limit',{p_bucket:bucket,p_limit:limit}),
  bind:(p:{actor:string,person:string,phone:string,reason:string,active:boolean})=>rpc('ay_auth_bind_phone',{p_actor:p.actor,p_person:p.person,p_phone:p.phone,p_reason:p.reason,p_active:p.active})
 },
 signIn:async(email:string,password:string)=>{
  const response=await fetch(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:publishable,'Content-Type':'application/json'},body:JSON.stringify({email,password}),signal:AbortSignal.timeout(15000)});
  const result=await response.json();return response.ok?result:null;
 }
}));
