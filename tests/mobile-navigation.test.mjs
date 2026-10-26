import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fullDemo} from '../ledger.mjs?v=5.6.0';
import {navigation,nextMobileNavGroup} from '../v3-ui.mjs?v=5.6.0';

const view=(role='super')=>({data:{...fullDemo(),role},mode:'demo',page:'units'});
const expandedCount=html=>(html.match(/aria-expanded="true"/g)||[]).length;

test('mobile menu has a single in-flow submenu and starts closed',()=>{
 const html=navigation(view(),{},true);
 assert.equal((html.match(/id="nav-submenu"/g)||[]).length,1);
 assert.equal(expandedCount(html),0);
 assert.match(html,/id="nav-submenu" class="nav-submenu" role="group" hidden/);
 assert.match(html,/aria-controls="nav-submenu"/);
});

test('opening another category replaces its submenu, never stacking panels',()=>{
 const s=view();
 const units=navigation(s,{},true,1);
 const finance=navigation(s,{},true,2);
 assert.equal(expandedCount(units),1);
 assert.equal(expandedCount(finance),1);
 assert.match(units,/href="#persons"/);
 assert.doesNotMatch(units,/href="#transactions"/);
 assert.match(finance,/href="#transactions"/);
 assert.doesNotMatch(finance,/href="#persons"/);
 assert.equal((finance.match(/id="nav-submenu"/g)||[]).length,1);
});

test('tapping the current category closes it; tapping another switches',()=>{
 assert.equal(nextMobileNavGroup(null,1),1);
 assert.equal(nextMobileNavGroup(1,2),2);
 assert.equal(nextMobileNavGroup(2,2),null);
});

test('resident and desktop navigation still show appropriate destinations',()=>{
 const resident=navigation(view('resident'),{},true,3);
 assert.match(resident,/href="#providers"/);
 assert.doesNotMatch(resident,/href="#transactions"/);
 const desktop=navigation(view(),{},false,2);
 assert.match(desktop,/href="#units"/);
 assert.doesNotMatch(desktop,/nav-submenu|data-nav-group/);
});

test('mobile dropdown is in normal document flow rather than an overlay',async()=>{
 const css=await readFile(new URL('../styles.css',import.meta.url),'utf8');
 assert.match(css,/#nav \.nav-submenu\{grid-column:1\/-1;[^\n]*position:static;/);
 assert.match(css,/#nav \.nav-submenu\[hidden\]\{display:none\}/);
});
