import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {adminRecoveryHandler} from './handler.mjs';
const url=Deno.env.get('SUPABASE_URL')||'',key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',secret=Deno.env.get('AY_AUTH_RATE_SECRET')||'';
const client=createClient(url||'https://unconfigured.invalid',key||'disabled',{auth:{persistSession:false,autoRefreshToken:false}});
async function rpc(name:string,args:Record<string,unknown>){const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
Deno.serve(adminRecoveryHandler({enabled:Deno.env.get('ENABLE_ADMIN_RECOVERY')==='true'&&!!url&&!!key&&secret.length>=32,origins:new Set((Deno.env.get('AY_AUTH_ALLOWED_ORIGINS')||'').split(',').filter(Boolean)),resetUrl:Deno.env.get('AY_AUTH_RESET_URL')||'',
 hash:async(v:string)=>{const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(v)))].map(n=>n.toString(16).padStart(2,'0')).join('');},
 admin:{user:async(t:string)=>{const {data,error}=await client.auth.getUser(t);return error?null:data.user;},
 limit:(b:string,l:number)=>rpc('ay_auth_login_limit',{p_bucket:b,p_limit:l}),
 authorize:(a:string,p:string,r:string,c:boolean,staff:boolean)=>rpc('ay_auth_recovery_authorize_v2',{p_actor:a,p_person:p,p_reason:r,p_confirmed:c,p_staff_confirmed:staff}),
 account:async(id:string)=>{const {data,error}=await client.auth.admin.getUserById(id);if(error)throw error;return data.user;},
 generate:async(email:string)=>{const {data,error}=await client.auth.admin.generateLink({type:'recovery',email});if(error)throw error;return data;},
 issued:(a:string,p:string,u:string,staff:boolean)=>rpc('ay_auth_recovery_issued_v2',{p_actor:a,p_person:p,p_user:u,p_staff_confirmed:staff})}
}));
