import {readFile} from 'node:fs/promises';

// Selected released migrations for isolated authorization/finance regression tests.
// This is a synthetic fixture, not a complete production schema export.
export async function loadCurrentSchema(db,{personalHistory=true,bankImport=true,periodClosings=true,levyReview=true,budgetPlanning=true}={}){
 for(const path of ['schema.sql','../../supabase/migrations/20261025073340_v4_finance_release_safety.sql','../../supabase/migrations/20261025194333_v5_notifications_finance.sql','../../supabase/migrations/20261026061016_visible_expired_announcements.sql','../../supabase/migrations/20261026_email_free_whatsapp_activation.sql','../../supabase/auth-phase3.sql','../../supabase/auth-phase4.sql','../../supabase/auth-phase5.sql','../../supabase/auth-phase6.sql','../../supabase/auth-phase8.sql'])await db.exec(await readFile(new URL(path,import.meta.url),'utf8'));
 await db.exec(`alter table auth.users add column encrypted_password text,add column last_sign_in_at timestamptz,add column email_confirmed_at timestamptz,add column phone_confirmed_at timestamptz,add column deleted_at timestamptz,add column banned_until timestamptz;`);
 for(const path of ['../../supabase/migrations/20261027174427_people_invitation_eligibility.sql','../../supabase/migrations/20261027174611_people_registration_status.sql','../../supabase/migrations/20261027174807_personal_history_access.sql'])await db.exec(await readFile(new URL(path,import.meta.url),'utf8'));
 await db.exec('alter table public.ay3_persons add column if not exists archived_at timestamptz');
 for(const path of ['../../supabase/migrations/20261029170756_unit_debt_visibility_owner_tenant_mutual.sql','../../supabase/migrations/20261029171432_unit_debt_self_identity_marker.sql'])await db.exec(await readFile(new URL(path,import.meta.url),'utf8'));
 for(const path of ['../../supabase/migrations/20261029212437_phase2_superadmin_finance_corrections.sql','../../supabase/migrations/20261029214410_phase2_task_grants_charge_drafts.sql','../../supabase/migrations/20261029221256_phase2_draft_workflow_integration.sql','../../supabase/migrations/20261030044641_phase2_task_rights_enforcement.sql','../../supabase/migrations/20261030045738_phase2_critical_finance_legacy_guard.sql','../../supabase/migrations/20261030063848_phase2_contact_change_requests.sql'])await db.exec(await readFile(new URL(path,import.meta.url),'utf8'));
 if(personalHistory)await db.exec(await readFile(new URL('../../supabase/personal-history-scope.sql',import.meta.url),'utf8'));
 if(periodClosings)await db.exec(await readFile(new URL('../../supabase/period-closing.sql',import.meta.url),'utf8'));
 if(bankImport)await db.exec(await readFile(new URL('../../supabase/bank-import-dedup.sql',import.meta.url),'utf8'));
 if(levyReview)await db.exec(await readFile(new URL('../../supabase/levy-review.sql',import.meta.url),'utf8'));
 if(budgetPlanning&&levyReview){await db.exec(await readFile(new URL('../../supabase/budget-planning.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../../supabase/admin-request-privacy.sql',import.meta.url),'utf8'));}
}
