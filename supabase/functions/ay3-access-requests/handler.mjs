import {accessRequestPayload} from '../../../access-request-policy.mjs';
export function accessRequestHandler({enabled,origins,site,admin,hash,ip}){return async req=>{
 const origin=req.headers.get('Origin')||'',headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origins.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!origins.has(origin))return reply(403,{error:'access_denied'});if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return reply(405,{error:'invalid_request'});if(!enabled)return reply(503,{error:'not_enabled'});
 try{
  const reader=req.body?.getReader();if(!reader)return reply(400,{error:'invalid_request'});let size=0,parts=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return reply(413,{error:'invalid_request'});}parts.push(value);}const bytes=new Uint8Array(size);let pos=0;for(const p of parts){bytes.set(p,pos);pos+=p.length;}const input=JSON.parse(new TextDecoder().decode(bytes));if(!input||typeof input!=='object'||Array.isArray(input))return reply(400,{error:'invalid_request'});
  if(input.action==='submit'){
   let p;try{p=accessRequestPayload(input);}catch{return reply(400,{error:'invalid_request'});}
   const address=ip(req);if(!address)return reply(503,{error:'not_enabled'});
   for(const [bucket,limit] of [['global:'+await hash('requests-all'),100],['ip:'+await hash('request:'+address),5],['phone:'+await hash('request:'+p.contact),2]])if(!await admin.limit(bucket,limit))return reply(429,{error:'try_later'});
   await admin.submit(site,p);return reply(200,{ok:true});
  }
  const bearer=/^Bearer (.+)$/i.exec(req.headers.get('Authorization')||'')?.[1],actor=bearer?await admin.user(bearer):null;if(!actor)return reply(401,{error:'access_denied'});
  if(input.action==='list'){const offset=input.offset??0;if(!Number.isSafeInteger(offset)||offset<0||offset>100000)return reply(400,{error:'invalid_request'});return reply(200,await admin.list(site,actor.id,offset));}
  if(!['read','review','approve','sent','reject'].includes(input.action)||!Number.isSafeInteger(input.version)||input.version<1)return reply(400,{error:'invalid_request'});
  await admin.update(site,actor.id,input);return reply(200,{ok:true});
 }catch(error){return reply(error instanceof SyntaxError?400:409,{error:'request_failed'});}
};}
