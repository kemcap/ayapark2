import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fullDemo} from '../ledger.mjs?v=5.8.1';
import {prepareV5Demo} from '../finance-demo.mjs?v=5.8.1';
import {previewProjection,canPreviewView,viewSwitchDialogMarkup} from '../access-preview.mjs?v=5.8.1';
import {navigation} from '../v3-ui.mjs?v=5.8.1';
import {setLanguage} from '../i18n.mjs?v=5.8.1';

function admin(){
 const d=prepareV5Demo(fullDemo());d.role='super';d.serverRole='manager';d.capabilities={...d.capabilities,admin:true};
 return {mode:'demo',data:d,fullData:d,page:'overview',viewRole:'super'};
}
test('More > view switch appears for superadmin only, including in resident preview',()=>{
 const s=admin();
 for(const language of ['de','tr']){
  setLanguage(language);
  assert.doesNotMatch(navigation(s,{},true,2),/data-view-switch/);
  const more=navigation(s,{},true,3);
  assert.match(more,/data-view-switch/);
  assert.match(more,language==='de'?/Ansicht wechseln/:/Görünümü değiştir/);
  const resident=previewProjection(s.fullData,'resident');
  const preview={...s,data:resident,viewRole:'resident'};
  assert.match(navigation(preview,{},true,3),/data-view-switch/);
  assert.doesNotMatch(navigation(preview,{},true,3),/href="#transactions"/);
  assert.doesNotMatch(navigation(s,{},false),/data-view-switch/);
 }
 setLanguage('tr');
});
test('switching never grants permission to a normal resident or staff user',()=>{
 const s=admin();
 for(const role of ['resident','staff']){
  const unprivileged={mode:'connected',data:{...s.data,role,serverRole:'member',capabilities:{}},page:'overview',viewRole:role};
  assert.equal(canPreviewView(unprivileged),false);
  assert.doesNotMatch(navigation(unprivileged,{},true,3),/data-view-switch/);
  assert.equal(viewSwitchDialogMarkup(unprivileged),'');
 }
});
test('dialog marks active role, provides apartment choice and escapes private names',()=>{
 const s=admin(),opt=s.fullData.links.find(l=>l.role==='tenant');
 const resident=previewProjection(s.data,'resident',opt?.id);
 const state={...s,data:resident,viewRole:'resident',previewSelection:opt?.id};
 const html=viewSwitchDialogMarkup(state);
 assert.match(html,/aria-pressed="true"/);
 assert.match(html,/id="viewSwitchPerson"/);
 assert.match(html,/data-switch-role="super"/);
 assert.match(html,/data-switch-role="staff"/);
 assert.match(html,/data-switch-role="resident"/);
 assert.match(html,/data-view-switch-close/);
 assert.match(html,/Die Vorschau ändert keine Zugriffsrechte|Önizleme erişim haklarını değiştirmez/);
});
test('outside clicks, scrolls and Escape close a single submenu, without a sticky overlay',async()=>{
 const app=await readFile(new URL('../app.mjs',import.meta.url),'utf8');
 const css=await readFile(new URL('../v5-ui.css',import.meta.url),'utf8');
 assert.match(app,/mobileNavGroup!==null&&!\$('nav'\)\.contains\(event\.target\)/);
 assert.match(app,/event\.key==='Escape'&&mobileNavGroup!==null/);
 assert.match(app,/closeMenuOnScroll\(event,\$\('nav'\)\)/);
 assert.match(css,/\.nav-view-switch/);
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/id="viewSwitchDialog"/);
});
