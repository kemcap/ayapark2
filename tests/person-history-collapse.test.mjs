import test from 'node:test';
import assert from 'node:assert/strict';
import {newestHistoryFirst,renderHistoryPreview,HISTORY_PREVIEW_LIMIT} from '../history-preview.mjs';
import {setLanguage} from '../i18n.mjs?v=5.10.0';

test('up to four historical entries stay fully visible with no extra disclosure',()=>{
 setLanguage('de');
 for(let count=0;count<=HISTORY_PREVIEW_LIMIT;count++){
  const rows=Array.from({length:count},(_,i)=>({id:'history-'+i}));
  const html=renderHistoryPreview(rows,r=>'<article>'+r.id+'</article>');
  assert.equal((html.match(/<article>/g)||[]).length,count);
  assert(!html.includes('history-fold'));
 }
});
test('a long history shows four entries and makes the rest expandable',()=>{
 setLanguage('de');
 const rows=Array.from({length:10},(_,i)=>({id:'history-'+i}));
 const html=renderHistoryPreview(rows,r=>'<article>'+r.id+'</article>');
 assert.equal((html.match(/<article>/g)||[]).length,10);
 assert.equal((html.split('history-fold-content')[0].match(/<article>/g)||[]).length,4);
 assert.match(html,/<details class="history-fold">/);
 assert.match(html,/Weitere 6 historische Angaben anzeigen/);
 assert.match(html,/Weniger anzeigen/);
});
test('other languages and inline layout use same accessible native details',()=>{
 const rows=Array.from({length:5},(_,i)=>({id:i}));
 setLanguage('tr');
 const tr=renderHistoryPreview(rows,r=>'<span>'+r.id+'</span>',{inline:true});
 assert.match(tr,/1 geçmiş kaydı daha göster/);
 assert.match(tr,/history-fold-inline/);
 setLanguage('en');
 const en=renderHistoryPreview(rows,r=>'<span>'+r.id+'</span>');
 assert.match(en,/Show 1 more historical entry/);
 setLanguage('de');
});
test('history sorted newest first without mutating the original data',()=>{
 const rows=[{id:'early',starts_on:'2021-01-01'},{id:'late',starts_on:'2025-01-01'},{id:'medium',starts_on:'2023-02-01'}];
 assert.deepEqual(newestHistoryFirst(rows).map(x=>x.id),['late','medium','early']);
 assert.equal(rows[0].id,'early');
});
