import {remaining} from './ledger.mjs?v=5.9.39';
import {scopedCharges} from './v3-domain.mjs?v=5.9.26';
import {t as tr} from './i18n.mjs?v=5.9.28';
export function apartmentAmounts(d,unitId){
 const persons=new Map();let unassigned=0,total=0;
 for(const c of scopedCharges(d)){if(c.unit_id!==unitId||c.void_reason)continue;const value=Math.max(0,remaining(d,c));total+=value;if(c.person_id)persons.set(c.person_id,(persons.get(c.person_id)||0)+value);else unassigned+=value;}
 return {persons,unassigned,total};
}
export const popupProgress=(keys,key)=>{const i=keys.indexOf(key);return i<0?'':tr('Duyuru')+' '+(i+1)+' / '+keys.length;};
export const closeMenuOnScroll=(event,nav)=>!nav?.contains(event.target);
export const installationVisible=({standalone=false,installed=false,dismissed=false,page,mode})=>!standalone&&!installed&&!dismissed&&page==='overview'&&mode!=='signedout';
