import {getLanguage} from './i18n.mjs?v=5.9.28';
export const isRegistered=person=>person?.registered===true;
export function registrationStatus(person){
 const registered=isRegistered(person),de=getLanguage()==='de';
 return `<span class="registration-status ${registered?'registered':'unregistered'}"><span class="registration-dot" aria-hidden="true"></span>${de?(registered?'Registriert':'Nicht registriert'):(registered?'Kayıtlı':'Kayıtlı değil')}</span>`;
}
