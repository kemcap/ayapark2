// Idempotent enhancement shared by page and dialog tables.
export function enhanceTables(root){
 for(const table of root.querySelectorAll('table')){
  const headers=Array.from(table.querySelectorAll('thead th'));
  headers.forEach(th=>{if(!th.hasAttribute('scope'))th.setAttribute('scope','col');});
  for(const row of table.querySelectorAll('tbody tr')){
   let column=0;
   for(const cell of row.children){
    const span=cell.colSpan||1;
    if(span===1&&headers[column])cell.dataset.label=headers[column].textContent.trim();
    column+=span;
   }
  }
 }
}
