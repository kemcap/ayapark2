import {lawPage} from './law-info.mjs?v=5.1.0';
import {decorateModernPage} from './modern-ui.mjs?v=5.1.0';
import {settingsPage} from './settings-ui.mjs?v=5.1.0';
import {effectiveOccupancy} from './relationships.mjs?v=5.1.0';
import {peoplePage} from './people-ui.mjs?v=5.1.0';
import {charges,duesV3,directoryV3,overviewV3,bankV3,reportV3,announcementsV3,providersV3,filteredUnitsV3,unitDetailV3,transactionDetailV3,transactionTableV3} from './v3-ui.mjs?v=5.1.0';
import {t as tr,locale} from './i18n.mjs?v=5.1.0';
import {escapeHtml as e,money,roleName} from './core.mjs?v=5.1.0';
import {paid,remaining,unassigned,monthlySummary,withLedgerIndex} from './ledger.mjs?v=5.1.0';
export const icons={more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',power:'<path d="M12 2v10M5.6 5.6a9 9 0 1 0 12.8 0"/>',persons:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v2"/>',overview:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',units:'<path d="M4 21h16M6 21V4l6-2 6 2v17M9 7h1m4 0h1M9 11h1m4 0h1M10 21v-5h4v5"/>',dues:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>',transactions:'<path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4"/>',reports:'<path d="M4 20h17M7 16V9m5 7V4m5 12v-5"/>',settings:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',announcements:'<path d="M4 9v6h4l10 4V5L8 9H4m4 6 2 6h3l-2-5"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',up:'<path d="M6 17 18 5M6 5h12v12"/>',down:'<path d="M18 7 6 19M6 7v12h12"/>',wallet:'<path d="M20 7H5a2 2 0 0 1 0-4h13v4M4 5v14h17V7H5m16 5h-6v4h6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',plus:'<path d="M12 5v14M5 12h14"/>'};
export const icon=n=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[n]||icons.units}</svg>`;
const labelText={overview:'Genel bakış',units:'Daireler',persons:'Kişiler',dues:'Aidat & borçlar',transactions:'Banka hareketleri',reports:'Mali raporlar',announcements:'Duyurular',settings:'Erişim & ayarlar',providers:'Hizmet rehberi',law:'Bilgi & Mevzuat'};
export const labels=new Proxy(labelText,{get:(target,key)=>tr(target[key])});
export const date=v=>v?new Intl.DateTimeFormat(locale(),{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Istanbul'}).format(new Date(v)):'—';
export const can=(s,k)=>s.mode==='demo'?s.data.role==='super'||(s.data.role==='staff'&&['finance','people','announcements'].includes(k)):!!s.data.capabilities[k];
export const pages=s=>Object.keys(labels).filter(p=>p!=='transactions'||can(s,'finance')).filter(p=>p!=='persons'||can(s,'people'));
export const visible=s=>s.data.role==='resident'?s.data.units.filter(u=>s.data.ownIds.includes(u.id)):s.data.units;
export const demo=s=>s.mode==='demo';
export const badge=(text,kind='')=>`<span class="badge ${kind}">${e(text)}</span>`;
export const button=(text,action,args='',primary=false)=>`<button class="button ${primary?'primary':''}" data-action="${action}" ${args}>${text}</button>`;
export const link=(p,text)=>`<a class="text-button" href="#${p}">${text}${icon('arrow')}</a>`;
export const card=(title,sub,body,action='')=>`<article class="card"><div class="card-head"><div><h2>${title}</h2><p>${sub}</p></div>${action}</div>${body}</article>`;
export const empty=(title,desc)=>`<div class="empty"><div class="icon-box">${icon('reports')}</div><h3>${title}</h3><p>${desc}</p></div>`;
export function heading(s,title,desc,actions=''){return `<div class="print-only">Ayapark 2 · ${demo(s)?tr("ÖRNEK VERİLER — RESMİ RAPOR DEĞİLDİR"):tr("Hesap dökümü")} · ${date(new Date())}</div><div class="page-heading"><div><div class="eyebrow">${demo(s)?tr("ÖRNEK DÖNEM · EKİM 2026"):'AYAPARK 2 · '+roleName(s.data.role).toLocaleUpperCase(locale())}</div><h1>${title}</h1><p>${desc}</p></div><div class="heading-actions">${actions}</div></div>`;}
export const metric=(label,value,note,i='reports',amber=false)=>`<div class="metric"><div class="meta">${label}<span class="icon-box ${amber?'amber':''}">${icon(i)}</span></div><strong>${value}</strong><small>${note}</small></div>`;
export function unitTable(s,list){return `<div class="table-wrap"><table><caption>${list.length}${tr(" daire · ")}${demo(s)?tr("Örnek kayıtlar"):tr("Yetkili kayıtlar")}</caption><thead><tr><th scope="col">${tr("Daire")}</th><th scope="col">${tr("Kullanım")}</th><th scope="col" class="numeric">${tr("Açık bakiye")}</th><th scope="col">${tr("Detay")}</th></tr></thead><tbody>${list.map(u=>`<tr><td><strong>${e(u.code)}</strong><small class="block-small">${e(u.block)}${tr(" Blok")}</small></td><td>${badge({occupied:tr("Dolu"),vacant:tr("Boş"),unknown:tr("Belirtilmedi")}[effectiveOccupancy(s.data,u)]||tr("Belirtilmedi"),effectiveOccupancy(s.data,u)==='occupied'?'':'neutral')}</td><td class="numeric">${money(u.debt)}</td><td><button class="unit-link" data-action="unit" data-id="${e(u.id)}">${tr("İncele ↗")}</button></td></tr>`).join('')||`<tr><td colspan="4">${tr("Bu filtreye uyan daire yok.")}</td></tr>`}</tbody></table></div>`;}
export const monthName=period=>new Intl.DateTimeFormat(locale(),{month:'long',year:'numeric',timeZone:'Europe/Istanbul'}).format(new Date(period+'-01'));
export function allocationTable(s,unit){const d=s.data,rows=d.allocations.filter(a=>d.charges.some(c=>(d.role!=='resident'||(d.ownPersonIds?.includes(c.person_id)||d.financialUnitIds?.includes(c.unit_id)))&&c.id===a.charge_id&&visible(s).some(u=>u.id===c.unit_id)&&(!unit||c.unit_id===unit)));return `<div class="table-wrap"><table><thead><tr><th>${tr("Borç")}</th><th class="numeric">${tr("Tutar")}</th><th>${tr("Durum / İşlem")}</th></tr></thead><tbody>${rows.map(a=>{const c=d.charges.find(c=>c.id===a.charge_id);return `<tr><td>${e(d.units.find(u=>u.id===c?.unit_id)?.code||'')} · ${e(c?.label||'')}</td><td class="numeric">${money(a.cents)}</td><td>${a.void_reason?badge(tr("Kaldırıldı"),'neutral'):can(s,'finance')?button(tr("Eşleştirmeyi kaldır"),'unallocate',`data-id="${e(a.id)}"`):badge(tr("Eşleştirildi"))}</td></tr>`;}).join('')||`<tr><td colspan="3">${tr("Henüz ödeme eşleştirmesi yok.")}</td></tr>`}</tbody></table></div>`;}
function settings(s){return settingsPage(s,can(s,'admin'));}
export function renderPage(s){return decorateModernPage(s,withLedgerIndex(s.data,()=>({overview:overviewV3,directory:directoryV3,units:directoryV3,dues:duesV3,transactions:bankV3,reports:reportV3,announcements:announcementsV3,providers:providersV3,persons:peoplePage,law:lawPage,settings}[s.page](s))));}
export const chargeTable=charges;

export const filteredUnits=filteredUnitsV3;

export const unitDetail=(s,id)=>withLedgerIndex(s.data,()=>unitDetailV3(s,id));

export const transactionDetail=transactionDetailV3;

export const transactionTable=transactionTableV3;
