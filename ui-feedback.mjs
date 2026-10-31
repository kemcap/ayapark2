export function fieldError(message,field){return Object.assign(new Error(message),{field});}
export function clearFieldError(input){
 if(!input)return;input.removeAttribute('aria-invalid');
 const id=input.dataset.errorId;if(!id)return;
 const ids=(input.getAttribute('aria-describedby')||'').split(/\s+/).filter(x=>x&&x!==id);
 if(ids.length)input.setAttribute('aria-describedby',ids.join(' '));else input.removeAttribute('aria-describedby');
 input.ownerDocument.getElementById(id)?.remove();delete input.dataset.errorId;
}
export function showFormError(form,summary,error){
 summary.textContent=error.message;summary.classList.add('error');summary.setAttribute('role','alert');summary.tabIndex=-1;
 const candidates=error.field?Array.from(form.elements).filter(n=>n.name===error.field&&!n.disabled):[];
 const input=candidates.find(n=>n.checked)||candidates[0];
 if(input){
  clearFieldError(input);const doc=input.ownerDocument,id='field-error-'+form.id+'-'+input.name;
  const note=doc.createElement('p');note.id=id;note.className='field-error';note.textContent=error.message;
  input.dataset.errorId=id;input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby',((input.getAttribute('aria-describedby')||'')+' '+id).trim());
  const picker=input.type==='hidden'?input.closest('.person-picker'):null;
  (picker||input.closest('label.field')||input).insertAdjacentElement('afterend',note);
  for(let ancestor=input.parentElement;ancestor;ancestor=ancestor.parentElement)if(ancestor.tagName==='DETAILS')ancestor.open=true;
  const target=picker?.querySelector('button')||input;
  if(target!==input){target.dataset.errorId=id;target.setAttribute('aria-invalid','true');target.setAttribute('aria-describedby',[...new Set(((target.getAttribute('aria-describedby')||'')+' '+id).trim().split(/\s+/))].join(' '));}
  if(target.type==='hidden')summary.focus();else target.focus();
 }else summary.focus();
}
