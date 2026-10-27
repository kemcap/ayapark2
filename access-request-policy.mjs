import {classifyIdentifier} from './auth-policy.mjs?v=5.8.1';
export function accessRequestPayload(input){
 const first=String(input.first_name||'').trim(),last=String(input.last_name||'').trim(),contact=classifyIdentifier(input.contact),unit=String(input.unit_hint||'').trim().toUpperCase();
 if(!first||first.length>70||!last||last.length>70||!contact||contact.kind!==input.contact_kind||unit&&!/^[AB]-(10|[1-9])$/.test(unit))throw Error('invalid_request');
 return {first_name:first,last_name:last,contact_kind:contact.kind,contact:contact.kind==='email'?contact.value.toLowerCase():contact.value,unit_hint:unit};
}
