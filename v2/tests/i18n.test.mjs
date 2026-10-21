import test from 'node:test';
import assert from 'node:assert/strict';
import {setLanguage,getLanguage,t,locale} from '../i18n.mjs';
import {fullDemo} from '../ledger.mjs';
import {renderPage,labels,date,filteredUnits} from '../ui.mjs';
import {buildForm,payloadFor} from '../forms.mjs';
import {money,parseCsv} from '../core.mjs';
const state=()=>({data:fullDemo(),mode:'demo',page:'overview',period:'2026-10',filter:{q:'',block:'all',status:'all',type:'all',period:'all'}});
test('switch languages across every page while preserving stored content and financial state',()=>{
 const s=state();s.data.announcements[0].title='Genel bakış';s.data.announcements[0].body='<script>original</script>';const before=JSON.stringify(s.data);
 try{
  setLanguage('de');assert.equal(labels.units,'Wohnungen');assert.equal(locale(),'de-DE');
  assert.match(renderPage(s),/Ihre Wohnanlage im Überblick/);
  for(const page of ['overview','units','dues','transactions','reports','announcements','settings']){s.page=page;assert.doesNotThrow(()=>renderPage(s));}
  s.page='announcements';const html=renderPage(s);assert.match(html,/<h2>Genel bakış<\/h2>/);assert.match(html,/&lt;script&gt;original/);
  assert.equal(JSON.stringify(s.data),before);assert.match(money(360000),/3\.600,00/);assert.match(date('2026-10-01'),/2026/);
  setLanguage('en');assert.equal(getLanguage(),'de');
  setLanguage('tr');assert.equal(labels.units,'Daireler');s.page='overview';assert.match(renderPage(s),/Siteniz bugün nasıl/);
 }finally{setLanguage('tr');}
});
test('German forms keep canonical payload values, user text, confirmations and CSV parsing',()=>{
 const s=state();s.data.people=[{id:'p',unit_id:'A-4',full_name:'Genel bakış',relation:'owner',active:true}];
 try{
  setLanguage('de');const person=buildForm(s,'person',{id:'p'});assert.match(person.body,/value="Genel bakış"/);assert.match(person.body,/value="owner" selected>Eigentümer/);
  const entry=buildForm(s,'entry');assert.match(entry.body,/value="Aidat" selected>Hausgeld/);
  const form=new FormData();for(const [k,v] of Object.entries({amount:'3.600,00',direction:'in',category:'Aidat',desc:'Özgün açıklama',date:'2026-10-21'}))form.set(k,v);
  const p=payloadFor('entry',form,entry.context);assert.equal(p.cents,360000);assert.equal(p.category,'Aidat');assert.equal(p.desc,'Özgün açıklama');
  assert.throws(()=>payloadFor('monthly',form,{}),/Kontrollkästchen/);
  assert.equal(parseCsv('tarih;aciklama;tutar\n2026-10-21;Özgün açıklama;3.600,00').entries[0].desc,'Özgün açıklama');
  assert.throws(()=>parseCsv('wrong'),/Kopfzeile/);
 }finally{setLanguage('tr');}
});
test('block buttons filter only authorized units and render without the former dropdown',()=>{
 const s=state();s.page='units';s.filter.block='B';assert.equal(filteredUnits(s).length,10);assert.ok(filteredUnits(s).every(u=>u.block==='B'));
 assert.match(renderPage(s),/data-block="B" aria-pressed="true"/);assert.doesNotMatch(renderPage(s),/id="blockFilter"/);
 s.data.role='resident';s.data.ownIds=['A-4'];assert.equal(filteredUnits(s).length,0);s.filter.block='A';assert.deepEqual(filteredUnits(s).map(u=>u.code),['A-4']);
});
