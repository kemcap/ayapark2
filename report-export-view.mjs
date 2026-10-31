import {uiText} from './language-text.mjs?v=5.10.0';
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function validateExportModel(model){
 if(!model||!['de','tr','en'].includes(model.language)||typeof model.title!=='string'||!Array.isArray(model.columns)||!model.columns.length||model.columns.length>32||!Array.isArray(model.rows)||model.rows.length>5000||!Array.isArray(model.notes)||model.notes.length>20)throw Error('Invalid export model');
 if(model.rows.some(r=>!Array.isArray(r)||r.length>model.columns.length))throw Error('Invalid export row');
 for(const value of [model.title,...model.columns,...model.notes,...model.rows.flat()])if(value&&typeof value==='object'){if(!Number.isSafeInteger(value.moneyCents))throw Error('Invalid export amount');}else if(typeof value!=='string'||value.length>2000)throw Error('Invalid export text');
 return model;
}
export function exportMarkup(input){
 const m=validateExportModel(input),de=m.language==='de',format=v=>v&&typeof v==='object'?new Intl.NumberFormat((m.language==='tr'?('tr-TR'):(uiText("de-DE",m.language))),{minimumFractionDigits:2,maximumFractionDigits:2}).format(v.moneyCents/100):v;
 return '<h1>'+escape(m.title)+'</h1>'+(m.demo?'<p class="warning">'+((m.language==='tr'?('Örnek veriler – gerçek bir ödeme belgesi değildir.'):(uiText("Beispieldaten – kein Nachweis einer echten Zahlung.",m.language))))+'</p>':'')+'<table><thead><tr>'+m.columns.map(c=>'<th scope="col">'+escape(c)+'</th>').join('')+'</tr></thead><tbody>'+m.rows.map(r=>'<tr>'+r.map(v=>'<td'+(v&&typeof v==='object'?' class="amount"':'')+'>'+escape(format(v))+'</td>').join('')+'</tr>').join('')+'</tbody></table>'+m.notes.map(n=>'<p class="note">'+escape(n)+'</p>').join('');
}
