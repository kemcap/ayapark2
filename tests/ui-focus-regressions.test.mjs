import test from 'node:test';
import assert from 'node:assert/strict';
import {preserveViewFocus} from '../ui-focus.mjs';
import {enhanceTables} from '../ui-accessibility.mjs';
import {transactionTableV3} from '../v3-ui.mjs';
import {setLanguage} from '../i18n.mjs?v=5.10.0';
import {fullDemo} from '../ledger.mjs';
import {bindPasswordEyes} from '../password-eye.mjs';

function focusFixture(attrs={id:'search'}){
 const body={},doc={body,querySelectorAll:()=>[replacement]},old={...attrs,isConnected:true,selectionStart:2,selectionEnd:4,parentElement:null,closest:()=>true,hasAttribute:k=>k in attrs,getAttribute:k=>attrs[k]};
 const replacement={disabled:false,getClientRects:()=>[{}],getAttribute:k=>attrs[k],focus(){doc.activeElement=this;},setSelectionRange(start,end){this.selection=[start,end];}};
 doc.activeElement=old;doc.getElementById=()=>replacement;
 return {doc,old,replacement,remove(){old.isConnected=false;doc.activeElement=body;}};
}
test('replacing a search field restores focus and the selection range',()=>{
 const h=focusFixture(),restore=preserveViewFocus(h.doc);h.remove();restore();
 assert.equal(h.doc.activeElement,h.replacement);assert.deepEqual(h.replacement.selection,[2,4]);
});
test('rendering does not move focus away from another chosen control or a dialog',()=>{
 const h=focusFixture(),restore=preserveViewFocus(h.doc),other={};h.remove();h.doc.activeElement=other;restore();assert.equal(h.doc.activeElement,other);
});
test('appearance and range controls without IDs are matched by their stable attributes',()=>{
 for(const attrs of [{'data-preference':'font'},{'data-range':'report','data-range-field':'from'}]){
  const h=focusFixture(attrs),restore=preserveViewFocus(h.doc);h.remove();restore();assert.equal(h.doc.activeElement,h.replacement);
 }
});
test('colspan advances the next mobile cell label to its actual column',()=>{
 const headers=['A','B','C'].map(textContent=>({textContent,hasAttribute:()=>true}));
 const cells=[{colSpan:2,dataset:{}},{colSpan:1,dataset:{}}];
 enhanceTables({querySelectorAll:()=>[{querySelectorAll:q=>q==='thead th'?headers:[{children:cells}]}]});
 assert.equal(cells[1].dataset.label,'C');assert.deepEqual(cells[0].dataset,{});
});
test('empty bank filters explain the result and keep both page buttons disabled in every language',()=>{
 for(const language of ['tr','de','en']){
  setLanguage(language);
  const s={data:fullDemo(),mode:'demo',filter:{q:'zz-no-matching-record',preset:'all',type:'all'},bankPage:8};
  const html=transactionTableV3(s);
  assert.match(html,/colspan="5"/);assert.match(html,/role="status"/);
  assert.match(html,/data-action="bank_previous" disabled/);assert.match(html,/data-action="bank_next" disabled/);
  assert(!html.includes('undefined'));assert.match(html,language==='tr'?/Kayıt bulunamadı/:language==='de'?/Eintrag nicht gefunden/:/Record not found/);
 }
 setLanguage('tr');
});
test('password controls bind once, identify their input and hide the password on dialog close',()=>{
 const handlers={},input={id:'password',type:'password'},attributes={},button={dataset:{passwordEye:'password'},setAttribute:(k,v)=>attributes[k]=v,getAttribute:k=>attributes[k],addEventListener:(k,v)=>handlers['button:'+k]=v};
 const root={querySelectorAll:()=>[button],getElementById:()=>input,addEventListener:(k,v)=>handlers[k]=v};
 const hide=bindPasswordEyes(root);assert.equal(bindPasswordEyes(root),hide);
 handlers['button:click']();assert.equal(input.type,'text');assert.equal(attributes['aria-controls'],'password');
 handlers.close({target:{matches:()=>true,querySelector:()=>button}});assert.equal(input.type,'password');assert.equal(attributes['aria-pressed'],'false');
});
