import test from 'node:test';
import assert from 'node:assert/strict';
import {fullDemo,demoCommand} from '../ledger.mjs?v=4.0.1';
import {buildForm,payloadFor} from '../forms.mjs?v=4.0.1';
import {activeAt} from '../v3-domain.mjs?v=4.0.1';
import {unitDetailV3,unitMapV3,unitClarifications} from '../v3-ui.mjs?v=4.0.1';
import {unitDebtCategory} from '../apartment-info.mjs?v=4.0.1';
import {removalReasons} from '../assignments.mjs?v=4.0.1';
import {setLanguage} from '../i18n.mjs?v=4.0.1';
const state=()=>({mode:'demo',data:fullDemo()});let seq=0;
const command=(s,action,p)=>demoCommand(s.data,action,{request_id:'qa-'+(++seq),...p});
const dataForm=o=>{const f=new FormData();for(const[k,v]of Object.entries(o))f.set(k,v);return f;};
const assign=(s,unit='A-7',role='tenant',person='demo-tenant')=>{const result=command(s,'assignment_add',{unit_id:unit,person_id:person,role});return s.data.links.find(l=>l.id===result.id);};
test('adding a tenant without owner history needs only a person and role',()=>{const s=state(),u=s.data.units.find(u=>u.id==='A-7'),before=u.occupancy_status,b=buildForm(s,'assignment_add',{unit:u.id});const p=payloadFor('assignment_add',dataForm({person_mode:'existing',person_id:'demo-tenant',role:'tenant'}),b.context);command(s,'assignment_add',p);const l=s.data.links.find(l=>l.unit_id===u.id);assert(l.active);assert.equal(l.starts_on,null);assert.equal(l.ends_on,null);assert.equal(u.occupancy_status,before);});
test('new person has optional contact/notes and is stored centrally once',()=>{const s=state(),b=buildForm(s,'assignment_add',{unit:'A-7'}),p=payloadFor('assignment_add',dataForm({person_mode:'new',first_name:'QA',last_name:'Example',role:'owner',notes:'Optional note'}),b.context);command(s,'assignment_add',p);const person=s.data.persons.find(x=>x.full_name==='QA Example');assert(person);assert.equal(person.notes,'Optional note');assert(s.data.links.some(l=>l.person_id===person.id&&l.active));});
test('one person can have multiple roles and units, multiple tenants and owners are allowed',()=>{const s=state();for(const role of ['owner','tenant','representative'])assign(s,'A-7',role);assign(s,'B-3','owner');assign(s,'A-7','owner','demo-owner');assign(s,'A-7','tenant','demo-former');assert.equal(s.data.links.filter(l=>l.unit_id==='A-7'&&l.active).length,5);assert(s.data.links.some(l=>l.unit_id==='B-3'&&l.person_id==='demo-tenant'));});
test('role change archives the old role without rewriting historical debt identity',()=>{const s=state(),old=s.data.links.find(l=>l.id==='demo-tenant-link'),before=JSON.stringify(s.data.charges);command(s,'assignment_edit',{id:old.id,revision:1,role:'owner',first_name:'Sakin',last_name:'Örnek',phone:'555',email:'',notes:'Changed'});assert.equal(s.data.links.find(l=>l.id===old.id).active,false);assert(s.data.links.some(l=>l.person_id===old.person_id&&l.unit_id===old.unit_id&&l.role==='owner'&&l.active));assert.equal(JSON.stringify(s.data.charges),before);assert.equal(s.data.persons.find(p=>p.id===old.person_id).phone,'555');});
test('an extra role can be added while preserving other existing roles',()=>{const s=state(),l=assign(s,'A-7','representative');assign(s,'A-7','owner');command(s,'assignment_edit',{id:l.id,revision:1,role:'representative',additional_role:'tenant'});assert.deepEqual(s.data.links.filter(l=>l.unit_id==='A-7'&&l.active).map(l=>l.role).sort(),['owner','representative','tenant']);});
for(const role of ['owner','tenant','representative'])for(const reason of ['mistake','ended','other'])test(role+' removal archives only the selected role: '+reason,()=>{const s=state(),l=assign(s,'A-1',role),other=assign(s,'A-1',role==='owner'?'tenant':'owner'),before=JSON.stringify(s.data.charges),count=s.data.persons.length;command(s,'assignment_remove',{id:l.id,revision:1,reason,note:reason==='other'?'Optional':''});const removed=s.data.links.find(x=>x.id===l.id);assert.equal(removed.active,false);assert.equal(removed.archive_reason,reason);assert.equal(removed.ends_on,null);assert(removed.archived_at);assert(s.data.links.find(x=>x.id===other.id).active);assert.equal(s.data.persons.length,count);assert.equal(JSON.stringify(s.data.charges),before);});
test('restoring creates an active entry and retains the removed record and charges',()=>{const s=state(),l=assign(s,'A-1','representative');command(s,'assignment_remove',{id:l.id,reason:'mistake'});command(s,'assignment_restore',{id:l.id,revision:2});assert(s.data.links.find(x=>x.id===l.id).active===false);assert.equal(s.data.links.filter(x=>x.unit_id==='A-1'&&x.person_id===l.person_id&&x.role===l.role&&x.active).length,1);});
test('dates are annotations; explicit activity determines current role',()=>{const s=state(),l=assign(s,'A-7','owner');command(s,'assignment_edit',{id:l.id,role:'owner',starts_on:'2010-01-01',ends_on:'2011-01-01'});assert(activeAt(s.data.links.find(x=>x.id===l.id)));const p=payloadFor('assignment_edit',dataForm({role:'owner',first_name:'Sakin',last_name:'Örnek'}),buildForm(s,'assignment_edit',{id:l.id}).context);assert.equal(p.starts_on,null);assert.equal(p.ends_on,null);});
test('retry is idempotent and stale edits fail without modifying data',()=>{const s=state(),l=assign(s),p={id:l.id,revision:1,reason:'mistake',request_id:'stable'};command(s,'assignment_remove',p);const count=s.data.audit.length;command(s,'assignment_remove',p);assert.equal(s.data.audit.length,count);const before=JSON.stringify(s.data);assert.throws(()=>command(s,'assignment_edit',{id:l.id,revision:1,role:'owner'}));assert.equal(JSON.stringify(s.data),before);});
test('apartment has exactly one add action and each current role has edit/remove',()=>{const s=state(),html=unitDetailV3(s,'A-4');assert.equal((html.match(/data-action="assignment_add"/g)||[]).length,1);assert.equal((html.match(/data-action="assignment_edit"/g)||[]).length,2);assert.equal((html.match(/data-action="assignment_remove"/g)||[]).length,2);assert(!/relationship_change|end_link|unlink/.test(html));const body=buildForm(s,'assignment_add',{unit:'A-7'}).body;assert(!/required[^>]*type="date"|type="date"[^>]*required/.test(body));assert(!/name="occupancy"|name="reason"|name="kind"/.test(body));});
test('only actual unpaid categories determine the label, settled/voided charges are excluded',()=>{const s=state(),u=s.data.units.find(u=>u.id==='A-7');s.data.charges=[{id:'one',unit_id:u.id,person_id:'demo-owner',category:'Aidat',cents:100},{id:'paid',unit_id:u.id,category:'Havuz',cents:200},{id:'void',unit_id:u.id,category:'Demirbaş',cents:500,void_reason:'cancel'}];s.data.allocations=[{charge_id:'paid',cents:200}];setLanguage('de');assert.equal(unitDebtCategory(s,u),'Hausgeld');s.data.charges.push({id:'two',unit_id:u.id,category:'Havuz',cents:1});assert.equal(unitDebtCategory(s,u),'Mehrere Posten');setLanguage('tr');assert.equal(unitDebtCategory(s,u),'Birden fazla kalem');});
test('normal known open debt is not a clarification; missing debtors and matching pending payments are',()=>{const s=state(),u=s.data.units.find(u=>u.id==='A-7');assign(s,u.id,'owner','demo-owner');s.data.staged=[];s.data.transactions=[];s.data.charges=[{id:'c',unit_id:u.id,person_id:'demo-owner',category:'Demirbaş',cents:750000,payer:'owner'}];assert.equal(unitClarifications(s,u).reasons.length,0);assert(unitClarifications(s,u).debts[0].includes('7.500'));s.data.charges[0].person_id=null;assert(unitClarifications(s,u).reasons.some(r=>r.includes('7500')||r.includes('7.500')));s.data.transactions=[{id:'payment',date:'2026-10-24',cents:10000,desc:'A-7 payment'}];assert(unitClarifications(s,u).reasons.some(r=>r.includes('2026-10-24')));});
test('resident cards show only own debts and never other persons or management actions',()=>{const s=state();s.data.role='resident';s.data.capabilities={};s.data.ownIds=['A-4'];s.data.ownPersonIds=['demo-tenant'];const html=unitDetailV3(s,'A-4'),map=unitMapV3(s);assert(!html.includes('assignment_edit'));assert(!map.includes('Eski Örnek'));assert(!map.includes('Deniz Örnek'));assert(!map.includes('7.200'));});
test('German and Turkish removal reasons and simple UI labels are complete',()=>{const s=state();setLanguage('de');const b=buildForm(s,'assignment_remove',{id:'demo-tenant-link'});assert(b.body.includes('Versehentlich hinzugefügt'));assert(b.body.includes('Mietverhältnis beendet'));assert(b.body.includes('Anderer Grund'));assert.equal(removalReasons('representative')[1][1],'Temsilcilik sona erdi');setLanguage('tr');assert.equal(buildForm(s,'assignment_add',{unit:'A-7'}).title,'Kişi ekle');});

