import test from 'node:test';
import assert from 'node:assert/strict';
import {dayBefore,suggestedOwnerEnd,displayedOwnerEnd,ownerHistoryIssues} from '../owner-history.mjs';
const p=(id,name,start,ends=null,active=false)=>({id,unit_id:'A8',person_id:name,role:'owner',active,starts_on:start,ends_on:ends,archive_reason:active?null:'historical_import'});
test('former owner end date is day before next owner starts, across years',()=>{
 const links=[p('erkan','erkan','2025-03-01'),p('ertan','ertan','2026-04-15',null,true)];
 assert.equal(suggestedOwnerEnd(links,'A8','2025-03-01','erkan'),'2026-04-14');
 assert.deepEqual(displayedOwnerEnd(links,links[0]),{date:'2026-04-14',automatic:true});
 assert.equal(dayBefore('2025-03-01'),'2025-02-28');
 assert.equal(dayBefore('2024-03-01'),'2024-02-29');
});
test('co-owner relationship is not used as its own successor',()=>{
 const links=[p('e1','erkan','2025-03-01'),p('e2','erkan','2025-03-01'),p('e3','ertan','2026-04-15',null,true)];
 assert.equal(suggestedOwnerEnd(links,'A8','2025-03-01','erkan'),'2026-04-14');
 assert.deepEqual(ownerHistoryIssues(links,'A8').duplicateIds,['e2']);
});
test('different units do not affect period and manual dates are preserved',()=>{
 const old=p('old','erkan','2025-03-01','2026-03-30');
 const next={...p('other','ertan','2025-04-15',null,true),unit_id:'A2'};
 assert.equal(suggestedOwnerEnd([old,next],'A8','2025-03-01','erkan'),null);
 assert.deepEqual(displayedOwnerEnd([old,next],old),{date:'2026-03-30',automatic:false});
});
test('overlapping manual periods are flagged instead of silently overwritten',()=>{
 const links=[p('old','erkan','2025-03-01','2026-05-01'),p('new','ertan','2026-04-15',null,true)];
 assert.deepEqual(ownerHistoryIssues(links,'A8').overlaps,['old']);
});
