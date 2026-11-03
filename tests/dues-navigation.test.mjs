import test from 'node:test';
import assert from 'node:assert/strict';
import {handleDuesNavigationClick} from '../dues-navigation.mjs';

function simulate(id,{legacy=false,inside=true,hasTarget=true}={}){
 let prevented=false,stopped=false,scrolled=false,focused=false,expanded=false;
 const element={
  getAttribute:name=>name==='data-dues-jump'?(legacy?null:id):name==='href'?(legacy?'#'+id:null):null,
  closest:selector=>selector==='.dues-workspace'?(inside?{}:null):null
 };
 const target={
  open:false,
  closest:selector=>selector==='.dues-workspace'?{}:null,
  querySelector:()=>({setAttribute:()=>{expanded=true;}}),
  scrollIntoView:()=>{scrolled=true;},
  setAttribute:()=>{},
  focus:()=>{focused=true;}
 };
 const event={target:{closest:()=>element},preventDefault:()=>{prevented=true;},stopPropagation:()=>{stopped=true;}};
 const doc={getElementById:key=>hasTarget&&key===id?target:null};
 const accepted=handleDuesNavigationClick(event,doc);
 return {accepted,prevented,stopped,scrolled,focused,expanded,opened:target.open};
}
for(const id of ['dues-claims','dues-payments','dues-analysis','dues-create']){
 test('in-page '+id+' button does not navigate to overview',()=>{
  const result=simulate(id);
  assert.equal(result.accepted,true);
  assert.equal(result.prevented,true);
  assert.equal(result.stopped,true);
  assert.equal(result.scrolled,true);
  assert.equal(result.focused,true);
  assert.equal(result.opened,id==='dues-payments');
  assert.equal(result.expanded,id==='dues-analysis');
 });
 test('legacy #'+id+' link from cached code is intercepted before hash router',()=>{
  const result=simulate(id,{legacy:true});
  assert.equal(result.accepted,true);
  assert.equal(result.prevented,true);
  assert.equal(result.stopped,true);
 });
}
test('reject links outside the dues page and unknown targets',()=>{
 assert.equal(simulate('overview').accepted,false);
 assert.equal(simulate('dues-claims',{inside:false}).accepted,false);
 assert.equal(simulate('dues-claims',{hasTarget:false}).accepted,false);
});
