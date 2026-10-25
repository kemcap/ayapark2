// Idempotent enhancement shared by page and dialog tables.
export function enhanceTables(root){
 for(const table of root.querySelectorAll('table')){
  const headers=Array.from(table.querySelectorAll('thead th'));
  headers.forEach(th=>{if(!th.hasAttribute('scope'))th.setAttribute('scope','col');});
  for(const row of table.querySelectorAll('tbody tr'))Array.from(row.children).forEach((cell,i)=>{
   if(cell.colSpan>1)return;
   if(headers[i])cell.dataset.label=headers[i].textContent.trim();
  });
 }
}
