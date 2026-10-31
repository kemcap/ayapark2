import test from 'node:test';
import assert from 'node:assert/strict';
import {contactPanel} from '../contact-requests.mjs?v=5.10.0';
import {setLanguage} from '../i18n.mjs?v=5.10.0';
const state=admin=>({mode:'connected',data:{userId:'own',capabilities:{admin},contactWorkspace:{persons:[{id:'p',full_name:'<Person>',email:'old@example.invalid',phone:''}],requests:[{id:'r',person_id:'p',requested_by:'own',status:'pending',full_name:'<Person>',previous_email:'old@example.invalid',new_email:'new@example.invalid',new_phone:'<script>bad</script>'}]}}});
test('own pending contact request hides new submission, escapes content and offers withdrawal',()=>{
 setLanguage('de');const html=contactPanel(state(false));assert(html.includes('&lt;Person&gt;'));assert(!html.includes('<script>'));assert(!html.includes('data-contact-request'));assert(html.includes('data-contact-withdraw'));assert(!html.includes('data-contact-review'));assert(html.includes('Passwort bleiben unverändert'));setLanguage('tr');
});
test('reviewer sees both snapshots, independent verification and reason before applying',()=>{
 const html=contactPanel(state(true));for(const part of ['old@example.invalid','new@example.invalid','name="verified"','name="reason"','value="approve"','value="reject"'])assert(html.includes(part));assert(!html.includes('data-contact-withdraw'));
});
test('connected own profile can request a change while demo and signed-out views cannot',()=>{
 const s=state(false);s.data.contactWorkspace.requests=[];assert(contactPanel(s).includes('name="request_id"'));assert(contactPanel(s).includes('name="confirmed"'));assert.equal(contactPanel({...s,mode:'demo'}),'');assert.equal(contactPanel({...s,mode:'signedout'}),'');
});
