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
 const input=error.field?Array.from(form.elements).find(n=>n.name===error.field&&!n.disabled):null;
 if(input){
  clearFieldError(input);const doc=input.ownerDocument,id='field-error-'+form.id+'-'+input.name;
  const note=doc.createElement('p');note.id=id;note.className='field-error';note.textContent=error.message;
  input.dataset.errorId=id;input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby',((input.getAttribute('aria-describedby')||'')+' '+id).trim());
  (input.closest('label.field')||input).insertAdjacentElement('afterend',note);input.closest('details')?.setAttribute('open','');input.focus();
 }else summary.focus();
}
