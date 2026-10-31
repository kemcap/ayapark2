import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {providerCategoryChoices,providerServices,providerMatchesCategory} from '../provider-categories.mjs?v=5.9.53';
import {buildV3Form,payloadV3} from '../v3-forms.mjs?v=5.9.53';
import {providersV3} from '../v3-ui.mjs?v=5.9.53';

const id=i=>'00000000-0000-0000-0000-'+String(i).padStart(12,'0');
const provider=id(5),noteId=id(6);
const d={
 site:{id:id(1),name:'Test'},role:'super',capabilities:{people:true},persons:[],links:[],staff:[],units:[],
 providers:[{id:provider,name:'Example Company',category:'Elektrik',categories:['Elektrik','Tesisat'],contact:'Technician',phone:'',email:'',status:'preferred'}],
 providerCategories:[{id:id(11),name:'Elektrik'},{id:id(12),name:'Tesisat'},{id:id(13),name:'Havuz'}],
 providerNotes:[{id:noteId,provider_id:provider,body:'Existing visible note',created_at:'2026-10-15T10:00:00Z',author_label:'Admin'}]
};

test('legacy one-category providers and multi-category providers remain searchable',()=>{
 assert.deepEqual(providerServices({category:'Peyzaj'}),['Peyzaj']);
 assert.deepEqual(providerServices(d.providers[0]),['Elektrik','Tesisat']);
 assert(providerMatchesCategory(d.providers[0],'Tesisat'));
 assert(!providerMatchesCategory(d.providers[0],'Havuz'));
 assert.deepEqual(providerCategoryChoices(d).map(x=>x.name),['Elektrik','Havuz','Tesisat']);
 const html=providersV3({mode:'connected',data:d,page:'providers',providerQuery:'',providerCategory:'Tesisat'});
 assert.match(html,/Example Company/);
 assert.match(html,/data-action="provider_category"/);
});

test('editing a provider also edits the note shown below its card without creating another person/provider',()=>{
 const form=buildV3Form({data:d,mode:'connected'},'provider',{id:provider});
 assert.match(form.body,/name="categories"/);
 assert.match(form.body,/value="Elektrik" checked/);
 assert.match(form.body,/value="Tesisat" checked/);
 assert.match(form.body,/name="edit_note_body"/);
 assert.match(form.body,/Existing visible note/);
 const values=[['name','Example Company'],['status','preferred'],['edit_note_id',noteId],['edit_note_body','Updated visible note'],['categories','Elektrik'],['categories','Tesisat']];
 const input={get:k=>values.find(x=>x[0]===k)?.[1]||null,getAll:k=>values.filter(x=>x[0]===k).map(x=>x[1]),has:k=>values.some(x=>x[0]===k),[Symbol.iterator]:function*(){yield* values;}};
 const result=payloadV3('provider',input,form.context);
 assert.deepEqual(result.categories,['Elektrik','Tesisat']);
 assert.equal(result.id,provider);
 assert.equal(result.edit_note_id,noteId);
 assert.equal(result.edit_note_body,'Updated visible note');
});

test('category management allows adding, renaming and guarded deletion',()=>{
 const form=buildV3Form({data:d,mode:'connected'},'provider_category');
 assert.match(form.body,/value="add"/);
 assert.match(form.body,/value="rename"/);
 assert.match(form.body,/value="delete"/);
 const p=payloadV3('provider_category',new Map([['operation','rename'],['category_id',id(11)],['category_name','Elektrik / Akım']]),form.context);
 assert.equal(p.operation,'rename');
 assert.equal(p.category_id,id(11));
 assert.equal(p.name,'Elektrik / Akım');
});

test('database migration includes protected RPCs, backfill, and note update audit',async()=>{
 const sql=await readFile(new URL('../supabase/migrations/20261031172000_multi_provider_categories.sql',import.meta.url),'utf8');
 assert.match(sql,/update public\.ay3_providers set categories=array\[category\]/);
 assert.match(sql,/create or replace function public\.ay3_save_provider/);
 assert.match(sql,/create or replace function public\.ay3_manage_provider_category/);
 assert.match(sql,/Category is in use/);
 assert.match(sql,/provider_note_edit_before/);
 assert.match(sql,/cardinality\(cats\) is distinct from submitted/);
 assert.match(sql,/not ay2_private\.can\(p_site,'people'\)/);
 assert.match(sql,/alter table public\.ay3_provider_categories enable row level security/);
});
