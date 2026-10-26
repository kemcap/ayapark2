import assert from 'node:assert/strict';
const endpoint='https://eisozwhhinqszfikemot.supabase.co/functions/v1/ay3-site-open-claims';
async function post(headers={}){
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:'{}'});
 return {status:response.status,body:await response.json()};
}
const missing=await post();
assert.equal(missing.status,401,JSON.stringify(missing));
assert.equal(missing.body.error,'sign_in_required');
console.log('PASS unauthenticated visitor cannot read open claims');
const invalid=await post({Authorization:'Bearer invalid-public-test-token'});
assert.equal(invalid.status,401,JSON.stringify(invalid));
assert.equal(invalid.body.error,'invalid_session');
console.log('PASS bogus bearer token cannot read open claims');
const wrongOrigin=await post({Origin:'https://other.example'});
assert.equal(wrongOrigin.status,403,JSON.stringify(wrongOrigin));
assert.equal(wrongOrigin.body.error,'forbidden_origin');
console.log('PASS foreign origin cannot read site aggregate');
