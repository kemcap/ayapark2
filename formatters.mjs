// Cache Intl configuration only: never amounts, dates, user data or permissions.
// Bounded to avoid unbounded growth if a caller supplies many currency codes.
const numbers=new Map(),dates=new Map();
function remember(cache,key,create){
 if(cache.has(key))return cache.get(key);
 const value=create();
 if(cache.size>=24)cache.delete(cache.keys().next().value);
 cache.set(key,value);return value;
}
export function currencyFormatter(language,currency){
 return remember(numbers,JSON.stringify([language,currency]),()=>new Intl.NumberFormat(language,{style:'currency',currency,currencyDisplay:'narrowSymbol',maximumFractionDigits:2}));
}
export function dateFormatter(language,kind='date'){
 return remember(dates,JSON.stringify([language,kind]),()=>new Intl.DateTimeFormat(language,kind==='day'?{timeZone:'Europe/Istanbul'}:kind==='month'?{month:'long',year:'numeric',timeZone:'Europe/Istanbul'}:{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Istanbul'}));
}
