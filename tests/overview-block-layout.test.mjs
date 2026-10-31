import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fullDemo} from '../ledger.mjs?v=5.8.1';
import {overviewV3} from '../v3-ui.mjs?v=5.9.59';
import {setLanguage,getLanguage} from '../i18n.mjs?v=5.9.28';

test('overview retains two separate blocks with all apartment cards and links',()=>{
 const previous=getLanguage();
 try{
  setLanguage('de');
  const d=fullDemo();
  const html=overviewV3({data:d,mode:'demo'});
  assert.match(html,/class="main-grid overview-main-grid"/);
  assert.equal((html.match(/class="building-block"/g)||[]).length,2);
  assert.equal((html.match(/class="unit-card-grid"/g)||[]).length,2);
  assert.equal((html.match(/class="apartment-card"/g)||[]).length,20);
  assert.match(html,/data-action="unit"/);
 }finally{setLanguage(previous);}
});

test('four columns inside each wide block; automatically two then one by measured container width',async()=>{
 const css=await readFile(new URL('../overview-block-layout.css',import.meta.url),'utf8');
 assert.match(css,/\.overview-main-grid \.building-block,[\s\S]*?container-type:inline-size/);
 assert.match(css,/@container\s*\(min-width:580px\)\s*\{[\s\S]*?grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@container\s*\(max-width:389px\)\s*\{[\s\S]*?grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/@media\(max-width:1000px\)/);
 assert.match(css,/overflow-wrap:anywhere/);
 assert.match(css,/\.overview-main-grid \.apartment-card/);
 assert.doesNotMatch(css,/display:none/);
});

test('1000–1070px desktop keeps four apartment cards by stacking narrow blocks',async()=>{
 const css=await readFile(new URL('../overview-block-layout.css',import.meta.url),'utf8');
 assert.match(css,/container:\s*apartment-overview\s*\/\s*inline-size/);
 assert.match(css,/@container\s+apartment-overview\s*\(max-width:1240px\)\s*\{[\s\S]*?\.overview-main-grid \.building-plan,[\s\S]*?grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/@container\s*\(min-width:580px\)\s*\{[\s\S]*?grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/@container\s*\(max-width:389px\)/);
 // At laptop sizes, the full-width block (not two half-width blocks) contains the four-card grid.
 for(const viewport of [1000,1035,1070]){
  const sidebar=250,gutters=84,cardPadding=32;
  const available=viewport-sidebar-gutters-cardPadding;
  assert(available>=580,'stacked block supports four cards at '+viewport+'px');
  assert(available/2<580,'two half-width blocks would cause two cards at '+viewport+'px');
 }
});

test('dashboard CSS is last after modern and wide-screen overrides and scope excludes Daireler page',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const v3=await readFile(new URL('../v3-ui.mjs',import.meta.url),'utf8');
 const wide=html.indexOf('large-screens.css?v=');
 const custom=html.indexOf('overview-block-layout.css?v=5.9.60');
 assert(wide>=0 && custom>wide);
 assert.match(v3,/main-grid \$\{own\?'resident-main-grid':'overview-main-grid'\}/);
 assert.match(v3,/\$\{\['B','A'\]\.map\(block=>/);
});
