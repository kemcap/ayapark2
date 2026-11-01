import {readFileSync, writeFileSync} from 'node:fs';
const level=process.argv[2]||'patch';
if(!['patch','minor','major'].includes(level)) throw Error('Choose patch, minor or major');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const parts=pkg.version.split('.').map(Number);
if(parts.length!==3 || !parts.every(Number.isInteger)) throw Error('Invalid version');
if(level==='major'){parts[0]++;parts[1]=0;parts[2]=0}
else if(level==='minor'){parts[1]++;parts[2]=0}
else parts[2]++;
const next=parts.join('.');
pkg.version=next;
writeFileSync('package.json',JSON.stringify(pkg,null,2)+'\n');
let html=readFileSync('index.html','utf8');
html=html.replace(/(<title>Ayapark 2 · Site Yönetimi )V\d+\.\d+(?:\.\d+)?/,'$1V'+next)
.replace(/(id="previewBanner"[^>]*>)V\d+\.\d+(?:\.\d+)?/,'$1V'+next)
.replace(/(<span class="version">)v\d+\.\d+(?:\.\d+)?/,'$1v'+next)
.replace(/(<footer>AYAPARK 2 <span>)V\d+\.\d+(?:\.\d+)?/,'$1V'+next);
writeFileSync('index.html',html);
console.log('AYAPARK 2 V'+next);
