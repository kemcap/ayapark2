import assert from 'node:assert/strict';

// Safe production smoke checks. Never provisions an account, sends mail or reveals secrets.
const endpoint='https://eisozwhhinqszfikemot.supabase.co/functions/v1/ay3-whatsapp-invite';
const checks=[
 {name:'invalid signed token is rejected when signing key exists',payload:{action:'inspect',token:'a.b'},status:410,error:'expired_or_invalid'},
 {name:'unauthenticated invitation creation is rejected',payload:{action:'create',person_id:'00000000-0000-4000-8000-000000000000'},status:401,error:'sign_in_required'}
];
for(const check of checks) {
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(check.payload)});
 const data=await response.json();
 assert.equal(response.status,check.status,check.name+': unexpected HTTP status '+response.status+' '+JSON.stringify(data));
 assert.equal(data.error,check.error,check.name+': unexpected error '+JSON.stringify(data));
 console.log('PASS '+check.name);
}
