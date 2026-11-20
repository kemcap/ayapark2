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
 const raw=String(input||'').trim();
 if(!/^(90|49|43|41|44|33|31|32|1)$/.test(String(countryCode||''))||!raw||raw.includes('@')||!/^[+()\d\s./-]+$/.test(raw))return raw;
 if(raw.startsWith('+')||raw.startsWith('00'))return raw;
 const digits=raw.replace(/\D/g,'');
 if(digits.length<6||digits.length>15)return raw;
 if(digits.startsWith('0'))return digits.length>1?'+'+countryCode+digits.slice(1):raw;
 // Preserve existing bare international dialing prefixes used by older accounts.
 if(digits.length>=11&&/^(90|49|43|41|44|33|31|32)/.test(digits))return '+'+digits;
 if(countryCode==='1'&&digits.startsWith('1')&&digits.length===11)return '+'+digits;
 return '+'+countryCode+digits;
}
export function classifyIdentifier(input){
 const raw=String(input||'').trim();if(raw.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw))return {kind:'email',value:raw};
 const phone=normalizePhone(raw);return phone?{kind:'phone',value:phone}:null;
}
