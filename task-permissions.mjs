import {getLanguage} from './i18n.mjs?v=5.9.28';
export const taskOptions=()=>[
 ['people_manage','Kişi ve daire bilgilerini düzenle','Personen und Wohnungen bearbeiten'],
 ['occupancy_invite','Sakin değişimi ve davetler','Bewohnerwechsel und Einladungen'],
 ['charges_prepare','Aidat ve ek ödeme taslağı hazırla','Hausgeld und Umlagen vorbereiten'],
 ['bank_reconcile','Banka ödemelerini eşleştir','Bankzahlungen zuordnen'],
 ['announcements_publish','Duyuruları yayımla','Ankündigungen veröffentlichen']
].map(([key,tr,de])=>[key,getLanguage()==='de'?de:tr]);

export function mayUseTaskAction(data,action){
 if(data.capabilities?.admin)return true;
 const grant=data.taskGrants?.find(g=>g.user_id===data.userId);
 if(!grant)return true; // Preserve explicitly unconverted legacy memberships.
 const keys=['batch_charge','monthly_v5'].includes(action)?['charges_prepare']:
 ['allocate','auto_allocate','credit','match_rule'].includes(action)?['bank_reconcile']:
 action==='announcement'?['announcements_publish']:
 ['assignment_add','assignment_remove','assignment_restore','link','edit_link','end_link','unlink','relationship_change','switch_tenant','occupancy','invite_person'].includes(action)?['occupancy_invite']:
 action==='assignment_edit'?['people_manage','occupancy_invite']:
 ['person','provider','provider_note'].includes(action)?['people_manage']:[];
 return keys.some(k=>grant.tasks.includes(k));
}
