// Resident-safe aggregate: never returns amounts or charge details for other apartments.
// verify_jwt = false: every POST authenticates the bearer token with Supabase Auth.
import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {calculateClaims} from './math.mjs';
const origins=new Set(['https://kemcap.github.io','https://ayapark2-v2-private.kemcap.chatgpt.site']);
Deno.serve(async req=>{
 const origin=req.headers.get('Origin')||'';
 const headers={'Access-Control-Allow-Origin':origins.has(origin)?origin:'https://kemcap.github.io',
  'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json',
  'Cache-Control':'no-store','Vary':'Origin'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!origins.has(origin))return reply({error:'forbidden_origin'},403);
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
 const bearer=/^Bearer\s+(.+)$/i.exec(req.headers.get('Authorization')||'')?.[1];
 if(!bearer)return reply({error:'sign_in_required'},401);
 try{
  const base=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!base||!service)return reply({error:'service_unavailable'},503);
  const admin=createClient(base,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:identity,error:authError}=await admin.auth.getUser(bearer);
  if(authError||!identity.user)return reply({error:'invalid_session'},401);
  const {data:site,error:siteError}=await admin.from('site_sites').select('id')
   .eq('slug','aya-park-2').maybeSingle();
  if(siteError||!site)return reply({error:'site_unavailable'},503);
  const caller=createClient(base,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:'Bearer '+bearer}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:allowed,error:accessError}=await caller.rpc('ay3_community_access',{p_site:site.id});
  if(accessError||allowed!==true)return reply({error:'access_denied'},403);
  const fetchAll=async(table:string,columns:string):Promise<any[]>=>{
   const result:any[]=[];
   for(let start=0;start<100000;start+=1000){
    const {data,error}=await admin.from(table).select(columns).eq('site_id',site.id)
     .order('id',{ascending:true}).range(start,start+999);
    if(error)throw Error('Site accounting query failed');
    const rows=Array.isArray(data)?data as any[]:[];
    result.push(...rows);
    if(rows.length<1000)return result;
   }
   throw Error('Site accounting rows limit exceeded');
  };
  const {data:units,error:unitError}=await admin.from('site_units')
   .select('id,code').eq('site_id',site.id).order('code');
  if(unitError||!units?.length)return reply({error:'site_unavailable'},503);
  const siteUnitIds=new Set(units.map(u=>u.id));
  const [{data:staff}, {data:residents,error:residentError}]=await Promise.all([
   admin.from('site_staff_memberships').select('role').eq('site_id',site.id)
    .eq('user_id',identity.user.id).maybeSingle(),
   admin.from('site_resident_units').select('unit_id,role,active')
    .eq('user_id',identity.user.id).eq('active',true)
  ]);
  if(residentError)return reply({error:'accounting_unavailable'},503);
  const ownUnitIds=[...new Set((residents||[]).filter(r=>siteUnitIds.has(r.unit_id)&&
    ['owner','tenant'].includes(r.role)).map(r=>r.unit_id))];
  if(!staff&&!ownUnitIds.length)return reply({error:'access_denied'},403);
  const [charges,allocations,entries,credits,staged]=await Promise.all([
   fetchAll('ay2_charges','id,unit_id,person_id,cents,void_reason'),
   fetchAll('ay2_allocations','charge_id,entry_id,cents,void_reason'),
   fetchAll('ay2_entries','id,cents,reversal_of'),
   fetchAll('ay3_credits','entry_id,cents,void_reason'),
   fetchAll('ay2_staged_charges','id,confirmed_charge,ignored_reason')
  ]);
  const {data:people,error:peopleError}=await admin.from('ay3_persons').select('id').eq('site_id',site.id).eq('auth_user_id',identity.user.id);
  if(peopleError)return reply({error:'accounting_unavailable'},503);
  const ids=new Set((people||[]).map(p=>p.id));
  const result=calculateClaims({units,charges,allocations,entries,credits,staged,ownUnitIds:[]});
  const personal=calculateClaims({units,charges:charges.filter(c=>ids.has(c.person_id)),allocations,entries:[],credits:[],staged:[],ownUnitIds});
  result.own_total_cents=personal.own_total_cents;result.own_units=personal.own_units;
  // Staff may see site aggregate but not their own-units breakdown unless explicitly linked.
  return reply(result);
 }catch{return reply({error:'accounting_unavailable'},503);}
});
