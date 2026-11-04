import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('each active browser module has one identity across app and recovery entry points',()=>{
 const root=new URL('../',import.meta.url),visited=new Set(),identities=new Map(),queue=[];
 for(const page of ['index.html','reset.html','export.html','public-reports.html']){
  const html=readFileSync(new URL(page,root),'utf8');
  for(const match of html.matchAll(/<script\b[^>]*src="([^"]+)"/g))queue.push(new URL(match[1],root));
 }
 while(queue.length){
  const url=queue.pop();if(visited.has(url.href))continue;visited.add(url.href);
  if(url.pathname.endsWith('.mjs')){
   const keys=identities.get(url.pathname)||new Set();keys.add(url.search);identities.set(url.pathname,keys);
  }
  const source=readFileSync(new URL(url.pathname,url),'utf8');
  for(const match of source.matchAll(/(?:from\s*|import\s*\(?\s*)['"](\.\.?\/[^'"]+\.mjs(?:\?[^'"]*)?)['"]/g))queue.push(new URL(match[1],url));
 }
 assert(identities.size>25,'walk the actual application graph, including shared renderers');
 const duplicates=[...identities].filter(([,keys])=>keys.size>1).map(([path,keys])=>`${path} is loaded with conflicting cache keys: ${[...keys].join(', ')}`);
 assert.deepEqual(duplicates,[],duplicates.join('\n'));
});
