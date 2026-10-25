import test from 'node:test';
import assert from 'node:assert/strict';
import {readDesign,setDesign,getDesign,designKey,designSettings} from '../design.mjs?v=4.1.0';
import {decorateModernPage} from '../modern-ui.mjs?v=4.1.0';
import {renderPage} from '../ui.mjs?v=4.1.0';
import {fullDemo} from '../ledger.mjs?v=4.1.0';
import {setLanguage} from '../i18n.mjs?v=4.1.0';
import {cleanPreferences,preferenceDefaults} from '../preferences.mjs?v=4.1.0';

test('design choice tolerates unavailable storage and rejects invalid persisted values',()=>{
 assert.equal(readDesign({getItem:()=>{throw Error('blocked');}}),'classic');
 for(const value of [null,'','<script>','unknown'])assert.equal(readDesign({getItem:()=>value}),'classic');
 assert.equal(readDesign({getItem:key=>key===designKey?'modern':null}),'modern');
});
test('cosmetic design selection persists locally and does not enter account preferences',()=>{
 const writes=[];setDesign('modern',{storage:{setItem:(...args)=>writes.push(args)}});
 assert.deepEqual(writes,[[designKey,'modern']]);assert.equal(getDesign(),'modern');
 assert.equal(setDesign('invalid'),'modern');
 assert.deepEqual(cleanPreferences({...preferenceDefaults,design:'modern'}),preferenceDefaults);
 setDesign('classic',{persist:false});
});
test('private storage failure and transient selection remain usable',()=>{
 assert.doesNotThrow(()=>setDesign('modern',{storage:{setItem:()=>{throw Error('quota');}}}));
 const writes=[];setDesign('classic',{storage:{setItem:(...args)=>writes.push(args)},persist:false});
 assert.deepEqual(writes,[]);assert.equal(getDesign(),'classic');
});
test('classic output is unchanged; modern retains the exact business markup',()=>{
 const body='<div class="page-heading"><h1>Overview</h1><div class="heading-actions"></div></div><article data-id="A-1">1800 TRY</article>';
 setDesign('classic',{persist:false});assert.equal(decorateModernPage({page:'overview'},body),body);
 setDesign('modern',{persist:false});const result=decorateModernPage({page:'overview'},body);
 assert.ok(result.indexOf('<h1>')<result.indexOf('<h2>'));assert.match(result,/<article data-id="A-1">1800 TRY<\/article>/);
 assert.equal((result.match(/class="modern-hero"/g)||[]).length,1);
 assert.doesNotMatch(decorateModernPage({page:'dues'},body),/class="modern-hero"/);
});
test('all shared role/page renderers retain their content under modern decoration',()=>{
 for(const role of ['super','staff','resident'])for(const page of ['overview','dues','reports','announcements','providers','settings',...(role==='resident'?[]:['units','persons','transactions'])]){
 const state={data:{...fullDemo(),role},mode:'demo',page,period:'2026-10',filter:{q:'',block:'all',status:'all',type:'all',preset:'all'},reportFilter:{preset:'all'}};
 setDesign('classic',{persist:false});const classic=renderPage(state);
 setDesign('modern',{persist:false});const modern=renderPage(state);
 if(page==='overview'){const strip=modern.replace(/<section class="modern-hero"[\s\S]*?<\/section>/,'');assert.equal(strip,`<div class="modern-page modern-overview">${classic}</div>`);}
 else if(page!=='settings')assert.equal(modern,`<div class="modern-page ">${classic}</div>`);
 }
 setDesign('classic',{persist:false});
});
test('design controls use translated labels and accessible pressed state',()=>{
 setLanguage('de');setDesign('modern',{persist:false});assert.match(designSettings(),/aria-pressed="true">Modern/);assert.match(designSettings(),/Design wählen/);
 setLanguage('tr');assert.match(designSettings(),/Tasarım seçin/);setDesign('classic',{persist:false});
});

test('pre-paint bootstrap keeps classic default, validates storage, and supports disconnected Modern preview',async()=>{
 const {readFile}=await import('node:fs/promises');const {runInNewContext}=await import('node:vm');
 const source=await readFile(new URL('../design-boot.js',import.meta.url),'utf8');
 for(const [saved,preview,expected] of [[null,false,'classic'],['modern',false,'modern'],['invalid',false,'classic'],[null,true,'modern'],['classic',true,'classic']]){
  const root={dataset:{}};runInNewContext(source,{document:{documentElement:root,querySelector:()=>preview?{content:'modern'}:null},localStorage:{getItem:()=>saved}});assert.equal(root.dataset.design,expected);
 }
 const root={dataset:{}};runInNewContext(source,{document:{documentElement:root,querySelector:()=>null},localStorage:{getItem:()=>{throw Error('denied');}}});assert.equal(root.dataset.design,'classic');
});
