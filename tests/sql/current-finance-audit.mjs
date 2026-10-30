import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {loadCurrentSchema} from './current-schema.mjs';
const db=new PGlite();let passed=0,failed=0;
try{
 await loadCurrentSchema(db);
 for(const file of ['charge-period.sql','audit-finance.sql']){
  try{
   const output=await db.exec(await readFile(new URL('../'+file,import.meta.url),'utf8'));
   for(const result of output)for(const row of result.rows||[]){const summary=row.jsonb_build_object;if(summary?.results)for(const item of summary.results){if(item.passed===true)passed++;else{failed++;console.error('FAIL',file,item.test||item.name);}}else if(row.result){console.log(file,row.result);}}
  }catch(error){failed++;console.error('ERROR',file,error.message);await db.exec('rollback;reset role');}
 }
 console.log(JSON.stringify({passed,failed,scope:'current relevant released SQL functions; synthetic charge periods, financial corrections, cash/report reconciliation and permission revocation'}));
}finally{await db.close();}process.exitCode=failed?1:0;
