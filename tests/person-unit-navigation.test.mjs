import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {linkedUnitButton} from '../people-ui.mjs?v=5.10.0';

test('linked apartment button refers to the exact person and apartment',()=>{
 const state={data:{units:[{id:'unit-a4',code:'A-4'},{id:'unit-b9',code:'B-9'}]}};
 const first=linkedUnitButton(state,{unit_id:'unit-a4',person_id:'person-1'});
 const second=linkedUnitButton(state,{unit_id:'unit-b9',person_id:'person-1'});
 assert.match(first,/data-action="person_unit"/);
 assert.match(first,/data-id="unit-a4"/);
 assert.match(first,/data-person="person-1"/);
 assert.match(second,/data-id="unit-b9"/);
 assert.match(second,/>B-9<\/button>/);
});

test('a removed apartment reference never creates a broken navigation button',()=>{
 const result=linkedUnitButton({data:{units:[]}},{unit_id:'gone',person_id:'person-1'});
 assert.doesNotMatch(result,/data-action="person_unit"/);
});

test('person list and person detail both render apartment buttons',()=>{
 const src=readFileSync(new URL('../people-ui.mjs?v=5.10.0',import.meta.url),'utf8');
 assert.match(src,/showUnit\?\x60<span class="person-unit-reference">\$\{linkedUnitButton\(s,l\)\}/);
 assert.match(src,/person-unit-reference">\$\{linkedUnitButton\(s,l\)\} \$\{role\(l\)\}/);
});

test('navigation retains parent and exposes direct back, close and escape routes',()=>{
 const src=readFileSync(new URL('../app.mjs?v=5.10.0',import.meta.url),'utf8');
 assert.match(src,/function returnFromPersonUnit\(/);
 assert.match(src,/personUnitReturn=\{personId,unitId:id,fromDialog,dialogScroll:/);
 assert.match(src,/dialog\.scrollTop=context\.dialogScroll/);
 assert.match(src,/event\.target\.closest\('#detailDialog .*\.dialog-actions button'\)/);
 assert.match(src,/\$\('detailDialog'\)\.addEventListener\('cancel'/);
 assert.match(src,/if\(origin\.action==='unit'\)showDetail\(linkedUnitDetail\(origin\.id\)\)/);
});