test('archived assignment uses former role labels, preserves old debt and keeps the current person separate',()=>{
 const s=state(),old=assign(s,'A-7','tenant','demo-tenant');
 command(s,'assignment_remove',{id:old.id,revision:old.revision??1,reason:'ended'});
 const archived=s.data.links.find(l=>l.id===old.id);
 s.data.charges.push({id:'old-history-debt',unit_id:'A-7',person_id:archived.person_id,link_id:archived.id,category:'İcra',label:'Historical balance',cents:662000,due_on:'2026-10-09'});
 const html=unitDetailV3(s,'A-7');
 assert(html.includes('Eski kiracı'));
 assert(html.includes('Eski kişiye ait açık borç'));
 assert(html.includes('₺6.620,00'));
 const current=html.slice(html.indexOf('<section id="unitCurrent">'),html.indexOf('<section id="unitHistory"'));
 assert(!current.includes('Historical balance'));
 const history=html.slice(html.indexOf('<section id="unitHistory"'));
 assert(history.includes('Historical balance'));
 assert(history.includes('Eski kiracı'));
});
test('former ownership and representation are labeled explicitly in the history',()=>{
 const s=state();
 for(const role of ['owner','representative']){
  const link=assign(s,'A-7',role,'demo-tenant');
  command(s,'assignment_remove',{id:link.id,revision:link.revision??1,reason:'ended'});
 }
 const html=unitDetailV3(s,'A-7');
 assert(html.includes('Eski ev sahibi'));
 assert(html.includes('Eski yetkili kişi'));
});
