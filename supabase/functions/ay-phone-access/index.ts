import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {normalizePhone,maskPhone} from '../../../phone-auth.mjs';
const origin='https://kemcap.github.io';
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
Deno.serve(async(req:Request)=>{
 const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 const reply=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers});
 if(req.headers.get('Origin')&&req.headers.get('Origin')!==origin)return reply({error:'access_denied'},403);
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply({error:'invalid_request'},405);
 // Fail closed until paid provider, closed signup and rate limits are configured.
 if(Deno.env.get('PHONE_ACCESS_ENABLED')!=='true')return reply({error:'phone_access_disabled'},503);
 try{
  const url=Deno.env.get('SUPABASE_URL')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,key=Deno.env.get('SUPABASE_ANON_KEY')!;
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const body=await req.json(),action=body.action;
  const rpc=async(name:string,args:Record<string,unknown>)=>{const {data,error}=await admin.rpc(name,args);if(error||!data)throw Error('invalid_invitation');return data;};
  if(action==='issue'||action==='revoke'){
   const bearer=/^Bearer (.+)$/i.exec(req.headers.get('Authorization')||'')?.[1];
   const {data,error}=await admin.auth.getUser(bearer||'');if(error||!data.user)return reply({error:'access_denied'},403);
   if(body.confirmation!==true)return reply({error:'invalid_request'},400);
   const target=await rpc('ay_phone_target',{p_actor:data.user.id,p_person:body.person_id});
   if(action==='revoke'){await rpc('ay_phone_revoke',{p_actor:data.user.id,p_person:body.person_id});return reply({ok:true});}
   let userId=target.user_id;
   if(userId){
    const {data:u,error}=await admin.auth.admin.getUserById(userId);if(error||!u.user)throw Error('account_conflict');
    if(!u.user.phone){const {error}=await admin.auth.admin.updateUserById(userId,{phone:target.phone,phone_confirm:false});if(error)throw error;}
   }else{
    const {data:u,error}=await admin.auth.admin.createUser({phone:target.phone,phone_confirm:false,app_metadata:{ay_phone_pending_person:body.person_id}});if(error||!u.user)throw Error('account_conflict');userId=u.user.id;
   }
   const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
   await rpc('ay_phone_issue',{p_actor:data.user.id,p_person:body.person_id,p_user:userId,p_hash:await digest(token)});
   const link=`${origin}/ayapark2/phone.html#invite=${token}`;
   return reply({link,whatsapp:`https://wa.me/${target.phone.slice(1)}?text=${encodeURIComponent('AYAPARK 2: '+link)}`,masked_phone:maskPhone(target.phone)});
  }
  const login=action==='login_send'||action==='login_verify';
  if(!login&&!/^[a-f0-9]{64}$/.test(body.invite||''))throw Error('invalid_invitation');
  const hash=login?'':await digest(body.invite);
  const target=login?await rpc('ay_phone_login',{p_phone:normalizePhone(body.phone)}):await rpc('ay_phone_invitation',{p_hash:hash,p_action:'resolve'});
  if(action==='resolve')return reply({masked_phone:maskPhone(target.phone)});
  if(action==='send'||action==='login_send'){
   if(!['whatsapp','sms'].includes(body.channel))return reply({error:'invalid_request'},400);
   if(login)await rpc('ay_phone_login',{p_phone:target.phone,p_action:'send'});else await rpc('ay_phone_invitation',{p_hash:hash,p_action:'send'});
   const {error}=await client.auth.signInWithOtp({phone:target.phone,options:{shouldCreateUser:false,channel:body.channel,captchaToken:body.captcha_token}});if(error)return reply({error:'code_not_sent'},429);
   return reply({ok:true});
  }
  if(action==='verify'||action==='login_verify'){
   if(!/^\d{6}$/.test(body.code||''))throw Error('invalid_code');
   if(login)await rpc('ay_phone_login',{p_phone:target.phone,p_action:'attempt'});else await rpc('ay_phone_invitation',{p_hash:hash,p_action:'attempt'});
   const {data,error}=await client.auth.verifyOtp({phone:target.phone,token:body.code,type:'sms'});
   if(error||!data.session||data.user?.id!==target.user_id)throw Error('invalid_code');
   if(login)await rpc('ay_phone_login',{p_phone:target.phone});
   else await rpc('ay_phone_invitation',{p_hash:hash,p_action:'complete',p_user:data.user.id});
   return reply({session:data.session});
  }
  return reply({error:'invalid_request'},400);
 }catch{return reply({error:'phone_access_failed'},400);}
});
