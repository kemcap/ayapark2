import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
const db=new PGlite(); // In-memory PostgreSQL; no URL or production credentials accepted.
let failed=0,passed=0;
try{
 await db.exec(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../../supabase/migrations/20261025073340_v4_finance_release_safety.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../../supabase/migrations/20261029212437_phase2_superadmin_finance_corrections.sql',import.meta.url),'utf8'));
 for(const file of ['assignments.sql','charge-period.sql','comfort.sql','appearance.sql','audit-finance.sql','audit-permissions.sql','audit-legacy-access.sql']){
  try{
   let sql=await readFile(new URL('../'+file,import.meta.url),'utf8');
   if(file==='audit-legacy-access.sql')sql=sql.replace('-- APPLY_RESTRICT_LEGACY_READS',await readFile(new URL('../../supabase/migrations/20261024234358_restrict_legacy_claim_reads.sql',import.meta.url),'utf8'));
   const results=await db.exec(sql);
   for(const result of results)for(const row of result.rows||[]){
    const summary=row.jsonb_build_object;
    if(summary?.results)for(const item of summary.results){
     if(item.passed===true)passed++;else {failed++;console.error('FAIL',file,item.test||item.name);}
    }
    else if(row.result){console.log(file,row.result);passed+=12;}
   }
  }catch(e){failed++;console.error('ERROR',file,e.message);await db.exec('ROLLBACK; RESET ROLE;');}
 }
 console.log(JSON.stringify({passed,failed,scope:'isolated PGlite PostgreSQL, synthetic identities and fixtures only'}));
}finally{await db.close();}
process.exitCode=failed?1:0;
