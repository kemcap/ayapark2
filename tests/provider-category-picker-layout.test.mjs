import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildV3Form,payloadV3} from '../v3-forms.mjs?v=5.10.0';
import {getLanguage,setLanguage} from '../i18n.mjs?v=5.10.0';

const existing={
 data:{
  providers:[{id:'provider-1',name:'Test Service',category:'Elektrik',categories:['Elektrik','Tesisat'],status:'preferred'}],
  providerCategories:[{id:'1',name:'Elektrik'},{id:'2',name:'Tesisat'},{id:'3',name:'Havuz'},{id:'4',name:'Su arıtma'}],
  providerNotes:[],persons:[],links:[]
 }
};
test('service picker displays uniform accessible category cards, retaining existing choices',()=>{
 const previous=getLanguage();
 try{
  setLanguage('de');
  const form=buildV3Form(existing,'provider',{id:'provider-1'});
  assert.match(form.body,/class="provider-category-grid"/);
  assert.match(form.body,/id="providerCategorySelectionCount"[^>]+aria-live="polite"/);
  assert.match(form.body,/2 \/ 8 ausgewählt/);
  assert.equal((form.body.match(/class="provider-category-option"/g)||[]).length,4);
  assert.match(form.body,/<input type="checkbox" name="categories" value="Elektrik" checked>/);
  assert.match(form.body,/<input type="checkbox" name="categories" value="Tesisat" checked>/);
  assert.match(form.body,/<input type="checkbox" name="categories" value="Havuz" >/);
  assert.match(form.body,/class="provider-category-check" aria-hidden="true"/);
  assert.match(form.body,/aria-describedby="providerCategoryHelp"/);
 }finally{setLanguage(previous);}
});

test('new provider retains the preselected cleaning category',()=>{
 const previous=getLanguage();
 try{
  setLanguage('tr');
  const state={data:{...existing.data,providers:[],providerCategories:[{id:'1',name:'Temizlik'},{id:'2',name:'Elektrik'}]}};
  const form=buildV3Form(state,'provider');
  assert.match(form.body,/value="Temizlik" checked/);
  assert.match(form.body,/1 \/ 8 seçildi/);
 }finally{setLanguage(previous);}
});

test('existing multiple selection submits unchanged; maximum eight categories remains enforced',()=>{
 const form=buildV3Form(existing,'provider',{id:'provider-1'});
 const input=new FormData();input.set('name','Test Service');input.set('status','preferred');input.append('categories','Elektrik');
 const p=payloadV3('provider',input,form.context);
 assert.deepEqual(p.categories,['Elektrik']);
 const names=Array.from({length:9},(_,i)=>'Category '+i);
 const many={get:k=>k==='name'?'Test Service':k==='status'?'preferred':'',getAll:k=>k==='categories'?names:[],has:()=>false,*[Symbol.iterator](){yield ['name','Test Service'];}};
 assert.throws(()=>payloadV3('provider',many,form.context),/8/);
});

test('layout is responsive and keyboard-focus accessible without altering unrelated checkboxes',async()=>{
 const css=await readFile(new URL('../provider-categories.css',import.meta.url),'utf8');
 const app=await readFile(new URL('../app.mjs?v=5.10.0',import.meta.url),'utf8');
 const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(css,/\.provider-category-grid\s*\{[\s\S]*?display:grid;[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@container provider-categories \(max-width:410px\)/);
 assert.match(css,/\.provider-category-option:has\(input:checked\)/);
 assert.match(css,/\.provider-category-option:has\(input:focus-visible\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(app,/function updateProviderCategorySelection\(\)/);
 assert.match(app,/event\.target\.name==='categories'.*updateProviderCategorySelection\(\)/);
 assert.match(index,/provider-categories\.css\?v=5\.9\.56/);
});
