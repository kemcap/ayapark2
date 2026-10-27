import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mayPreview,previewProjection,residentPreviewOptions} from '../access-preview.mjs?v=5.8.1';

const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../v5-ui.css',import.meta.url),'utf8');
const script=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
const source=()=>({
 role:'super',serverRole:'manager',
 capabilities:{admin:true,people:true,finance:true,import:true,announcements:true},
 units:[{id:'qa-u1',code:'A-1'},{id:'qa-u2',code:'B-1'}],
 links:[{id:'qa-l1',unit_id:'qa-u1',person_id:'qa-p1',role:'owner',active:true}],
 persons:[{id:'qa-p1',full_name:'QA Person'}],
 transactions:[],charges:[],allocations:[],credits:[],staged:[],
 occupancyChanges:[],announcements:[],providers:[],permissions:[],staff:[],residentAccounts:[]
});
test('topbar contains the roles selector directly before the language flag',()=>{
 const topbar=index.split('<header class="topbar">')[1].split('</header>')[0];
 assert(topbar.indexOf('id="roleControl"')>=0);
 assert(topbar.indexOf('id="roleControl"')<topbar.indexOf('id="languageToggle"'));
 for(const role of ['super','staff','resident'])assert.match(topbar,new RegExp('value="'+role+'"'));
 assert.equal((index.match(/id="roleSelect"/g)||[]).length,1);
 assert.equal((index.match(/id="residentPreviewSelect"/g)||[]).length,1);
 assert(index.indexOf('id="previewTargetBar"')>index.indexOf('id="accessPreviewBanner"'));
});
test('CSS no longer forces preview controls hidden; mobile layout keeps them by the flag',()=>{
 assert.doesNotMatch(css,/#roleControl,#residentPreviewControl\s*\{display:none!important\}/);
 assert.match(css,/\.header-actions\.has-role-preview\s+#languageToggle\s*\{margin-right:auto\}/);
 assert.match(css,/#roleSelect\s*\{width:clamp\(/);
 assert.match(css,/\.header-actions\s+\.role-preview-control\[hidden\]\s*\{display:none!important\}/);
});
test('superadmin is authorized to preview while management and residents are not',()=>{
 const d=source();assert(mayPreview(d));
 assert(!mayPreview({...d,role:'staff'}));
 assert(!mayPreview({...d,role:'resident'}));
 assert(!mayPreview({...d,capabilities:{admin:false}}));
});
test('role projections are isolated from the superadmin data and cannot grant admin rights',()=>{
 const d=source();
 const asManager=previewProjection(d,'staff');
 assert.equal(asManager.role,'staff');
 assert.equal(asManager.capabilities.admin,false);
 assert.equal(d.capabilities.admin,true);
 const targets=residentPreviewOptions(d);
 assert(targets.some(o=>o.unitId==='qa-u1'));
 const asResident=previewProjection(d,'resident',targets[0].id);
 assert.equal(asResident.role,'resident');
 assert.equal(asResident.capabilities.admin,false);
 assert.equal(asResident.units.length,1);
 assert.equal(d.units.length,2);
 assert.equal(previewProjection(d,'super'),d);
});
test('live role previews have a separate resident target bar and preserve write protections',()=>{
 assert.match(script,/residentPreviewVisible|showResidentPreview/);
 assert.match(script,/\$\('previewTargetBar'\)\.hidden=!showResidentPreview/);
 assert.match(script,/isAccessPreview\(\).*?throw Error/s);
 assert.match(script,/\$\('roleSelect'\)\.addEventListener\('change'/);
 assert.match(script,/\$\('residentPreviewSelect'\)\.addEventListener\('change'/);
});
