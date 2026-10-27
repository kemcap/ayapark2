import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../large-screens.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('large-screen CSS is loaded last without altering phone/tablet styles',()=>{
 const index=html.indexOf('large-screens.css?v=');
 assert(index>html.indexOf('v5-ui.css?v='),'widescreen CSS must follow all existing CSS');
 assert.equal((html.match(/large-screens\.css\?v=/g)||[]).length,1);
 assert.match(css,/@media screen and \(min-width:1440px\)/);
 assert.match(css,/@media screen and \(min-width:1920px\)/);
 assert.match(css,/@media screen and \(min-width:2560px\)/);
 assert.match(css,/@media screen and \(min-width:3200px\)/);
 assert.doesNotMatch(css,/@media[^\{]*max-width/i,'widescreen CSS must not override narrow layouts');
});

test('both design modes gain fluid width and readable unit-card grids',()=>{
 assert.match(css,/main#content\s*\{\s*max-width:1640px/);
 assert.match(css,/:root\[data-design="modern"\] main#content/);
 assert.match(css,/max-width:var\(--ay-wide-max\)/);
 assert.match(css,/--ay-wide-max:2840px/);
 assert.match(css,/\.building-plan,\s*:root\[data-design="modern"\] \.building-plan/);
 assert.match(css,/\.unit-card-grid,\s*:root\[data-design="modern"\] \.unit-card-grid/);
 assert.match(css,/repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/main#content \.table-wrap/);
});

test('large layout keeps login narrow and never mutates scripts or authorization',()=>{
 assert.match(css,/body\.signed-out main#content/);
 assert.match(css,/max-width:800px/);
 assert(!css.includes('!important'));
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'balanced CSS blocks');
});
