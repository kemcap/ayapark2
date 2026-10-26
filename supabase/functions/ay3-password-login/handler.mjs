import {classifyIdentifier} from '../../../auth-policy.mjs';
// Pure request handler with injected, testable trusted adapters. Never logs bodies.
export function passwordLoginHandler({enabled,origins,admin,signIn,hash,clientIp,delay=ms=>new Promise(r=>setTimeout(r,ms))}){
 return async req=>{
  const origin=req.headers.get('Origin')||'';
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origins.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'content-type,apikey,authorization'};
  const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!origins.has(origin))return reply(403,{error:'access_denied'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply(405,{error:'invalid_request'});
  if(!enabled)return reply(503,{error:'not_enabled'});
  try{
   // Bound stream reads, including chunked requests with no Content-Length.
   const reader=req.body?.getReader();let size=0,parts=[];
   if(!reader)return reply(400,{error:'invalid_request'});
   while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return reply(413,{error:'invalid_request'});}parts.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
   const input=JSON.parse(new TextDecoder().decode(bytes));
   if(!input||typeof input!=='object'||Array.isArray(input)||input.action&&!['login','bind'].includes(input.action))return reply(400,{error:'invalid_request'});
   if(input.action==='bind'){
    const bearer=/^Bearer (.+)$/i.exec(req.headers.get('Authorization')||'')?.[1];
    const actor=bearer?await admin.user(bearer):null;if(!actor)return reply(401,{error:'access_denied'});
    const phone=classifyIdentifier(input.phone);if(phone?.kind!=='phone'||typeof input.person_id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.person_id)||typeof input.reason!=='string'||input.reason.trim().length<5||input.reason.length>500||input.confirmed!==true||typeof input.active!=='boolean')return reply(400,{error:'invalid_request'});
    await admin.bind({actor:actor.id,person:input.person_id,phone:phone.value,reason:input.reason,active:input.active});return reply(200,{ok:true});
   }
   const contact=classifyIdentifier(input.identifier);
   // Login accepts existing short passwords. New password rules belong to creation/change.
   if(contact?.kind!=='phone'||typeof input.password!=='string'||!input.password||input.password.length>1024)return reply(400,{error:'invalid_credentials'});
   const ip=clientIp(req);if(!ip)return reply(503,{error:'not_enabled'});
   const buckets=[['global:'+await hash('all'),300],['ip:'+await hash(ip),30],['phone:'+await hash(contact.value),10]];
   for(const [bucket,limit]of buckets)if(!await admin.limit(bucket,limit))return reply(429,{error:'try_later'});
   const userId=await admin.lookup(contact.value),user=userId?await admin.account(userId):null;
   // Perform the same password grant even for an unknown contact to avoid a fast lookup-only response.
   const result=await signIn(user?.email||'unassigned@ayapark2.invalid',input.password);
   if(!userId||!result?.access_token||result.user?.id!==userId){await delay(250);return reply(400,{error:'invalid_credentials'});}
   return reply(200,{access_token:result.access_token,refresh_token:result.refresh_token,expires_in:result.expires_in,token_type:'bearer',user:{id:result.user.id}});
  }catch(error){return error instanceof SyntaxError?reply(400,{error:'invalid_request'}):reply(503,{error:'service_unavailable'});}
 };
}
