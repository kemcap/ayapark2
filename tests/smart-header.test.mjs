import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSmartHeaderState} from '../smart-header.mjs?v=5.9.49';

test('header hides on deliberate downward scrolling and reappears after a short upward scroll',()=>{
 const state=createSmartHeaderState();
 assert.equal(state.update(0),false);
 assert.equal(state.update(50,{headerHeight:70}),false); // near top, no accidental hide
 assert.equal(state.update(110,{headerHeight:70}),true);
 assert.equal(state.update(135,{headerHeight:70}),true);
 assert.equal(state.update(125,{headerHeight:70}),true); // less than upward threshold
 assert.equal(state.update(114,{headerHeight:70}),false);
 assert.equal(state.update(113,{headerHeight:70}),false);
 assert.equal(state.update(165,{headerHeight:70}),true);
});

test('scroll direction changes reset the threshold and top always reveals the header',()=>{
 const state=createSmartHeaderState({initialY:100});
 assert.equal(state.update(130),false);
 assert.equal(state.update(128),false);
 assert.equal(state.update(150),false); // 22 downward is less than 36
 assert.equal(state.update(170),true);
 assert.equal(state.update(4),false);  // back to top is always visible
 assert.equal(state.update(0),false);
});

test('open header controls, keyboard focus and manual reveal override the hidden state',()=>{
 const state=createSmartHeaderState();
 assert.equal(state.update(140),true);
 assert.equal(state.update(180,{locked:true}),false);
 assert.equal(state.update(240),true);
 state.reveal(240);
 assert.equal(state.isHidden(),false);
 assert.equal(state.update(250),false);
});

test('both desktop and mobile use sticky layout without disabling reduced motion or print rules',async()=>{
 const css=await readFile(new URL('../smart-header.css',import.meta.url),'utf8');
 const app=await readFile(new URL('../app.mjs',import.meta.url),'utf8');
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(css,/position:sticky/);
 assert.match(css,/top:0/);
 assert.match(css,/translate3d\(0,calc\(-100% - 2px\),0\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/@media print/);
 assert.match(app,/installSmartHeader\(\)/);
 assert.match(html,/smart-header\.css\?v=5\.9\.49/);
});
