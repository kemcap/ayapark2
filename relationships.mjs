import {today} from './v3-domain.mjs?v=5.6.0';
export function effectiveOccupancy(d,unit,day=today()){
 const events=(d.occupancyChanges||[]).slice().reverse().filter(x=>x.unit_id===unit.id&&x.effective_on<=day).sort((a,b)=>b.effective_on.localeCompare(a.effective_on));return events[0]?.status||unit.occupancy_status;
}
