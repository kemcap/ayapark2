// Native Supabase recovery on an EXISTING account. No user creation or password access.
export function adminRecoveryHandler({enabled,origins,resetUrl,admin,hash}){return async req=>{
 const origin=req.headers.get('Origin')||'',headers={'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Vary':'Origin',...(origins.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!origins.has(origin))return reply(403,{error:'access_denied'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'invalid_request'});
 if(!enabled)return reply(503,{error:'not_enabled'});
 try{
  const target=new URL(resetUrl);if(target.protocol!=='https:'||!origins.has(target.origin)||target.search||target.hash)throw Error('configuration');
  const bearer=/^Bearer (.+)$/i.exec(req.headers.get('Authorization')||'')?.[1];
  const actor=bearer?await admin.user(bearer):null;if(!actor)return reply(401,{error:'access_denied'});
  const reader=req.body?.getReader();if(!reader)return reply(400,{error:'invalid_request'});
  const chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return reply(413,{error:'invalid_request'});}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const p=JSON.parse(new TextDecoder().decode(bytes));
  if(!p||Array.isArray(p)||p.action!=='create'||!/^[-a-f0-9]{36}$/i.test(p.person_id)||p.confirmed!==true||typeof p.reason!=='string'||p.reason.trim().length<10||p.reason.length>300)return reply(400,{error:'invalid_request'});
  for(const [bucket,limit] of [['global:'+await hash('recovery-all'),100],['phone:'+await hash('recovery-actor:'+actor.id),5]])if(!await admin.limit(bucket,limit))return reply(429,{error:'try_later'});
  // SQL checks site-scoped manager privileges before looking up the Auth account.
  const uid=await admin.authorize(actor.id,p.person_id,p.reason.trim(),true);
  const user=await admin.account(uid);if(!user||user.id!==uid||!user.email)return reply(409,{error:'recovery_unavailable'});
  const link=await admin.generate(user.email);
  if(link?.user?.id!==uid||typeof link?.properties?.hashed_token!=='string'||!/^[a-f0-9]{32,256}$/i.test(link.properties.hashed_token))return reply(409,{error:'recovery_unavailable'});
  // Recheck linkage/manager and persist audit BEFORE disclosing any credential.
  await admin.issued(actor.id,p.person_id,uid);
  target.hash=new URLSearchParams({type:'recovery',token_hash:link.properties.hashed_token}).toString();
  return reply(200,{url:target.href});
 }catch(error){return reply(error instanceof SyntaxError?400:409,{error:'recovery_unavailable'});}
};}
