import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
const origins=new Set(['https://kemcap.github.io','https://ayapark2-v2-private.kemcap.chatgpt.site']);
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('Origin')||'';
 const headers={'Access-Control-Allow-Origin':origins.has(origin)?origin:'https://kemcap.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Content-Type':'application/json','Cache-Control':'no-store'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!origins.has(origin))return reply({error:'Forbidden origin'},403);
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const bearer=/^Bearer\s+(.+)$/i.exec(req.headers.get('Authorization')||'')?.[1];
 if(!bearer)return reply({error:'Sign in required'},401);
 try{
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:identity,error:authError}=await admin.auth.getUser(bearer);
  if(authError||!identity.user)return reply({error:'Invalid session'},401);
  const body=await req.json(),person=String(body.person_id||''),role=String(body.access_role||'resident');
  if(!/^[0-9a-f-]{36}$/i.test(person)||!['resident','deputy','manager'].includes(role)||body.confirmation!==true)return reply({error:'Invalid request'},400);
  const {data:target,error:targetError}=await admin.rpc('ay3_access_target',{p_actor:identity.user.id,p_person:person,p_role:role});
  if(targetError||!target)return reply({error:'Access denied or person not ready'},403);
  let userId=target.user_id;
  if(!userId){
   // No email is sent here. The user proves ownership with an OTP at first login.
   const {data:created,error:createError}=await admin.auth.admin.createUser({email:target.email,email_confirm:false});
   if(createError||!created.user){
    const retry=await admin.rpc('ay3_access_target',{p_actor:identity.user.id,p_person:person,p_role:role});userId=retry.data?.user_id;
    if(!userId)return reply({error:'Account could not be prepared'},502);
   }else userId=created.user.id;
  }
  const {error}=await admin.rpc('ay3_provision_access',{p_actor:identity.user.id,p_person:person,p_user:userId,p_role:role});
  if(error)return reply({error:'Access could not be assigned'},409);
  return reply({ok:true});
 }catch{return reply({error:'Request could not be completed'},500);}
});
