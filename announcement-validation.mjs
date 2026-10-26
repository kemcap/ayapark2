import {t as tr} from './i18n.mjs?v=5.1.0';
export function announcementTime(value){
 if(!value)return null;
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value))throw Error(tr('Duyuru tarihini ve saatini kontrol edin.'));
 const normalized=value.length===16?value+':00':value;
 const date=new Date(normalized+'+03:00');
 if(!Number.isFinite(date.getTime())||new Date(date.getTime()+3*3600000).toISOString().slice(0,19)!==normalized)throw Error(tr('Duyuru tarihini ve saatini kontrol edin.'));
 return date.toISOString();
}
export function validateAnnouncement(p){
 if(!p.title?.trim()||!p.body?.trim())throw Error(tr('Başlık ve metin gerekli.'));
 if(p.title.length>150)throw Error(tr('Duyuru başlığı en fazla 150 karakter olabilir.'));
 if(p.body.length>5000)throw Error(tr('Duyuru metni en fazla 5000 karakter olabilir.'));
 if(!['normal','important','urgent'].includes(p.priority))throw Error(tr('Duyuru önem düzeyini seçin.'));
 if(p.starts_at&&p.ends_at&&p.ends_at<=p.starts_at)throw Error(tr('Yayın bitişi başlangıçtan sonra olmalıdır.'));
}
