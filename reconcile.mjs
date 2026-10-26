import {t as tr} from './i18n.mjs?v=5.3.1';
// Evidence-based suggestions only. No financial posting or automatic allocation.
export function normalize(value){return String(value??'').replace(/[İı]/g,'i').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ç/g,'c').replace(/ö/g,'o').replace(/ü/g,'u').replace(/[^a-z0-9]+/g,' ').trim();}
function matchesName(label,description){
 const haystack=new Set(normalize(description).split(' '));
 return String(label).split(/\s+-\s+|\//).some(alias=>{
  const tokens=normalize(alias).split(' ').filter(t=>t.length>1&&!['bey','hanim','yetkili','icra'].includes(t));
  return tokens.length>=2&&haystack.has(tokens.at(-1))&&tokens.filter(t=>haystack.has(t)).length>=2;
 });
}
export function unitCodes(description){
 const s=normalize(description),codes=new Set();
 const patterns=[/\b([ab]) blok\b.{0,24}?\b(?:daire|no|numara)\s*(\d{1,2})(?!\d)/g,/\bblok ([ab])\b.{0,24}?\b(?:daire|no|numara)\s*(\d{1,2})(?!\d)/g,/\b([ab])\s+(\d{1,2})\b/g];
 for(const pattern of patterns)for(const m of s.matchAll(pattern)){
  const n=Number(m[2]);if(n<1||n>10)continue;codes.add(m[1].toUpperCase()+'-'+n);
  // A shared payment can mention two apartments. Never assign it wholly to one.
  const tail=s.slice(m.index+m[0].length);const shared=/^\s*(?:ve|ile)\s*(?:daire\s*)?(\d{1,2})(?!\d)/.exec(tail);
  if(shared&&Number(shared[1])>=1&&Number(shared[1])<=10)codes.add(m[1].toUpperCase()+'-'+Number(shared[1]));
 }
 return [...codes];
}
export function analyzeStage(row,data){
 const explicit=/\b([AB])\s*-\s*(\d{1,2})(?!\d)/i.exec(row.unit_hint||'');
 const bare=/^\s*(\d{1,2})(?!\d)/.exec(row.unit_hint||'');
 const number=explicit?Number(explicit[2]):bare?Number(bare[1]):null;
 const sourceCode=explicit?explicit[1].toUpperCase()+'-'+number:null;
 const cutoff=new Date(row.as_of+'T00:00:00Z');cutoff.setUTCDate(cutoff.getUTCDate()-366);
 const start=cutoff.toISOString().slice(0,10);
 const relevant=data.transactions.filter(t=>t.cents>0&&matchesName(row.person_label,t.desc));
 const unitEvidence=relevant.filter(t=>t.date>=start&&t.date<=row.as_of).flatMap(t=>unitCodes(t.desc).filter(code=>number===null||Number(code.split('-')[1])===number).map(code=>({code,date:t.date,reference:t.bank_reference||t.reference||'',entryId:t.id,shared:unitCodes(t.desc).length>1}))).sort((a,b)=>b.date.localeCompare(a.date));
 const codes=[...new Set(unitEvidence.map(x=>x.code))];
 const selectedCode=sourceCode||(codes.length===1?codes[0]:null);
 const suggested=data.units.find(u=>u.code===selectedCode);
 const paymentCandidates=relevant.filter(t=>t.date>row.as_of&&t.cents===Number(row.cents)&&!t.reversal_of&&!data.transactions.some(x=>x.reversal_of===t.id)).map(t=>({id:t.id,date:t.date,cents:t.cents,reference:t.bank_reference||t.reference||''}));
 const overlaps=data.staged.filter(x=>x.id!==row.id&&normalize(x.person_label)===normalize(row.person_label)).map(x=>({id:x.id,kind:x.kind,source:x.source,cents:Number(x.cents),resolved:!!(x.confirmed_charge||x.ignored_reason)}));
 const warnings=[];
 if(!suggested)warnings.push(tr("Blok kesinleşmedi. Daireyi belgeden veya kişi teyidinden belirleyin."));
 if(!sourceCode&&codes.length===1)warnings.push(tr("Daire, son bir yılın banka açıklamalarından önerildi; güncel ilişki ayrıca teyit edilmeli."));
 if(codes.length>1)warnings.push(tr("Banka açıklamalarında birden fazla daire var. Öneri otomatik kesinleştirilmez."));
 if(paymentCandidates.length)warnings.push(tr("Belge tarihinden sonra aynı kişi için aynı tutarda tahsilat var. Borcu açık kabul etmeden bu ödemeyi inceleyin."));
 if(overlaps.length)warnings.push(tr("Aynı kişi başka bir devir kaydında da var. Dönem ve kalemlerin çakışmadığını kontrol edin."));
 if(unitEvidence.some(x=>x.shared))warnings.push(tr("Bazı banka açıklamaları birden fazla daireyi kapsıyor. Ödemenin tamamı tek daireye atanmamalı."));
 return {suggestedUnitId:suggested?.id||null,suggestedCode:suggested?.code||null,basis:sourceCode?'document':suggested?'bank':'unresolved',unitEvidence:unitEvidence.slice(0,3),paymentCandidates,overlaps,warnings};
}
