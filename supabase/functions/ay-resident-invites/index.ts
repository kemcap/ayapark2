import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
const origin='https://kemcap.github.io';
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
Deno.serve(async(req:Request)=>{
 const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.headers.get('Origin')&&req.headers.get('Origin')!==origin)return reply({error:'access_denied'},403);
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply({error:'invalid_request'},405);
 if(Deno.env.get('RESIDENT_INVITES_ENABLED')!=='true')return reply({error:'invitations_disabled'},503);
 try{
  const body=await req.json();const action=body.action;
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const rpc=async(name:string,args:Record<string,unknown>)=>{const {data,error}=await admin.rpc(name,args);if(error||!data)throw Error('invitation_failed');return data;};
  const command=(name:string,payload:Record<string,unknown>,actor?:string)=>rpc('ay_resident_invite_command',{p_action:name,p_payload:payload,p_actor:actor||null});
  if(['issue','status','approve','revoke'].includes(action)){
   const bearer=/^Bearer (.+)$/i.exec(req.headers.get('Authorization')||'')?.[1];if(!bearer)return reply({error:'access_denied'},403);
   const {data,error}=await admin.auth.getUser(bearer);if(error||!data.user)return reply({error:'access_denied'},403);
   const actor=data.user.id;
   if(!/^[a-f0-9-]{36}$/i.test(body.person_id||''))return reply({error:'invalid_request'},400);
   if(action==='status')return reply(await command('status',{person_id:body.person_id},actor));
   if(body.confirmed!==true)return reply({error:'confirmation_required'},400);
   if(action!=='issue')return reply(await command(action,{person_id:body.person_id,id:body.id,code:body.code,confirmed:true},actor));
   if(!['email','manual'].includes(body.mode))return reply({error:'invalid_request'},400);
   const target=await rpc('ay_resident_invite_target',{p_actor:actor,p_person:body.person_id});
   let uid=target.user_id,email=target.email;
   if(uid){
    const {data:u,error}=await admin.auth.admin.getUserById(uid);if(error||!u.user?.email)throw Error('account_conflict');
    if(body.mode==='email'&&u.user.email.toLowerCase()!==email)throw Error('account_conflict');email=u.user.email;
   }else{
    if(body.mode==='email'&&!email)return reply({error:'email_required'},400);
    email=email||`resident-${body.person_id}@access.ayapark.invalid`;
    // Technical identifier only; no email is sent, no password is created and
    // no resident permissions exist until proof and transactional completion.
    const {data:u,error}=await admin.auth.admin.createUser({email,email_confirm:false,app_metadata:{ay_resident_person:body.person_id}});
    if(error||!u.user)throw Error('account_conflict');uid=u.user.id;
   }
   const token=random();const result=await command('issue',{person_id:body.person_id,user_id:uid,email,hash:await digest(token),mode:body.mode},actor);
   return reply({...result,link:`${origin}/ayapark2/invite.html#invite=${token}`});
  }
  if(!/^[a-f0-9]{64}$/.test(body.invite||''))return reply({error:'invalid_invitation'},400);
  const hash=await digest(body.invite);
  if(action==='resolve')return reply(await command('resolve',{hash}));
  if(action==='request'||action==='manual_finish'){
   if(!/^[a-f0-9]{64}$/.test(body.secret||''))return reply({error:'invalid_request'},400);
   const request_hash=await digest(body.secret),code=request_hash.slice(0,8).toUpperCase();
   if(action==='request'){await command('request',{hash,request_hash,code});return reply({code});}
   const target=await command('ready',{hash,request_hash});
   // Generate without sending mail; private token never leaves the server.
   const {data:link,error}=await admin.auth.admin.generateLink({type:'magiclink',email:target.email});
   if(error||link.user?.id!==target.user_id||!link.properties?.hashed_token)throw Error('account_conflict');
   const {data:verified,error:verifyError}=await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'email'});
   if(verifyError||!verified.session||verified.user?.id!==target.user_id)throw Error('identity_mismatch');
   await command('complete',{hash,request_hash,user_id:verified.user.id});
   return reply({session:verified.session});
  }
  if(action==='email_send'){
   const target=await command('send',{hash});
   const {error}=await client.auth.signInWithOtp({email:target.email,options:{shouldCreateUser:false}});
   if(error)return reply({error:'email_delivery_failed'},429);return reply({ok:true});
  }
  if(action==='email_finish'){
   if(!/^\d{6,10}$/.test(body.code||''))return reply({error:'invalid_code'},400);
   const target=await command('attempt',{hash});
   const {data,error}=await client.auth.verifyOtp({email:target.email,token:body.code,type:'email'});
   if(error||!data.session||data.user?.id!==target.user_id)throw Error('identity_mismatch');
   await command('complete',{hash,user_id:data.user.id});return reply({session:data.session});
  }
  return reply({error:'invalid_request'},400);
 }catch{return reply({error:'invitation_failed'},400);}
});
