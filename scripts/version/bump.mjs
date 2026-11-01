// AYAPARK 2 release versioning: one source of truth in package.json.
// Usage: node scripts/version/bump.mjs [patch|minor|major] [description]
import {readFileSync,writeFileSync} from 'node:fs';
const level=process.argv[2]||'patch';
if(!['patch','minor','major'].includes(level))throw Error('Expected patch, minor or major');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const [major,minor,patch]=pkg.version.split('.').map(Number);
if(![major,minor,patch].every(Number.isInteger))throw Error('Invalid package version');
const next=level==='major'?\`\${major+1}.0.0\`:level==='minor'?\`\${major}.\${minor+1}.0\`:\`\${major}.\${minor}.\${patch+1}\`;
pkg.version=next;
writeFileSync('package.json',JSON.stringify(pkg,null,2)+'\\n');
let html=readFileSync('index.html','utf8');
html=html.replace(/(<title>Ayapark 2 · Site Yönetimi )V[0-9]+\\.[0-9]+(?:\\.[0-9]+)?/, '$1V'+next)
 .replace(/(id=\"previewBanner\"[^>]*>)V[0-9]+\\.[0-9]+(?:\\.[0-9]+)?/, '$1V'+next)
 .replace(/(<span class=\"version\">)v[0-9]+\\.[0-9]+(?:\\.[0-9]+)?/, '$1v'+next)
 .replace(/(<footer>AYAPARK 2 <span>)V[0-9]+\\.[0-9]+(?:\\.[0-9]+)?/, '$1V'+next);
writeFileSync('index.html',html);
console.log('AYAPARK 2 V'+next);
