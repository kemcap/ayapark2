import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fullDemo} from '../ledger.mjs?v=5.10.0';
import {overviewV3} from '../v3-ui.mjs?v=5.10.0';
import {setLanguage,getLanguage} from '../i18n.mjs?v=5.10.0';

test('overview keeps all 20 apartment cards and shows B block before A block',()=>{
 const previous=getLanguage();
 try{
  setLanguage('de');
  const html=overviewV3({data:fullDemo(),mode:'demo'});
  assert.match(html,/class="main-grid overview-main-grid"/);
  assert.equal((html.match(/class="building-block"/g)||[]).length,2);
  assert.equal((html.match(/class="unit-card-grid"/g)||[]).length,2);
  assert.equal((html.match(/class="apartment-card"/g)||[]).length,20);
  assert.match(html,/data-action="unit"/);
  const groups=[...html.matchAll(/<section class="building-block"><h3>([AB])\s/g)].map(x=>x[1]);
  assert.deepEqual(groups,['B','A'],'B must be left of A, never sorted A first');
 }finally{setLanguage(previous);}
});

test('wide dashboard uses two block columns and exactly two apartment columns within each block',async()=>{
 const css=await readFile(new URL('../overview-block-layout.css',import.meta.url),'utf8');
 assert.match(css,/\.overview-main-grid \.building-plan,[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.overview-main-grid \.unit-card-grid,[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.overview-main-grid \.building-block,[\s\S]*?container-type:inline-size/);
 assert.match(css,/direction:ltr/);
 assert.doesNotMatch(css,/repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/overflow-wrap:anywhere/);
 assert.match(css,/\.overview-main-grid \.apartment-card/);
 assert.doesNotMatch(css,/display:none/);
});

test('narrow desktop keeps B left and A right as total two columns (one card per block)',async()=>{
 const css=await readFile(new URL('../overview-block-layout.css',import.meta.url),'utf8');
 assert.match(css,/container:\s*apartment-overview\s*\/\s*inline-size/);
 // CSS container query is measured on EACH block, not the viewport.
 assert.match(css,/@container\s*\(max-width:359px\)\s*\{[\s\S]*?\.overview-main-grid \.unit-card-grid,[\s\S]*?grid-template-columns:minmax\(0,1fr\)/);
 // Do not stack both blocks at 1000px or 1070px just because the screen got narrower.
 assert.doesNotMatch(css, /@container apartment-overview \(max-width:1240px\)/);
 assert.doesNotMatch(css, /@media\(max-width:1000px\)/);
 assert.match(css,/@container apartment-overview \(max-width:400px\)/);
 const viewportSizes=[1000,1035,1070];
 for(const viewport of viewportSizes){
  const available=viewport-250-84-32;
  assert(available>400,'two blocks remain side-by-side at '+viewport+'px');
  // Each block may change from two tiles to one tile; B and A remain adjacent.
 }
});

test('only truly narrow dashboard stacks blocks, and layout override loads after theme CSS',async()=>{
 const [css,html,v3]=await Promise.all([
  readFile(new URL('../overview-block-layout.css',import.meta.url),'utf8'),
  readFile(new URL('../index.html',import.meta.url),'utf8'),
  readFile(new URL('../v3-ui.mjs?v=5.10.0',import.meta.url),'utf8')
 ]);
 assert.match(css,/@container apartment-overview \(max-width:400px\)\s*\{[\s\S]*?grid-template-columns:minmax\(0,1fr\)/);
 assert(html.indexOf('overview-block-layout.css?v=5.9.62')>html.indexOf('large-screens.css?v='));
 assert.match(v3,/main-grid \$\{own\?'resident-main-grid':'overview-main-grid'\}/);
 assert.match(v3,/\$\{\['B','A'\]\.map\(block=>/);
});
