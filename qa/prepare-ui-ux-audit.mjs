// Isolated, synthetic browser QA. Production source and account data stay untouched.
import {cp,mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if(!process.argv[2])throw Error('Provide a separate absolute QA project directory.');
const destination=resolve(process.argv[2]),dist=resolve(destination,'dist');
if(destination===root||destination.startsWith(root+'/'))throw Error('Use a separate QA project.');
await mkdir(dist,{recursive:true});
for(const name of await readdir(root))if(/\.(mjs|js|html|css|csv|txt|webmanifest)$/.test(name))await cp(resolve(root,name),resolve(dist,name));
for(const name of ['assets','vendor'])await cp(resolve(root,name),resolve(dist,name),{recursive:true});
// Bundle solely for the QA fixture; production continues using native modules.
await build({entryPoints:[resolve(root,'app.mjs')],bundle:true,format:'esm',outfile:resolve(dist,'audit-app.js')});
for(const file of ['index.html','reset.html']){
 const path=resolve(dist,file),source=await readFile(path,'utf8');
 await writeFile(path,source.replace('name="ayapark-stage" content="production"','name="ayapark-stage" content="preview"').replace(/connect-src [^;]+;/,"connect-src 'none';").replace(/\.\/app\.mjs\?v=[\d.]+/,'./audit-app.js'));
}
await cp(resolve(root,'node_modules/axe-core/axe.min.js'),resolve(dist,'axe.min.js'));
await cp(resolve(root,'qa/ui-ux-audit.html'),resolve(dist,'audit.html'));
await cp(resolve(root,'qa/mobile-preview.html'),resolve(dist,'mobile-preview.html'));
await cp(resolve(root,'qa/ui-ux-audit-browser.js'),resolve(dist,'ui-ux-audit-browser.js'));
await writeFile(resolve(dist,'qa-settled.css'),'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}');
await mkdir(resolve(destination,'.openai'),{recursive:true});
const manifestPath=resolve(destination,'.openai/hosting.json');
let manifest={};try{manifest=JSON.parse(await readFile(manifestPath,'utf8'));}catch{}
await writeFile(manifestPath,JSON.stringify({...manifest,static:{directory:'dist'}},null,2));
console.log('Prepared disconnected UI audit at '+destination+'; open /audit.html in the supported preview.');
