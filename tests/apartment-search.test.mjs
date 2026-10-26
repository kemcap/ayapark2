import test from 'node:test';
import assert from 'node:assert/strict';
import {unitSearchMatches} from '../v3-domain.mjs?v=5.3.1';
const unit={id:'a1',code:'A-1'},other={id:'b1',code:'B-1'};
const data={role:'super',persons:[{id:'p',full_name:'Özdemir Yılmaz',email:'oz@example.invalid',phone:'+90 555 123 45 67',notes:'havuz anahtarı'}],links:[{unit_id:'a1',person_id:'p',role:'owner'},{unit_id:'b1',person_id:'p',role:'representative'}]};
test('apartment code and block letter do not create search hits',()=>{
 assert.equal(unitSearchMatches({...data,persons:[]},unit,'A',true).length,0);
 assert.equal(unitSearchMatches(data,unit,'A-1',true).length,0);
});
test('normalizes accents, token order, email and telephone formatting',()=>{
 for(const q of ['Yilmaz Ozdemir','oz@example.invalid','05551234567','+90 555 123 45 67'])assert.equal(unitSearchMatches(data,unit,q,true).length,1,q);
 assert.equal(unitSearchMatches(data,other,'Verwaltung',true).length,1);
});
test('a person associated with two apartments can find both',()=>{
 assert.equal([unit,other].filter(u=>unitSearchMatches(data,u,'Ozdemir',true).length).length,2);
});
test('contact details and notes are excluded without permission',()=>{
 assert.equal(unitSearchMatches(data,unit,'oz@example.invalid',false).length,0);
 assert.equal(unitSearchMatches(data,unit,'anahtari',false).length,0);
 assert.equal(unitSearchMatches(data,unit,'anahtari',true).length,1);
});
test('source-only debt label is searchable without inventing a resident',()=>{
 const d={...data,persons:[],links:[],charges:[{unit_id:unit.id,reference:'staged:s:Aidat'}],staged:[{id:'s',person_label:'Tülay Türkay Günebir'}]};
 const match=unitSearchMatches(d,unit,'Günebir',true);
 assert.equal(match.length,1);assert.equal(match[0].link.role,'source');
 assert.equal(unitSearchMatches(d,unit,'Günebir',false).length,0);
});

const {unitClarifications,unitBalance,unitMapV3,unitCardResidents}=await import('../v3-ui.mjs?v=5.3.1');
function sample(){return {mode:'demo',data:{role:'super',units:[{id:'x',code:'A-4',number:4,block:'A',occupancy_status:'unknown',debt:0}],persons:[],links:[],charges:[],allocations:[],transactions:[],staged:[]}};}
test('card computes posted current and former debt instead of stale unit cache',()=>{
 const s=sample(),u=s.data.units[0];s.data.links=[{id:'former',unit_id:'x',ends_on:'2020-01-01'}];s.data.charges=[{id:'old',unit_id:'x',link_id:'former',cents:720000},{id:'current',unit_id:'x',cents:360000},{id:'void',unit_id:'x',cents:100000,void_reason:'correction'}];
 assert.equal(unitBalance(s,u),1080000);const card=unitMapV3(s);assert(!card.includes('Borç yok'));assert(card.includes('Eski borçlar'));assert(card.includes('Belirtilmedi'));assert(!card.includes('>Dolu<'));
});
test('zero posted balance with pending source is review pending, not settled',()=>{
 const s=sample();s.data.staged=[{id:'s',unit_hint:'A-4 (M)',person_label:'Test Person',as_of:'2026-10-09',cents:360000}];
 const review=unitClarifications(s,s.data.units[0]);assert.equal(review.stages.length,1);const card=unitMapV3(s);assert(card.includes('Bakiye kontrol bekliyor.'));assert(!card.includes('Borç yok'));
});
test('source overlap and missing current responsibility remain clarification reasons',()=>{
 const s=sample();s.data.charges=[{id:'c',unit_id:'x',person_id:'person',cents:100}];s.data.staged=[{id:'a',unit_hint:'A-4',person_label:'Test Person',as_of:'2026-10-09',cents:100},{id:'b',unit_hint:'A-4',person_label:'Test Person',as_of:'2026-10-09',cents:200}];
 const review=unitClarifications(s,s.data.units[0]);assert.equal(review.stages[0].check.overlaps.length,1);assert(review.reasons.some(r=>r.includes('Borçlunun kişi bilgisi eksik.')));
});


