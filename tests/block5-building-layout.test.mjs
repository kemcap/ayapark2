import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fullDemo} from '../ledger.mjs?v=5.8.1';
import {unitMapV3} from '../v3-ui.mjs?v=5.8.1';
import {setLanguage} from '../i18n.mjs?v=5.8.1';

const readCss = name => readFile(new URL('../' + name, import.meta.url), 'utf8');
const twoColumns = /\.unit-card-grid\{(?:[^{}]*?)grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/;
const responsiveBlocks = /\.building-plan\{[^{}]*grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,560px\),1fr\)\)/;

test('both themes use content width to place B and A alongside or stacked', async () => {
  for (const name of ['styles.css', 'modern.css']) {
    const css = await readCss(name);
    assert.match(css, responsiveBlocks, name);
    assert.match(css, twoColumns, name);
  }
});

test('no single/three-column apartment overrides remain at mobile or desktop breakpoints', async () => {
  for (const name of ['styles.css', 'modern.css']) {
    const css = await readCss(name);
    assert.doesNotMatch(css, /\.unit-card-grid\{grid-template-columns:repeat\(3,/);
    assert.doesNotMatch(css, /\.unit-card-grid\{grid-template-columns:(?:1fr|minmax\(0,1fr\))(?=[;}])/);
  }
});

test('small screens retain two inner apartment columns and wrapping text', async () => {
  const css = await readCss('styles.css');
  assert.match(css, /@media\(max-width:540px\)\{\.unit-card-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.building-plan \.apartment-balance[^{}]*\{min-width:0;overflow-wrap:anywhere\}/);
  const modern = await readCss('modern.css');
  assert.match(modern, /@media\(max-width:360px\)[^\n]*\.unit-card-grid\{gap:7px\}/);
});

test('the render order stays B left, A right in Turkish and German', () => {
  const data = fullDemo();
  const state = {mode:'demo', page:'units', data};
  for (const language of ['tr', 'de']) {
    setLanguage(language);
    const html = unitMapV3(state);
    const blocks = [...html.matchAll(/<section class="building-block"><h3>([AB]) /g)].map(match => match[1]);
    assert.deepEqual(blocks, ['B', 'A']);
    assert.equal((html.match(/class="unit-card-grid"/g) || []).length, 2);
    assert.equal((html.match(/class="apartment-card"/g) || []).length, 20);
  }
  setLanguage('tr');
});

test('layout release references a new stylesheet revision', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /styles\.css\?v=5\.8\.2/);
  assert.match(html, /modern\.css\?v=5\.8\.2/);
});
