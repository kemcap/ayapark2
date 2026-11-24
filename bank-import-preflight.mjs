// Read-only import preview. The existing import RPC remains the only write path.
const rotations=[7,12,17,22,5,9,14,20,4,11,16,23,6,10,15,21];
const constants=Array.from({length:64},(_,i)=>Math.floor(Math.abs(Math.sin(i+1))*4294967296)>>>0);
// Compatibility with existing PostgreSQL md5(jsonb_build_array(...)::text) identities.
// This is a transaction identifier, not a cryptographic security mechanism.
export function md5(text){
 const input=new TextEncoder().encode(text),bytes=new Uint8Array(Math.ceil((input.length+9)/64)*64);
 bytes.set(input);bytes[input.length]=128;const view=new DataView(bytes.buffer);
 view.setUint32(bytes.length-8,(input.length*8)>>>0,true);
 view.setUint32(bytes.length-4,Math.floor(input.length*8/4294967296),true);
 const h=new Uint32Array([0x67452301,0xefcdab89,0x98badcfe,0x10325476]);
 for(let offset=0;offset<bytes.length;offset+=64){
  let [a,b,c,d]=h;
  for(let i=0;i<64;i++){
   let f,g;if(i<16){f=(b&c)|(~b&d);g=i;}else if(i<32){f=(d&b)|(~d&c);g=(5*i+1)%16;}else if(i<48){f=b^c^d;g=(3*i+5)%16;}else{f=c^(b|~d);g=(7*i)%16;}
   const n=(a+f+constants[i]+view.getUint32(offset+4*g,true))|0,s=rotations[4*Math.floor(i/16)+i%4],old=d;
   d=c;c=b;b=(b+((n<<s)|(n>>>(32-s))))|0;a=old;
  }
  [a,b,c,d].forEach((n,i)=>h[i]=(h[i]+n)>>>0);
 }
 return [...h].map(n=>[0,8,16,24].map(s=>((n>>>s)&255).toString(16).padStart(2,'0')).join('')).join('');
}
const pgArray=values=>'['+values.map(v=>JSON.stringify(v??null)).join(', ')+']';
const desc=row=>String(row.desc||'').trim();
const fingerprint=(row,balance)=>md5(pgArray([row.date,desc(row),row.cents,row.reference||'',balance==null?null:String(balance)]));
export function sourceBounds(rows,direction){
 const dates=rows.map(r=>r.date).sort(),last=direction==='oldest-first'?rows.at(-1):direction==='newest-first'?rows[0]:rows.length===1?rows[0]:null;
 return {from:dates[0],to:dates.at(-1),closingCents:last?.balance_cents??null};
}
export function checkBankImport(rows,existing,{batch=null,complete=true}={}){
 if(!Array.isArray(rows)||!rows.length)throw Error('No import rows');
 if(batch)return {total:rows.length,newCount:0,duplicates:rows.length,ambiguous:0,alreadyImported:true,complete:true,previousSource:batch.source_name||''};
 if(!complete)return {total:rows.length,complete:false,alreadyImported:false};
 const index=new Map(),seen=new Set();
 for(const r of existing){
  const key=JSON.stringify([r.booked_on||r.date,Number(r.cents),r.bank_reference||r.reference||'']);
  if(!index.has(key))index.set(key,[]);
  index.get(key).push(r);
 }
 let newCount=0,duplicates=0,ambiguous=0;
 for(const r of rows){
  const ref=r.reference||'',balance=r.balance_cents??null;
  const key=JSON.stringify([r.date,r.cents,ref]);
  const identity=JSON.stringify([r.date,r.cents,ref,ref?null:desc(r),ref?null:balance]);
  if(seen.has(identity)){duplicates++;continue;}seen.add(identity);
  const matches=index.get(key)||[],exact=matches.filter(x=>(x.description??x.desc)===desc(r));
  if(ref?matches.length>0:exact.some(x=>balance===null||x.dedup_key===fingerprint(r,balance))){duplicates++;continue;}
  if(!ref&&balance!==null&&exact.some(x=>!x.batch_id||!x.dedup_key||x.dedup_key===fingerprint(r,null))){ambiguous++;continue;}
  newCount++;
 }
 return {total:rows.length,newCount,duplicates,ambiguous,alreadyImported:false,complete:true};
}
