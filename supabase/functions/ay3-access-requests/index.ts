import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {accessRequestHandler} from './handler.mjs';
const url=Deno.env.get('SUPABASE_URL')||'',key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',secret=Deno.env.get('AY_AUTH_RATE_SECRET')||'',site=Deno.env.get('AY_ACCESS_SITE_ID')||'';
const client=createClient(url||'https://unconfigured.invalid',key||'disabled',{auth:{persistSession:false,autoRefreshToken:false}});
async function rpc(name:string,args:Record<string,unknown>){const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
Deno.serve(accessRequestHandler({enabled:Deno.env.get('ENABLE_ACCESS_REQUESTS')==='true'&&secret.length>=32&&!!site&&!!url&&!!key,site,origins:new Set((Deno.env.get('AY_AUTH_ALLOWED_ORIGINS')||'').split(',').filter(Boolean)),
 ip:(r:Request)=>Deno.env.get('AY_AUTH_TRUST_INGRESS_IP')==='true'?r.headers.get('x-forwarded-for')?.split(',')[0]?.trim():null,
 hash:async(v:string)=>{const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(v)))].map(n=>n.toString(16).padStart(2,'0')).join('');},
 admin:{user:async(t:string)=>{const {data,error}=await client.auth.getUser(t);return error?null:data.user;},limit:(b:string,l:number)=>rpc('ay_auth_login_limit',{p_bucket:b,p_limit:l}),submit:(s:string,p:Record<string,string>)=>rpc('ay_access_submit',{p_site:s,p_first:p.first_name,p_last:p.last_name,p_kind:p.contact_kind,p_contact:p.contact,p_unit:p.unit_hint}),list:(s:string,a:string,offset:number)=>rpc('ay_access_list',{p_site:s,p_actor:a,p_offset:offset}),update:(s:string,a:string,p:Record<string,unknown>)=>rpc('ay_access_update',{p_site:s,p_actor:a,p_id:p.id,p_version:p.version,p_action:p.action,p_person:p.person_id||null,p_confirm:p.confirmed===true})}
}));
