import test from 'node:test';
import assert from 'node:assert/strict';
import {COUNTRY_CALLING_CODES,countryCallingCode,localizedCallingCountries,findCountryFromInternational} from '../phone-country-codes.mjs?v=20261120-worldwide';

test('country data covers countries and overseas territories with valid E.164 prefixes',()=>{
 assert(COUNTRY_CALLING_CODES.length>=245);
 assert.equal(new Set(COUNTRY_CALLING_CODES.map(x=>x[0])).size,COUNTRY_CALLING_CODES.length);
 for(const [iso,code,name] of COUNTRY_CALLING_CODES){
  assert.match(iso,/^[A-Z]{2}$/);assert.match(code,/^[1-9][0-9]{0,3}$/);
  assert(name.length>=2);
 }
 for(const [iso,code] of [['TR','90'],['DE','49'],['US','1'],['CA','1'],['IT','39'],['FR','33'],['XK','383'],['ME','382'],['AC','247'],['TA','290'],['BS','1242']]){
  assert.equal(countryCallingCode(iso),code);
 }
});

test('country names, flags, E.164 display and phone-prefix inference work',()=>{
 for(const lang of ['tr','de','en']){
  const countries=localizedCallingCountries(lang);
  assert.equal(countries.length,COUNTRY_CALLING_CODES.length);
  assert(countries.some(c=>c.iso==='DE'&&c.name.length>0&&c.flag.length>0));
 }
 assert.equal(findCountryFromInternational('+4915112345678'),'DE');
 assert.equal(findCountryFromInternational('004915112345678'),'DE');
 assert.equal(findCountryFromInternational('+905321234567'),'TR');
 assert.equal(findCountryFromInternational('+12425551234'),'BS');
 assert.equal(findCountryFromInternational('015112345678'),'');
 assert.equal(findCountryFromInternational('someone@example.com'),'');
});
