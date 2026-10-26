import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AyaparkApi} from '../api.mjs?v=5.8.0';
import {RecoveryApi} from '../recovery-api.mjs?v=5.8.0';
import {buildAssignmentForm,assignmentPayload} from '../assignments.mjs?v=5.8.0';
import {fullDemo} from '../ledger.mjs?v=5.8.0';
import {setLanguage} from '../i18n.mjs?v=5.8.0';
import {parseImport,templateHeader} from '../v3-import.mjs?v=5.8.0';
import {enhanceTables} from '../ui-accessibility.mjs?v=5.8.0';
import {unitMapV3} from '../v3-ui.mjs?v=5.8.0';
import {apartmentInfo,unitDebtCategory} from '../apartment-info.mjs?v=5.8.0';

test('preview rejects every network verb before invoking the fetcher',async()=>{
 let sent=0;const api=new AyaparkApi(()=>{sent++;throw Error('network');},{previewOnly:true,persist:false});
 for(const method of ['GET','POST','PUT','DELETE'])await assert.rejects(api.raw('/auth/v1/user',method),/önizleme|Vorschau/);
 assert.equal(sent,0);assert.equal(api.storage,null);
});
test('preview blocks recovery email and verification with no delivery attempt',async()=>{
 let sent=0;const api=new RecoveryApi(()=>{sent++;},{previewOnly:true});
 await assert.rejects(api.requestReset('fixture@example.invalid','https://preview.example.invalid/reset.html'),/önizleme|Vorschau/);
 await assert.rejects(api.beginWithEmailCode('fixture@example.invalid','123456'),/önizleme|Vorschau/);assert.equal(sent,0);
});
test('release entry points permit only the production backend and enable real sessions',()=>{
 for(const f of ['index.html','reset.html']){const html=readFileSync(new URL('../'+f,import.meta.url),'utf8');assert(html.includes('name="ayapark-stage" content="production"'));assert(html.includes("connect-src https://eisozwhhinqszfikemot.supabase.co;"));assert(!html.includes("connect-src *"));}
});
test('role removal has one clear reason without losing the archive explanation',()=>{
 const d=fullDemo();for(const lang of ['de','tr']){setLanguage(lang);const built=buildAssignmentForm(d,'assignment_remove',{id:'demo-tenant-link'});assert.match(built.title,lang==='de'?/Rolle entfernen/:/Rolü kaldır/);assert.match(built.body,lang==='de'?/Person, andere Rollen und offene Forderungen bleiben erhalten/:/Kişi, diğer roller ve açık borçlar korunur/);assert(!built.body.includes('type="date"'));}setLanguage('tr');
});
test('assignment errors identify a field without discarding entered form data',()=>{
 const form=new FormData();form.set('first_name','V4 Test');form.set('last_name','');form.set('role','tenant');form.set('person_mode','new');
 assert.throws(()=>assignmentPayload('assignment_add',form,{unit_id:'A-7',request_id:'fixture'}),e=>e.field==='last_name');assert.equal(form.get('first_name'),'V4 Test');
 const remove=new FormData();assert.throws(()=>assignmentPayload('assignment_remove',remove,{id:'fixture'}),e=>e.field==='reason');
});
test('optional dates remain optional and chronological errors identify the end field',()=>{
 const f=new FormData();f.set('role','tenant');f.set('person_mode','existing');f.set('person_id','fixture');
 let p=assignmentPayload('assignment_add',f,{unit_id:'A-7'});assert.equal(p.starts_on,null);assert.equal(p.ends_on,null);
 f.set('starts_on','2026-10-25');f.set('ends_on','2026-10-24');assert.throws(()=>assignmentPayload('assignment_add',f,{}),e=>e.field==='ends_on');
});
test('mobile table labeling skips spanning empty states and remains idempotent',()=>{
 const headers=['Person','Rolle'].map(textContent=>({textContent,attributes:{},hasAttribute(k){return k in this.attributes;},setAttribute(k,v){this.attributes[k]=v;}}));
 const cells=[{colSpan:1,dataset:{}},{colSpan:1,dataset:{}}],empty={colSpan:2,dataset:{}};
 const table={querySelectorAll:q=>q==='thead th'?headers:[{children:cells},{children:[empty]}]},root={querySelectorAll:()=>[table]};enhanceTables(root);enhanceTables(root);
 assert.deepEqual(cells.map(c=>c.dataset.label),['Person','Rolle']);assert.deepEqual(empty.dataset,{});assert(headers.every(h=>h.attributes.scope==='col'));
});
test('B-6 shows actual open Demirbaş debt without turning ordinary debt into a clarification',()=>{
 setLanguage('tr');const d=fullDemo();d.links.push({id:'qa-b6-owner',unit_id:'B-6',person_id:'demo-owner',role:'owner',active:true});
 d.charges.push({id:'qa-demirbas',unit_id:'B-6',person_id:'demo-owner',link_id:'qa-b6-owner',category:'Demirbaş',label:'Fixture',payer:'owner',cents:750000,due_on:'2026-10-25'});
 const s={data:d,mode:'demo'},u=d.units.find(u=>u.id==='B-6');assert.equal(unitDebtCategory(s,u),'Demirbaş');assert.equal(apartmentInfo(s,u).openIssues.length,0);const html=unitMapV3(s,[u]);assert(html.includes('7.500'));assert(html.includes('Demirbaş'));
});

test('CSV guidance matches the download and structural errors are localized',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert(html.includes(templateHeader));
 for(const lang of ['tr','de']){setLanguage(lang);assert.throws(()=>parseImport(templateHeader+'\n2026-10-25;ref;Sender;Fixture;100,00;50,00;A-1;;'),e=>!e.message.includes('CSV:')&&e.message.includes('2'));}setLanguage('tr');
});
