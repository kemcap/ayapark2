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
export function classifyIdentifier(input){
 const raw=String(input||'').trim();if(raw.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw))return {kind:'email',value:raw};
 const phone=normalizePhone(raw);return phone?{kind:'phone',value:phone}:null;
}
