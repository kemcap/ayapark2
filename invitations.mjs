import {t as tr} from './i18n.mjs?v=5.1.0';
export function invitationText(name,link){return tr('Merhaba')+' '+name+',\n\n'+tr('AYAPARK 2 daire hesabını etkinleştirmek için kişisel davet bağlantını aç:')+'\n'+link+'\n\n'+tr('Bu bağlantı kişiseldir. Başkalarıyla paylaşma.');}
export function readInvitation(location,history){const t=new URLSearchParams(location.hash.slice(1)).get('invite')||'';history.replaceState(null,'',location.pathname);return /^[a-f0-9]{64}$/.test(t)?t:'';}
export function newDeviceSecret(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');}
export class Invitations {
 constructor(api){this.api=api;}
 async call(action,body={},admin=false){return this.api.raw('/functions/v1/ay-resident-invites','POST',{action,...body},admin?await this.api.token():undefined);}
 async finish(action,body){const generation=this.api.generation,result=await this.call(action,body);this.api.accept(result.session,generation);return result;}
}
