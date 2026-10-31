import {uiText} from './language-text.mjs?v=5.10.0';
import {getLanguage} from './i18n.mjs?v=5.10.0';
export const isRegistered=person=>person?.registered===true;
export function registrationStatus(person){
 const registered=isRegistered(person),de=getLanguage()==='de';
 return `<span class="registration-status ${registered?'registered':'unregistered'}"><span class="registration-dot" aria-hidden="true"></span>${(getLanguage()==='tr'?(registered?'Kayıtlı':'Kayıtlı değil'):(registered?uiText("Registriert",getLanguage()):uiText("Nicht registriert",getLanguage())))}</span>`;
}