test('apartment card shows the owner even without a tenant or contact details',()=>{
 const s=sample();s.data.persons=[{id:'owner',full_name:'Hülya Karşıt',phone:'',email:''}];
 s.data.links=[{id:'owner-link',unit_id:'x',person_id:'owner',role:'owner',active:true}];
 assert.deepEqual(unitCardResidents(s.data,'x'),[{role:'owner',label:'Ev sahibi',names:['Hülya Karşıt']}]);
 const html=unitMapV3(s);
 assert(html.includes('Ev sahibi:</strong> <span class="apartment-person-names">Hülya Karşıt</span>'));
 assert(!html.includes('Sakin bilgisi eksik.'));
});
test('every populated role appears in order: owner, tenant, authorized contact',()=>{
 const s=sample();
 s.data.persons=[{id:'owner',full_name:'Malik Kişi'},{id:'tenant',full_name:'Kiracı Kişi'},{id:'rep',full_name:'Yetkili Kişi'}];
 s.data.links=[{unit_id:'x',person_id:'rep',role:'representative',active:true},{unit_id:'x',person_id:'tenant',role:'tenant',active:true},{unit_id:'x',person_id:'owner',role:'owner',active:true}];
 const rows=unitCardResidents(s.data,'x');
 assert.deepEqual(rows.map(x=>x.role),['owner','tenant','representative']);
 assert.deepEqual(rows.map(x=>x.names[0]),['Malik Kişi','Kiracı Kişi','Yetkili Kişi']);
 assert.deepEqual(rows.map(x=>x.label),['Ev sahibi','Kiracı','Yetkili kişi']);
 const html=unitMapV3(s);
 assert(html.indexOf('Ev sahibi:')<html.indexOf('Kiracı:'));
 assert(html.indexOf('Kiracı:')<html.indexOf('Yetkili kişi:'));
 assert(html.includes('Yetkili Kişi'));
});
test('multiple names in one role are preserved and duplicate links do not repeat them',()=>{
 const s=sample();
 s.data.persons=[{id:'p1',full_name:'Birinci Malik'},{id:'p2',full_name:'İkinci Malik'},{id:'p3',full_name:'Kiracı Kişi'}];
 s.data.links=[{unit_id:'x',person_id:'p1',role:'owner',active:true},{unit_id:'x',person_id:'p2',role:'owner',active:true},{unit_id:'x',person_id:'p1',role:'owner',active:true},{unit_id:'x',person_id:'p3',role:'tenant',active:true}];
 assert.deepEqual(unitCardResidents(s.data,'x').map(x=>x.names),[['Birinci Malik','İkinci Malik'],['Kiracı Kişi']]);
 assert(unitMapV3(s).includes('Birinci Malik, İkinci Malik'));
});
test('inactive, archived and expired links are not shown',()=>{
 const s=sample();
 s.data.persons=[{id:'owner',full_name:'Güncel Malik'},{id:'old',full_name:'Eski Kiracı'},{id:'archived',full_name:'Eski Temsilci'}];
 s.data.links=[{unit_id:'x',person_id:'owner',role:'owner',active:true},{unit_id:'x',person_id:'old',role:'tenant',active:true,ends_on:'2025-10-24'},{unit_id:'x',person_id:'archived',role:'representative',active:true,archived_at:'2026-10-01'}];
 const rows=unitCardResidents(s.data,'x');assert.deepEqual(rows.map(x=>x.role),['owner']);
 assert(!unitMapV3(s).includes('Eski Kiracı'));
 assert(!unitMapV3(s).includes('Eski Temsilci'));
});
test('vacant occupancy does not hide the existing owner',()=>{
 const s=sample();s.data.units[0].occupancy_status='vacant';
 s.data.persons=[{id:'owner',full_name:'Kayıtlı Malik'}];
 s.data.links=[{unit_id:'x',person_id:'owner',role:'owner',active:true}];
 const html=unitMapV3(s);
 assert(html.includes('Kayıtlı Malik'));
 assert(html.includes('Ev sahibi:'));
 assert(html.includes('>Boş<'));
 assert(!html.includes('Sakin bilgisi eksik.'));
});

test('building plan puts B on left and A on right, each ordered from 1 to 10 in row-major order',()=>{
 const s=sample();
 s.data.units=[
  ...Array.from({length:10},(_,i)=>({id:'a'+(10-i),code:'A-'+(10-i),number:10-i,block:'A',occupancy_status:'unknown'})),
  ...Array.from({length:10},(_,i)=>({id:'b'+(10-i),code:'B-'+(10-i),number:10-i,block:'B',occupancy_status:'unknown'}))
 ];
 const html=unitMapV3(s);
 const bStart=html.indexOf('<h3>B Blok</h3>'),aStart=html.indexOf('<h3>A Blok</h3>');
 assert(bStart>=0&&aStart>bStart);
 const b=html.slice(bStart,aStart),a=html.slice(aStart);
 for(const [segment,block] of [[b,'B'],[a,'A']]){
  const labels=[...segment.matchAll(/aria-label="([AB]-\d+)"/g)].map(m=>m[1]);
  assert.deepEqual(labels,Array.from({length:10},(_,i)=>block+'-'+(i+1)));
  assert(labels[0]===block+'-1'&&labels.at(-1)===block+'-10');
 }
});
