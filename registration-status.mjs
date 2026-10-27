import {t} from './i18n.mjs?v=5.8.1';
// auth_user_id is a database foreign key to auth.users, set after activation.
// Pending invitation tokens never participate in this status.
export const registered=person=>Boolean(person?.auth_user_id);
export function registrationStatus(state,person){
 if(!person||!(state.data.capabilities?.people||state.mode==='demo'&&state.data.role==='super'))return '';
 const ready=registered(person);
 return `<span class="registration-status ${ready?'registered':'unregistered'}"><span class="registration-dot" aria-hidden="true"></span>${t(ready?'Kayıtlı':'Kayıtlı değil')}</span>`;
}
