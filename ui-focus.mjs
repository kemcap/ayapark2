// A render replaces controls. Keep keyboard position without stealing focus
// from a dialog or from another control selected while a request was pending.
export function preserveViewFocus(doc=document){
 const active=doc.activeElement;
 if(!active?.closest('#content, #nav'))return ()=>{};
 const id=active.id;
 const keys=['data-range','data-range-field','data-action','data-id','data-page','data-nav-group','data-preference','data-design','data-block','data-year','name','type','value'];
 const attrs=keys.filter(k=>active.hasAttribute(k)).map(k=>[k,active.getAttribute(k)]);
 const start=active.selectionStart,end=active.selectionEnd;
 const ancestors=[];
 for(let n=active.parentElement;n;n=n.parentElement)if(n.tagName==='DETAILS'&&n.id&&n.open)ancestors.push(n.id);
 return ()=>{
  if(active.isConnected||doc.activeElement!==doc.body)return;
  for(const key of ancestors){const el=doc.getElementById(key);if(el)el.open=true;}
  const replacement=id?doc.getElementById(id):attrs.length?[...doc.querySelectorAll('#content button, #content input, #content select, #nav button')].find(n=>attrs.every(([k,v])=>n.getAttribute(k)===v)):null;
  if(replacement&&!replacement.disabled&&replacement.getClientRects().length){
   replacement.focus({preventScroll:true});
   if(start!==null&&start!==undefined&&replacement.setSelectionRange)try{replacement.setSelectionRange(start,end);}catch{}
  }else doc.getElementById('content')?.focus({preventScroll:true});
 };
}
