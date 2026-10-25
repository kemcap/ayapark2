import {cp,mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const destination=resolve(process.argv[2]||resolve(root,'../ayapark-v4-qa'));
if(destination===root||destination.startsWith(root+'/'))throw Error('Use a separate QA directory.');
const dist=resolve(destination,'dist'),baseline='7051bf6b0a5e25127d21bf78012c1af894560bfd';
const staticFile=f=>!f.includes('/')&&/\.(mjs|js|css|html|webmanifest|csv|txt)$/.test(f)||f.startsWith('assets/');
for(const f of execFileSync('git',['ls-tree','-r','--name-only',baseline],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(staticFile)){
 const target=resolve(dist,'baseline',f);await mkdir(dirname(target),{recursive:true});await writeFile(target,execFileSync('git',['show',baseline+':'+f],{cwd:root}));
}
await mkdir(resolve(dist,'current'),{recursive:true});
for(const f of await readdir(root))if(staticFile(f)&&f!=='assets')await cp(resolve(root,f),resolve(dist,'current',f));
await cp(resolve(root,'assets'),resolve(dist,'current/assets'),{recursive:true});
for(const f of ['index.html','frame.html','frame.mjs','harness.mjs'])await cp(resolve(root,'qa',f),resolve(dist,f));
await cp(resolve(root,'node_modules/axe-core/axe.min.js'),resolve(dist,'axe.min.js'));
await mkdir(resolve(destination,'.openai'),{recursive:true});await writeFile(resolve(destination,'.openai/hosting.json'),JSON.stringify({static:{directory:'dist'}},null,2));
console.log('Prepared isolated QA at '+destination+'. Uses synthetic demo data only.');
