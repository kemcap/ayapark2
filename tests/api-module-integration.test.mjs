import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {AyaparkApi} from '../api.mjs';

test('released controllers can reach their declared RPCs through the real authenticated API client',async()=>{
 const files=['app.mjs','management-tasks-ui.mjs','archive-ui.mjs','budget-planning-ui.mjs','levy-review-ui.mjs','period-closing-ui.mjs','report-release-ui.mjs'];const names=new Set();
 for(const file of files){const source=await readFile(new URL('../'+file,import.meta.url),'utf8');for(const m of source.matchAll(/(?:rpc|call)\('(ay[0-9]_[a-z0-9_]+)'/g))names.add(m[1]);}
 assert(names.size>=35);const calls=[],api=new AyaparkApi(async(url,options)=>{calls.push({url,options});return new Response('{}',{headers:{'Content-Type':'application/json'}});});api.token=async()=> 'synthetic-integration-token';
 for(const name of names){await api.rpc(name,{p_site:'synthetic-site'});const last=calls.at(-1);assert(last.url.endsWith('/rest/v1/rpc/'+name),name);assert.equal(last.options.headers.Authorization,'Bearer synthetic-integration-token');assert.equal(last.options.method,'POST');}
 const before=calls.length;await assert.rejects(()=>api.rpc('unlisted_privileged_function',{}));assert.equal(calls.length,before);
});

test('RPC results are discarded when the authenticated session changes during a request',async()=>{const api=new AyaparkApi(async()=>{api.generation++;return new Response('{}');});api.token=async()=> 'synthetic-token';await assert.rejects(()=>api.rpc('ay6_document_workspace',{p_site:'synthetic-site'}));});
