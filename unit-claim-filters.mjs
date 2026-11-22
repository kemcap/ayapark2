import {money} from './core.mjs?v=perf1';

// Pure predicates keep the presentation filter independent from accounting data.
export function matchesUnitClaimFilter(claim,{role='all',person='all'}={}){
 const claimRole=String(claim.role||'unassigned');
 const claimPerson=String(claim.person||'unassigned');
 return (role==='all'||role===claimRole)&&(person==='all'||person===claimPerson);
}
export function filteredUnitClaimTotals(claims,filters={}){
 const visible=claims.filter(claim=>matchesUnitClaimFilter(claim,filters));
 return {
  visible,
  count:visible.filter(claim=>claim.open).length,
  cents:visible.filter(claim=>claim.open).reduce((sum,claim)=>sum+Math.max(0,Number(claim.cents)||0),0)
 };
}
export function applyUnitClaimFilters(workspace){
 if(!workspace)return;
 const scope=workspace.querySelector('[data-unit-finance-panel="debts"]');
 if(!scope)return;
 const role=scope.querySelector('[data-unit-claim-filter="role"]')?.value||'all';
 const person=scope.querySelector('[data-unit-claim-filter="person"]')?.value||'all';
 const nodes=[...scope.querySelectorAll('.ay-finance-claim[data-unit-claim-person]')];
 const summary=filteredUnitClaimTotals(nodes.map(node=>({
  node,role:node.dataset.unitClaimRole,person:node.dataset.unitClaimPerson,
  open:node.dataset.unitClaimOpen==='1',cents:Number(node.dataset.unitClaimCents)
 })),{role,person});
 for(const node of nodes)node.hidden=!summary.visible.some(item=>item.node===node);
 const subtotal=scope.querySelector('[data-unit-claim-subtotal]');
 const count=scope.querySelector('[data-unit-claim-count]');
 if(subtotal)subtotal.textContent=money(summary.cents);
 const suffix=count?.dataset.unitCountSuffix||'';
 if(count)count.textContent=' · '+summary.count+' '+suffix;
 const empty=scope.querySelector('[data-unit-claim-empty]');
 if(empty)empty.hidden=summary.visible.length>0;
 const paidSection=scope.querySelector('.ay-finance-settled');
 if(paidSection)paidSection.hidden=!summary.visible.some(item=>!item.open);
 return summary;
}
