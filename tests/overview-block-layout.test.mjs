import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('dashboard apartment overview displays two equal desktop block columns',async()=>{
 const css=await readFile(new URL('../overview-block-layout.css',import.meta.url),'utf8');
 const desktop=css.match(/@media\s*\(min-width:1001px\)\s*\{([\s\S]*?)\/\* Preserve readable apartment tiles/);
 assert(desktop,'desktop media rule must exist');
 assert.match(desktop[1],/\.overview-main-grid \.building-plan/);
 assert.match(desktop[1],/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(desktop[1],/\.main-grid\.overview-main-grid/);
 assert.match(desktop[1],/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(desktop[1],/:root\[data-design="modern"\]/);
});

test('apartment blocks stack on mobile and narrow laptop cards do not overflow',async()=>{
 const css=await readFile(new URL('../overview-block-layout.css',import.meta.url),'utf8');
 assert.match(css,/@media\s*\(max-width:1000px\)/);
 assert.match(css,/@media\s*\(min-width:1001px\) and \(max-width:1499px\)/);
 assert.match(css,/\.overview-main-grid \.unit-card-grid/);
 assert.match(css, /\.overview-main-grid \.building-plan,[\s\S]*?grid-template-columns:minmax\(0,1fr\)/);
});

test('layout override is loaded after modern theme and targets the existing dashboard only',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const v3=await readFile(new URL('../v3-ui.mjs',import.meta.url),'utf8');
 const modern=html.indexOf('modern.css?v=');
 const custom=html.indexOf('overview-block-layout.css?v=5.9.55');
 assert(modern>=0 && custom>modern);
 assert.match(v3,/main-grid \$\{own\?'resident-main-grid':'overview-main-grid'\}/);
 assert.match(v3,/\$\{\['B','A'\]\.map\(block=>/);
});
