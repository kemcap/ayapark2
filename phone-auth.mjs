// Strict international storage; only unambiguous Turkish national forms are expanded.
export function normalizePhone(input){
 let n=String(input||'').trim().replace(/[\s().-]/g,'');
 if(n.startsWith('00'))n='+'+n.slice(2);
 if(/^05\d{9}$/.test(n))n='+90'+n.slice(1);
 if(/^5\d{9}$/.test(n))n='+90'+n;
 if(/^90\d{10}$/.test(n))n='+'+n;
 if(!/^\+[1-9]\d{7,14}$/.test(n))throw Error('invalid_phone');
 return n;
}
export function maskPhone(phone){const n=normalizePhone(phone);return n.slice(0,3)+' ••• ••• '+n.slice(-4);}
export function activationToken(location,history){
 const token=new URLSearchParams(location.hash.slice(1)).get('invite')||'';
 history.replaceState(null,'',location.pathname);
 return /^[a-f0-9]{64}$/.test(token)?token:'';
}
export class PhoneAccess {
 constructor(api){this.api=api;}
 async call(action,body={},authenticated=false){return this.api.raw('/functions/v1/ay-phone-access','POST',{action,...body},authenticated?await this.api.token():undefined);}
 async verify(invite,code){
  if(!/^\d{6}$/.test(code))throw Error('invalid_code');
  const generation=this.api.generation;
  const result=await this.call('verify',{invite,code});
  // Session is released by the server only after phone proof AND invitation checks.
  this.api.accept(result.session,generation);return result;
 }
}
