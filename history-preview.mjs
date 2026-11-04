import {getLanguage} from './i18n.mjs?v=5.10.0';

// Progressive disclosure only: no data is removed, and current roles and financial totals stay visible.
export const HISTORY_PREVIEW_LIMIT=4;

export function newestHistoryFirst(rows){
 return [...(rows||[])].sort((a,b)=>{
  const latest=x=>String(x?.starts_on||x?.archived_at||x?.updated_at||'');
  return latest(b).localeCompare(latest(a));
 });
}

export function renderHistoryPreview(rows,render,{limit=HISTORY_PREVIEW_LIMIT,inline=false}={}){
 if(!Array.isArray(rows)||!rows.length)return '';
 const visibleCount=Math.max(1,Math.floor(Number(limit)||HISTORY_PREVIEW_LIMIT));
 const visible=rows.slice(0,visibleCount).map(render).join('');
 if(rows.length<=visibleCount)return visible;
 const rest=rows.slice(visibleCount),language=getLanguage(),count=rest.length;
 const show=language==='tr'?count+' geçmiş kaydı daha göster':language==='en'?'Show '+count+' more historical '+(count===1?'entry':'entries'):'Weitere '+count+' historische '+(count===1?'Angabe':'Angaben')+' anzeigen';
 const hide=language==='tr'?'Daha az göster':language==='en'?'Show fewer':'Weniger anzeigen';
 return visible+'<details class="history-fold'+(inline?' history-fold-inline':'')+'"><summary><span class="history-expand-label">'+show+'</span><span class="history-collapse-label">'+hide+'</span></summary><div class="history-fold-content">'+rest.map(render).join('')+'</div></details>';
}
