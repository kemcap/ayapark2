import test from 'node:test';
import assert from 'node:assert/strict';
import {unitSearchMatches} from '../v3-domain.mjs';
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

const {unitClarifications,unitBalance,unitMapV3,unitCardResident}=await import('../v3-ui.mjs');
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

test('owner fallback shows name and role when no tenant exists, regardless of missing contact fields',()=>{
 const s=sample();s.data.persons=[{id:'owner',full_name:'Hülya Karşıt',phone:'',email:''}];
 s.data.links=[{id:'owner-link',unit_id:'x',person_id:'owner',role:'owner',active:true}];
 assert.equal(unitCardResident(s.data,'x'),'Hülya Karşıt · Ev sahibi');
 const html=unitMapV3(s);
 assert(html.includes('Hülya Karşıt · Ev sahibi'));
 assert(!html.includes('Sakin bilgisi eksik.'));
});
test('tenant is preferred over owner, with a representative as the last fallback',()=>{
 const s=sample();
 s.data.persons=[{id:'owner',full_name:'Malik Kişi'},{id:'tenant',full_name:'Kiracı Kişi'},{id:'rep',full_name:'Temsilci Kişi'}];
 s.data.links=[{unit_id:'x',person_id:'owner',role:'owner',active:true},{unit_id:'x',person_id:'rep',role:'representative',active:true},{unit_id:'x',person_id:'tenant',role:'tenant',active:true}];
 assert.equal(unitCardResident(s.data,'x'),'Kiracı Kişi · Kiracı');
 s.data.links.find(l=>l.role==='tenant').active=false;
 assert.equal(unitCardResident(s.data,'x'),'Malik Kişi · Ev sahibi');
 s.data.links.find(l=>l.role==='owner').active=false;
 assert.equal(unitCardResident(s.data,'x'),'Temsilci Kişi · Temsilci');
});
test('vacant occupancy does not hide the owner name or change its role',()=>{
 const s=sample();s.data.units[0].occupancy_status='vacant';
 s.data.persons=[{id:'owner',full_name:'Kayıtlı Malik'}];
 s.data.links=[{unit_id:'x',person_id:'owner',role:'owner',active:true}];
 const html=unitMapV3(s);
 assert(html.includes('Kayıtlı Malik · Ev sahibi'));
 assert(html.includes('>Boş<'));
 assert(!html.includes('Sakin bilgisi eksik.'));
});
