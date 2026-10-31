import test from 'node:test';
import assert from 'node:assert/strict';
import {chargeDraftPanel} from '../charge-drafts.mjs?v=5.10.0';
const state=admin=>({data:{capabilities:{admin},units:[{id:'u',code:'A-1'}],links:[{id:'l',person_id:'p'}],persons:[{id:'p',full_name:'Synthetic owner'}],chargeDrafts:[{id:'draft',status:'pending',payload:{label:'<script>bad</script>',due_on:'2026-11-01',basis_ref:'QA decision',expected:{u:12345},debtors:{u:'l'}}}]}});
test('approval view includes amount, debtor, unit, due date and basis, with escaped content',()=>{const html=chargeDraftPanel(state(true));for(const text of ['A-1','Synthetic owner','2026-11-01','QA decision','123,45','&lt;script&gt;'])assert(html.includes(text));assert(!html.includes('<script>'));assert(html.includes('data-draft-decision="approve"'));});
test('delegated and completed drafts never show approval controls',()=>{assert(!chargeDraftPanel(state(false)).includes('data-draft-decision'));const s=state(true);s.data.chargeDrafts[0].status='approved';assert(!chargeDraftPanel(s).includes('data-draft-decision'));});
