// In-page navigation on the Aidat/Forderungen screen must never change the app's hash route.
// Handles both the current buttons and legacy #dues-* anchors from older cached app code.
const sections=new Set(['dues-claims','dues-payments','dues-analysis','dues-create']);
export function handleDuesNavigationClick(event,doc=typeof document==='undefined'?null:document){
 const control=event.target?.closest?.('[data-dues-jump],.dues-workspace a[href^="#dues-"]');
 if(!control||!control.closest?.('.dues-workspace'))return false;
 const id=control.getAttribute('data-dues-jump')||control.getAttribute('href')?.slice(1);
 if(!sections.has(id))return false;
 const target=doc?.getElementById?.(id);
 if(!target||!target.closest?.('.dues-workspace'))return false;
 // Stop the legacy anchor before hashchange invokes the application's page router.
 event.preventDefault();
 event.stopPropagation();
 if(id==='dues-payments')target.open=true;
 if(id==='dues-analysis')target.querySelector?.('details.category-balance-summary')?.setAttribute('open','');
 const reduced=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 target.scrollIntoView?.({behavior:reduced?'instant':'smooth',block:'start'});
 target.setAttribute?.('tabindex','-1');
 target.focus?.({preventScroll:true});
 return true;
}
if(typeof document!=='undefined'){
 document.addEventListener('click',event=>handleDuesNavigationClick(event),true);
}
