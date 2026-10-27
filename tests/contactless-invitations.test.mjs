import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inviteEligible,inviteText,whatsappShareUrl} from '../invite-ui.mjs?v=5.8.1';
import {loginIdentifier} from '../api.mjs?v=5.8.1';

test('superadmin can invite a linked person with no phone or email',()=>{
 const p={id:'p1',full_name:'Synthetic',phone:'',email:'',auth_user_id:null};
 const s={mode:'connected',data:{role:'super',persons:[p],links:[{unit_id:'A-1',person_id:'p1',role:'tenant',active:true}],units:[{id:'A-1',code:'A-1'}]}};
 assert.equal(inviteEligible(s,p),true);
 assert.equal(inviteEligible({...s,data:{...s.data,role:'staff'}},p),false);
 assert.equal(inviteEligible({...s,data:{...s.data,role:'resident'}},p),false);
 assert.equal(whatsappShareUrl('', 'text'),'');
 for(const language of ['tr','de'])assert.match(inviteText({name:'Synthetic',units:'A-1',contactKind:'link',language}),/Telefon veya e-posta gerekli değil|Keine Telefonnummer oder E-Mail erforderlich/);
});

test('login code maps to internal Auth email without changing existing email/phone logins',()=>{
 assert.equal(loginIdentifier('AY2-ABCDEFGHJKMN'),'resident-code-abcdefghjkmn@ayapark2.invalid');
 assert.equal(loginIdentifier('ay2-abcdefghjkmn'),'resident-code-abcdefghjkmn@ayapark2.invalid');
 assert.equal(loginIdentifier('05421112233'),'resident-905421112233@ayapark2.invalid');
 assert.equal(loginIdentifier('normal@example.com'),'normal@example.com');
});

test('invitation dialog offers link-only by default for contactless resident and identifier capture',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const ui=await readFile(new URL('../invite-ui.mjs',import.meta.url),'utf8');
 assert.match(html,/id="inviteContactKind"><option value="link"/);
 assert.match(html,/id="inviteIdentifierDialog"/);
 assert.match(html,/id="inviteGeneratedIdentifier"/);
 assert.match(ui,/person\.phone\?'phone':person\.email\?'email':'link'/);
 assert.match(ui,/kind==='phone'&&!phone/);
 assert.match(ui,/contact_kind:kind/);
 assert.match(ui,/inviteIdentifierDialog/);
});

test('server preserves manual approval, strong token, single-use expiry and safe generated identifier',async()=>{
 const edge=await readFile(new URL('../supabase/functions/ay3-whatsapp-invite/index.ts',import.meta.url),'utf8');
 const sql=await readFile(new URL('../supabase/migrations/20261027135000_contactless_invite_alias.sql',import.meta.url),'utf8');
 assert.match(edge,/kind==='link'/);
 assert.match(edge,/crypto\.getRandomValues\(new Uint8Array\(12\)\)/);
 assert.match(edge,/ay_auth_issue_email_invite/);
 assert.match(edge,/\.eq\('role','manager'\)/);
 assert.match(edge,/confirmed!==true/);
 assert.match(edge,/token_hash/);
 assert.match(sql,/WHEN ticket\.email ~/);
 assert.match(sql,/THEN email ELSE coalesce\(ticket\.email,email\)/);
 assert.match(sql,/revoke all on function public\.ay3_redeem_phone_invite/);
});
