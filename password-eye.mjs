import {t as tr} from './i18n.mjs?v=5.0.0';
const eye='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
export function bindPasswordEyes(root=document){
 const update=b=>{const input=document.getElementById(b.dataset.passwordEye),shown=input.type==='text';b.innerHTML=eye;b.setAttribute('aria-pressed',String(shown));b.setAttribute('aria-label',tr(shown?'Şifreyi gizle':'Şifreyi göster'));b.title=b.getAttribute('aria-label');};
 for(const b of root.querySelectorAll('[data-password-eye]')){
  update(b);b.addEventListener('click',()=>{const input=document.getElementById(b.dataset.passwordEye);input.type=input.type==='password'?'text':'password';update(b);});
 }
 document.addEventListener('ay2:languagechange',()=>{for(const b of root.querySelectorAll('[data-password-eye]'))update(b);});
 return ()=>{for(const b of root.querySelectorAll('[data-password-eye]')){document.getElementById(b.dataset.passwordEye).type='password';update(b);}};
}
