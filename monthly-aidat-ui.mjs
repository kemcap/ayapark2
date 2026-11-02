// AYAPARK 2 – opt-in monthly aidat automation settings.
import {escapeHtml as escape} from './core.mjs?v=perf1';
import {getLanguage} from './i18n.mjs?v=5.10.0';
const labels={
 de:{title:'Monatliche Hausgeldforderungen',intro:'Forderungen automatisch am Monatsanfang erzeugen. Das Bankguthaben wird dadurch nicht verändert.',amount:'Hausgeld je Wohnung (TL)',day:'Fälligkeitstag (1–28)',rule:'Wer schuldet das Hausgeld?',occupant:'Mieter, sonst Eigentümer',owner:'Immer Eigentümer',tenant:'Immer Mieter',basis:'Beschluss / Grundlage',enabled:'Automatisch monatlich erzeugen',save:'Einstellungen speichern',loading:'Einstellungen laden …',notConfigured:'Noch keine Monatsregel gespeichert.',inactive:'Automatik ausgeschaltet',active:'Automatik eingeschaltet',start:'Frühester Startmonat',run:'Letzter Durchlauf',created:'Erzeugt',skipped:'Zur Prüfung',error:'Einstellungen konnten nicht geladen werden.',safe:'Aktivierung gilt erst ab dem nächsten Monat. Doppelte Forderungen werden verhindert. Bei uneindeutiger Personenzuordnung wird die Wohnung übersprungen und angezeigt.',manual:'Bereits vergangene Monate und bestehende Zahlungszuordnungen bleiben unverändert.',need:'Bitte Betrag, Fälligkeitstag und Beschlussreferenz prüfen.',saved:'Gespeichert.',reason:'Ungeklärte Wohnung'},
 tr:{title:'Aylık aidat otomasyonu',intro:'Her ayın başında aidat borçlarını oluşturur. Banka bakiyesini değiştirmez.',amount:'Daire başına aidat (TL)',day:'Son ödeme günü (1–28)',rule:'Borçlu kişi',occupant:'Kiracı varsa kiracı, yoksa malik',owner:'Her zaman malik',tenant:'Her zaman kiracı',basis:'Karar / dayanak referansı',enabled:'Her ay otomatik oluştur',save:'Ayarları kaydet',loading:'Ayarlar yükleniyor …',notConfigured:'Henüz aylık kural tanımlanmadı.',inactive:'Otomasyon kapalı',active:'Otomasyon açık',start:'İlk dönem',run:'Son çalışma',created:'Oluşturulan',skipped:'Kontrol edilecek',error:'Ayarlar yüklenemedi.',safe:'Etkinleştirme gelecek aydan itibaren geçerlidir. Mükerrer borç oluşturulmaz; borçlu belirsizse ilgili daire atlanır ve listelenir.',manual:'Geçmiş aylar ve mevcut ödeme eşleştirmeleri değişmez.',need:'Tutarı, son ödeme gününü ve dayanağı kontrol edin.',saved:'Kaydedildi.',reason:'Kontrol gereken daire'},
 en:{title:'Automatic monthly dues',intro:'Create monthly dues at the start of each month without changing the bank balance.',amount:'Amount per apartment (TRY)',day:'Due day (1–28)',rule:'Responsible payer',occupant:'Tenant if present, otherwise owner',owner:'Always owner',tenant:'Always tenant',basis:'Decision / authorization reference',enabled:'Create dues automatically every month',save:'Save settings',loading:'Loading settings …',notConfigured:'No monthly schedule saved yet.',inactive:'Automation off',active:'Automation on',start:'First month',run:'Last run',created:'Created',skipped:'Needs review',error:'Could not load settings.',safe:'Enabling applies starting next month. Duplicate charges are blocked; apartments with ambiguous payers are skipped and listed.',manual:'Past months and existing payment allocations are unchanged.',need:'Check the amount, due day and authorization reference.',saved:'Saved.',reason:'Apartment needs review'}
};
const lang=()=>labels[getLanguage()]||labels.tr;
const formatTL=c=>c==null?'':(Number(c)/100).toLocaleString(getLanguage()==='en'?'en-GB':getLanguage()==='de'?'de-DE':'tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
export const parseAmount=s=>{const v=String(s||'').trim();if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(v))return NaN;const [whole,part='']=v.replaceAll('.','').split(',');const n=Number(BigInt(whole)*100n+BigInt(part.padEnd(2,'0')));return Number.isSafeInteger(n)?n:NaN;};
let apiContext=null,siteLoaded=null,pending=false,saving=false,error='',saved='',config=null,draft=null,installed=false;
export function monthlyAidatSettings(){
 const t=lang(),c=draft||config||{},enabled=Boolean(c.enabled),amount=typeof c.amount_cents==='number'||typeof c.amount_cents==='string'?formatTL(c.amount_cents):'';
 const last=config?.last_run;
 return `<section class="card" aria-label="${escape(t.title)}"><h2>${escape(t.title)}</h2>
 <p class="fine">${escape(t.intro)}</p>
 <p role="status"><strong>${escape(config?(enabled?t.active:t.inactive):t.notConfigured)}</strong>
 ${config?.starts_month?' · '+escape(t.start)+': '+escape(config.starts_month):''}</p>
 <form id="ay13MonthlyForm" autocomplete="off">
 <label class="field">${escape(t.amount)}<input name="amount" inputmode="decimal" type="text" maxlength="18" required value="${escape(amount)}" placeholder="3600,00"></label>
 <label class="field">${escape(t.day)}<input name="day" type="number" min="1" max="28" required value="${escape(String(c.due_day||1))}"></label>
 <label class="field">${escape(t.rule)}
  <select name="debtor_rule">${[['occupant',t.occupant],['owner',t.owner],['tenant',t.tenant]].map(([value,label])=>`<option value="${value}" ${(c.debtor_rule||'occupant')===value?'selected':''}>${escape(label)}</option>`).join('')}</select>
 </label>
 <label class="field">${escape(t.basis)}<input name="basis_ref" type="text" maxlength="200" minlength="3" required value="${escape(c.basis_ref||'')}"></label>
 <label class="check-field"><input type="checkbox" name="enabled" ${enabled?'checked':''}>${escape(t.enabled)}</label>
 <p class="fine">${escape(t.safe)}</p>
 <p class="fine">${escape(t.manual)}</p>
 <button type="submit" class="button" ${saving||pending||!apiContext?'disabled':''}>${escape(saving?t.loading:t.save)}</button></form>
 ${pending?`<p role="status">${escape(t.loading)}</p>`:''}
 ${error?`<p role="alert" class="error">${escape(error)} <button type="button" class="button" data-ay13-retry>${escape(lang().save)}</button></p>`:''}
 ${saved?`<p role="status">${escape(saved)}</p>`:''}
 ${last?`<details><summary>${escape(t.run)}: ${escape(last.month)} · ${escape(t.created)}: ${Number(last.created)||0} · ${escape(t.skipped)}: ${Number(last.skipped)||0}</summary>
 <ul>${(last.issues||[]).map(x=>`<li>${escape(x.unit)}: ${escape(x.reason)}${x.candidates!=null?' ('+Number(x.candidates)+')':''}</li>`).join('')}</ul></details>`:''}
 </section>`;
}
export function initializeMonthlyAidatSettings(context){
 apiContext=context;
 if(installed)return;installed=true;
 document.addEventListener('click',event=>{
  if(!event.target.closest('[data-ay13-retry]')||!apiContext?.allowed())return;
  siteLoaded=null;error='';ensureMonthlyAidatSettings();
 });
 document.addEventListener('submit',async event=>{
  if(event.target?.id!=='ay13MonthlyForm')return;
  event.preventDefault();
  if(!apiContext?.allowed()||saving||pending)return;
  const f=new FormData(event.target),amount_cents=parseAmount(f.get('amount')),due_day=Number(f.get('day')),basis_ref=String(f.get('basis_ref')||'').trim(),debtor_rule=String(f.get('debtor_rule')||'occupant'),enabled=f.has('enabled'),site=apiContext.site();
  draft={amount_cents,due_day,basis_ref,debtor_rule,enabled};
  if(!Number.isSafeInteger(amount_cents)||amount_cents<=0||amount_cents>45000000000||!Number.isInteger(due_day)||due_day<1||due_day>28||basis_ref.length<3||!['occupant','owner','tenant'].includes(debtor_rule)){
   error=lang().need;saved='';apiContext.onChange();return;
  }
  saving=true;error='';saved='';apiContext.onChange();
  try{config=await apiContext.rpc('ay13_save_monthly_aidat_settings',{p_site:site,p_enabled:enabled,p_amount_cents:amount_cents,p_due_day:due_day,p_debtor_rule:debtor_rule,p_basis_ref:basis_ref});
   siteLoaded=site;draft=null;saved=lang().saved;
  }catch(e){error=e.message||lang().error;}finally{saving=false;apiContext.onChange();}
 });
}
export function ensureMonthlyAidatSettings(){
 if(!apiContext?.allowed()||pending)return;
 const site=apiContext.site();
 if(!site||site===siteLoaded)return;
 siteLoaded=site;pending=true;error='';saved='';
 void apiContext.rpc('ay13_monthly_aidat_settings',{p_site:site})
  .then(r=>{if(siteLoaded===site){config=r;draft=null;}})
  .catch(e=>{if(siteLoaded===site){error=e.message||lang().error;}})
  .finally(()=>{pending=false;apiContext.onChange();});
}
