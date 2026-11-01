import {financeLinkAt} from './finance-v5.mjs?v=perf1';
import {announcementActive,announcementStatus,acknowledgementKey,activeAt} from './v3-domain.mjs?v=perf1';
import {getLanguage,t as tr} from './i18n.mjs?v=5.10.0';
import {escapeHtml as e} from './core.mjs?v=perf1';
export const notificationTitle=a=>getLanguage()==='de'&&a.title_de?a.title_de:a.title;
export const notificationBody=a=>getLanguage()==='de'&&a.body_de?a.body_de:a.body;
export const hasRead=(d,a)=>!!d.acknowledgements?.some(r=>r.announcement_id===a.id&&r.revision===(a.revision||1)&&r.user_id===d.userId);
export function receives(d,a){
 if(a.local_test)return d.role==='super';if(d.role==='super'||d.role!=='resident'&&d.capabilities?.announcements)return true;
 if(d.role==='resident'&&d.currentMember===false)return false;
 const kind=a.target_kind||'all';if(kind==='all')return true;
 const ownLinks=(d.links||[]).filter(l=>['owner','tenant','representative'].includes(l.role)&&financeLinkAt(l,new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'}))&&(d.ownPersonIds||[]).includes(l.person_id));
 if(kind==='owners')return ownLinks.some(l=>l.role==='owner'||l.role==='representative'&&l.mandates?.includes('owners'));
 if(kind==='residents')return ownLinks.some(l=>l.role==='tenant'||l.role==='representative'&&l.mandates?.includes('residents'));
 if(kind==='representatives')return ownLinks.some(l=>l.role==='representative');
 if(kind==='units')return ownLinks.some(l=>a.target_units?.includes(l.unit_id));
 if(kind==='blocks')return ownLinks.some(l=>a.target_blocks?.includes(d.units.find(u=>u.id===l.unit_id)?.block));return false;
}
export const notificationExpired=a=>announcementStatus(a)==='Arşiv';
export const notificationCenter=d=>(d.announcements||[]).filter(a=>receives(d,a)&&(announcementActive(a)||notificationExpired(a)||d.role!=='resident'&&d.capabilities?.announcements)).sort((a,b)=>(announcementActive(a)?0:notificationExpired(a)?1:2)-(announcementActive(b)?0:notificationExpired(b)?1:2)||String(b.created_at).localeCompare(String(a.created_at)));
export const notificationState=a=>tr(announcementActive(a)?'Aktif':notificationExpired(a)?'Süresi doldu':announcementStatus(a));
export const notifications=d=>(d.announcements||[]).filter(a=>announcementActive(a)&&receives(d,a)).sort((a,b)=>({urgent:0,important:1,normal:2}[a.priority||'normal']-{urgent:0,important:1,normal:2}[b.priority||'normal'])||String(b.created_at).localeCompare(String(a.created_at)));
export const unreadNotifications=d=>notifications(d).filter(a=>!hasRead(d,a));
export const nextPopup=d=>unreadNotifications(d).find(a=>a.priority==='urgent'||a.priority==='important'&&a.popup_on_login);
export function notificationList(d){return notifications(d).map(a=>`<button class="notification-item ${hasRead(d,a)?'read':'unread'}" data-notification="${e(a.id)}"><strong>${e(notificationTitle(a))}</strong><small>${e(new Date(a.created_at).toLocaleDateString(({de:'de-DE',en:'en-GB',tr:'tr-TR'}[getLanguage()])))} · ${tr({normal:'Normal',important:'Önemli',urgent:'Acil'}[a.priority||'normal'])} · ${tr(hasRead(d,a)?'Okundu':'Okunmadı')}</small></button>`).join('')||`<p>${tr('Yeni bildirim yok.')}</p>`;}
export const testAnnouncement=()=>({id:'local-test-notification',title:'AYAPARK 2 – Test Duyurusu',body:'Bu bir test duyurusudur. Ayapark 2 bildirim sisteminin doğru çalıştığını kontrol etmek için oluşturulmuştur. Lütfen „Okudum“ butonuna basın.',title_de:'AYAPARK 2 – Test Duyurusu',body_de:'Dies ist eine Testmitteilung. Sie dient ausschließlich dazu, das Benachrichtigungssystem von Ayapark 2 zu überprüfen. Bitte auf „Gelesen“ tippen.',priority:'important',popup_on_login:true,published:true,revision:1,local_test:true,created_at:new Date().toISOString(),target_kind:'all'});
export function testControls(){return `<section class="notification-test"><h3>${tr('Bildirim testi')}</h3><p>${tr('Yalnızca bu Süper Admin görünümü. Sakinlere gönderilmez.')}</p><div class="row-actions">${[['show','Test duyurusunu göster'],['show_many','Üç test duyurusu göster'],['reset','Test onayını sıfırla'],['reopen','Pop-up yeniden aç'],['disable','Testi devre dışı bırak']].map(([a,t])=>`<button class="button" data-notification-test="${a}">${tr(t)}</button>`).join('')}</div><p role="status" id="notificationTestStatus"></p></section>`;}
export {acknowledgementKey};
