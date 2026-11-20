// Shared validation only. No credentials, network calls or account lookup.
export const MIN_PASSWORD_LENGTH=6;
export const MAX_PASSWORD_LENGTH=256;
export function newPasswordError(value){
 if(typeof value!=='string'||[...value].length<MIN_PASSWORD_LENGTH)return 'short';
 if([...value].length>MAX_PASSWORD_LENGTH)return 'long';
 return null; // Passwords are never trimmed or silently rewritten.
}
export function normalizePhone(input){
 const raw=String(input||'').trim();if(!raw||raw.length>80||!/^[+()\d\s./-]+$/.test(raw))return '';
 let digits=raw.replace(/\D/g,'');if(digits.startsWith('00'))digits=digits.slice(2);
 if(digits.length===10&&digits.startsWith('5'))digits='90'+digits;
 else if(digits.length===11&&digits.startsWith('05'))digits='90'+digits.slice(1);
 return /^[1-9]\d{9,14}$/.test(digits)?'+'+digits:'';
}
// Apply selected country only to national numbers; preserve international input and emails.
export function loginWithCountry(input,countryCode){
 const raw=String(input||'').trim(),code=String(countryCode||'');
 if(!/^[1-9]\d{0,3}$/.test(code)||!raw||raw.includes('@')||!/^[+()\d\s./-]+$/.test(raw))return raw;
 // A country is only applied to national numbers; + and 00 always win.
 if(raw.startsWith('+')||raw.startsWith('00'))return raw;
 const digits=raw.replace(/\D/g,'');
 if(digits.length<6||digits.length>15)return raw;
 // Italy's national trunk 0 is part of the international subscriber number.
 if(digits.startsWith('0'))return digits.length>1?'+'+code+(code==='39'?digits:digits.slice(1)):raw;
 // NANP Caribbean islands use +1 plus a three-digit area prefix. Accept
 // both 7-digit local and 10-digit area+local numbers with territory selected.
 if(/^1\d{3}$/.test(code)){
  if(digits.startsWith(code)&&digits.length>=11)return '+'+digits;
  if(digits.startsWith(code.slice(1))&&digits.length===10)return '+1'+digits;
  if(digits.startsWith('1')&&digits.length===11)return '+'+digits;
 }
 if(digits.startsWith(code)&&digits.length>=code.length+9)return '+'+digits;
 // Keep existing bare international prefixes, previously accepted by login.
 if(digits.length>=11&&/^(90|49|43|41|44|33|31|32)/.test(digits))return '+'+digits;
 if(code==='1'&&digits.startsWith('1')&&digits.length===11)return '+'+digits;
 return '+'+code+digits;
}
export function classifyIdentifier(input){
 const raw=String(input||'').trim();if(raw.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw))return {kind:'email',value:raw};
 const phone=normalizePhone(raw);return phone?{kind:'phone',value:phone}:null;
}
