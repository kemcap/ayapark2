// Focused interaction regression for existing people: no database, authentication, or external calls.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
const root=resolve(new URL('..',import.meta.url).pathname);
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/__picker_test__'){
   res.setHeader('Content-Type','text/html; charset=utf-8');
   res.end('<!doctype html><html lang="de"><meta charset="utf-8"><body><div id="testForm"></div></body></html>');
   return;
  }
  const path=resolve(root,'.'+pathname);
  if(!path.startsWith(root+sep))throw Error('Invalid path');
  res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css'})[extname(path)]||'text/plain');
  res.end(await readFile(path));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/__picker_test__');
 await page.evaluate(async()=>{
  const {personPicker,bindPersonPicker}=await import('/person-picker.mjs?v=20261104-person-picker-fix');
  const people=[{id:'qa-person-1',full_name:'Erkan Akgün',first_name:'Erkan',last_name:'Akgün'},{id:'qa-person-2',full_name:'Sibel Kantarcı',first_name:'Sibel',last_name:'Kantarcı'}];
  const root=document.querySelector('#testForm');
  root.innerHTML=personPicker(people);
  bindPersonPicker(root,people);
 });
 await page.locator('.person-picker-toggle').click();
 const search=page.locator('.person-picker [role=combobox]');
 await search.fill('Erkan');
 const chosen=page.locator('.person-picker [role=option]');
 assert.equal(await chosen.count(),1,'search must match existing person exactly once');
 assert.equal(await chosen.getAttribute('data-picker-id'),'qa-person-1');
 await chosen.click();
 assert.equal(await page.locator('.person-picker [name=person_id]').inputValue(),'qa-person-1','pointer selection must survive focus change');
 assert(await page.locator('#personPickerPopup').isHidden(),'popup must close after selection');
 await page.locator('.person-picker-toggle').click();
 await search.fill('Sibel');
 await search.press('ArrowDown');
 await search.press('Enter');
 assert.equal(await page.locator('.person-picker [name=person_id]').inputValue(),'qa-person-2','keyboard selection must work');
 await page.locator('.person-picker-toggle').click();
 await search.press('Escape');
 assert(await page.locator('#personPickerPopup').isHidden(),'Escape must close popup');
 assert.deepEqual(errors,[],'no browser errors');
 console.log('Focused picker regression passed: mouse click, keyboard selection, Escape, no page errors');
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
