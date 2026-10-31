import {t as tr} from './i18n.mjs?v=5.10.0';
const eye='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const bindings=new WeakMap();
export function bindPasswordEyes(root=document){
 if(bindings.has(root))return bindings.get(root);
 const doc=root.ownerDocument||root;
 const update=b=>{const input=doc.getElementById(b.dataset.passwordEye);if(!input)return;const shown=input.type==='text';b.innerHTML=eye;b.setAttribute('aria-controls',input.id);b.setAttribute('aria-pressed',String(shown));b.setAttribute('aria-label',tr(shown?'Şifreyi gizle':'Şifreyi göster'));b.title=b.getAttribute('aria-label');};
 for(const b of root.querySelectorAll('[data-password-eye]')){
  update(b);b.addEventListener('click',()=>{const input=doc.getElementById(b.dataset.passwordEye);if(!input)return;input.type=input.type==='password'?'text':'password';update(b);});
 }
 doc.addEventListener('ay2:languagechange',()=>{for(const b of root.querySelectorAll('[data-password-eye]'))update(b);});
 const hide=()=>{for(const b of root.querySelectorAll('[data-password-eye]')){const input=doc.getElementById(b.dataset.passwordEye);if(input)input.type='password';update(b);}};
 doc.addEventListener('close',event=>{if(event.target.matches?.('dialog')&&event.target.querySelector('[data-password-eye]'))hide();},true);
 doc.defaultView?.addEventListener('pagehide',hide);
 bindings.set(root,hide);return hide;
}
