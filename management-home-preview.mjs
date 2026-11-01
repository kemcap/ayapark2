import {overviewAccountCard,unitMapV3} from './v3-ui.mjs?v=5.15.0';
import {card} from './ui.mjs?v=5.10.0';
import {money,escapeHtml as e} from './core.mjs?v=5.10.0';
import {t as tr} from './i18n.mjs?v=5.10.0';
import {remaining} from './ledger.mjs?v=5.10.0';
import {announcementActive} from './v3-domain.mjs?v=5.10.0';

/* Test-only management home layout. Existing data and actions stay in place. */
export function managementHomePreview(s){
 const d=s.data;
 const charges=d.charges||[];
 const open=charges.filter(x=>!x.void_reason).reduce((sum,x)=>sum+Math.max(0,remaining(d,x)),0);
 const tasks=[];
 const pending=(d.staged||[]).filter(x=>!x.confirmed_charge&&!x.ignored_reason).length;
 if(pending)tasks.push({count:pending,label:'Devir kayıtlarını kontrol et',page:'dues'});
 const unmatched=(d.transactions||[]).filter(t=>t.cents>0&&!t.reversal_of).length;
 const notices=(d.announcements||[]).filter(announcementActive);
 const unitCount=(d.units||[]).length;
 const balance=d.summaryBalance??(d.opening==null?null:Number(d.opening)+(d.transactions||[]).reduce((n,x)=>n+Number(x.cents||0),0));
 const stat=(label,value,href)=>`<a class="ay-preview-stat" href="#${href}"><small>${e(label)}</small><strong>${e(value)}</strong><span aria-hidden="true">↗</span></a>`;
 const notice=`<a class="ay-preview-notice" href="#announcements"><span class="ay-preview-bell" aria-hidden="true">◉</span><span><strong>${tr('Duyurular')}</strong><small>${notices.length?notices.length+' '+tr('duyuru'):'Yeni duyuru yok'}</small></span><b>${notices.length}</b><span aria-hidden="true">›</span></a>`;
 return `<div class="ay-preview-management">
 <header class="ay-preview-heading"><div><h1>Siteniz bugün nasıl?</h1><p>Güncel mali durum, bekleyen işlemler ve site bilgileri.</p></div><span class="ay-preview-label">Yeni düzen · Test</span></header>
 <section class="ay-preview-stats" aria-label="Genel göstergeler">
 ${stat('Site bakiyesi',money(balance),'reports')}
 ${stat('Açık alacaklar',money(open),'dues')}
 ${stat('Bekleyen kayıtlar',String(pending),'dues')}
 ${stat('Daireler',String(unitCount),'units')}
 </section>
 <section class="ay-preview-panel"><div class="ay-preview-section-head"><h2>İşlem merkezi</h2><a href="#dues">İşlemleri aç ↗</a></div>
 ${tasks.length?tasks.map(t=>`<a class="ay-preview-task" href="#${t.page}"><strong>${t.count}</strong><span>${e(t.label)}</span><span aria-hidden="true">›</span></a>`).join(''):'<p class="ay-preview-empty">Şu anda bekleyen devir kontrolü yok.</p>'}
 </section>
 ${notice}
 <section class="ay-preview-panel ay-preview-units"><div class="ay-preview-section-head"><h2>Dairelere hızlı bakış</h2><a href="#units">Tüm daireler ↗</a></div>${unitMapV3(s)}</section>
 <section class="ay-preview-finance">${overviewAccountCard(s)}</section>
 <section class="ay-preview-panel"><div class="ay-preview-section-head"><h2>Sırada ne var?</h2><a href="#announcements">Duyurular ↗</a></div><p class="ay-preview-empty">Güncel işler ve tarihleri ilgili bölümlerden takip edebilirsiniz.</p></section>
 </div>`;
}
