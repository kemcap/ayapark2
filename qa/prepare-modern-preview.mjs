// Build a disconnected demo from the same UI. Never run this against a production deployment directory.
import {cp,mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if(!process.argv[2])throw Error('Provide a separate preview project directory.');
const destination=resolve(process.argv[2]);
if(destination===root||destination.startsWith(root+'/'))throw Error('Use a separate preview project.');
const dist=resolve(destination,'dist');await mkdir(dist,{recursive:true});
for(const f of await readdir(root))if(/\.(mjs|js|html|css|csv|txt|webmanifest)$/.test(f))await cp(resolve(root,f),resolve(dist,f));
await cp(resolve(root,'assets'),resolve(dist,'assets'),{recursive:true});
for(const file of ['index.html','reset.html']){
 const path=resolve(dist,file);let html=await readFile(path,'utf8');
 if(!html.includes('name="ayapark-stage" content="production"'))throw Error('Missing production stage marker.');
 html=html.replace('name="ayapark-stage" content="production"','name="ayapark-stage" content="preview"')
  .replace(/connect-src [^;]+;/,"connect-src 'none';")
  .replace('<script src="./design-boot.js">','<meta name="ayapark-design-default" content="modern">\n<script src="./design-boot.js">');
 await writeFile(path,html);
}
// Preserve an existing Site identity; initialization and audience are managed by Sites.
console.log('Prepared Modern demo. Stage: preview; connect-src: none; synthetic demo data only.');
