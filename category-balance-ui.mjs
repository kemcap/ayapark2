import {t as tr} from './i18n.mjs?v=5.8.1';
import {escapeHtml as e,money} from './core.mjs?v=5.8.1';
import {remaining} from './ledger.mjs?v=5.8.1';
import {scopedCharges} from './v3-domain.mjs?v=5.9.0';

const categories=['Su dijital kafa','Aidat','Asansör','Bina kapısı bakımı','Havuz','Demirbaş','Su arıtma bakımı','Diğer'];
function classify(c){
 const t=(c.category+' '+c.label).toLocaleLowerCase('tr-TR');
 if(/dijital kafa/.test(t))return 'Su dijital kafa';
 if(/asansör|muayene/.test(t))return 'Asansör';
 if(/havuz/.test(t))return 'Havuz';
 if(/kapı|kapisi|giriş kapısı|bina.*bakım/.test(t))return 'Bina kapısı bakımı';
 if(/su bakımı|su arıtma bakım/.test(t))return 'Su arıtma bakımı';
 if(/demirbaş/.test(t))return 'Demirbaş';
 if(/aidat/.test(t))return 'Aidat';
 return 'Diğer';
}
export function categoryBalanceSummary(s){
 const d=s.data,allowed=new Set((d.role==='resident'?d.units.filter(u=>(d.ownIds||[]).includes(u.id)):d.units).map(u=>u.id));
 const list=scopedCharges(d).filter(c=>allowed.has(c.unit_id)&&!c.void_reason&&remaining(d,c)>0);
 const groups=new Map();
 for(const c of list){
  const key=c.unit_id+'|'+(c.payer==='tenant'?'tenant':c.payer==='owner'?'owner':'other')+'|'+(c.person_id||'');
  if(!groups.has(key))groups.set(key,{unit_id:c.unit_id,person_id:c.person_id,payer:c.payer,values:Object.fromEntries(categories.map(k=>[k,0])),total:0});
  const group=groups.get(key),amount=remaining(d,c),cat=classify(c);group.values[cat]+=amount;group.total+=amount;
 }
 const rows=[...groups.values()].sort((a,b)=>{
  const au=d.units.find(u=>u.id===a.unit_id)?.code||'',bu=d.units.find(u=>u.id===b.unit_id)?.code||'';
  return au.localeCompare(bu,undefined,{numeric:true})||(a.payer==='owner'?-1:1)-(b.payer==='owner'?-1:1);
 });
 const total=rows.reduce((sum,r)=>sum+r.total,0);
 const locale=d.role==='resident'?'Kendi dairenize ait erişilebilir açık borçların kategori dağılımı.':'Tüm dairelerin açık borçları; PDF devir bakiyesi ile aynı kategori düzeni.';
 const head=['Daire','Sorumlu','Tür',...categories,'Toplam'];
 const headers=head.map(x=>'<th scope="col">'+e(tr(x))+'</th>').join('');
 const bodies=rows.map(r=>{
  const unit=d.units.find(u=>u.id===r.unit_id)?.code||'—';
  const person=d.persons?.find(p=>p.id===r.person_id)?.full_name||'—';
  const type=r.payer==='owner'?'Ev sahibi':r.payer==='tenant'?'Kiracı':'Diğer';
  return '<tr><th scope="row">'+e(unit)+'</th><td>'+e(person)+'</td><td>'+e(tr(type))+'</td>'+categories.map(k=>'<td class="amount">'+(r.values[k]?money(r.values[k]):'—')+'</td>').join('')+'<td class="amount"><strong>'+money(r.total)+'</strong></td></tr>';
 }).join('');
 const footer='<tr><th scope="row" colspan="3">'+e(tr('Toplam'))+'</th>'+categories.map(k=>'<td class="amount">'+money(rows.reduce((sum,r)=>sum+r.values[k],0))+'</td>').join('')+'<td class="amount"><strong>'+money(total)+'</strong></td></tr>';
 return '<section class="card category-balance-summary"><div class="card-head"><div><h2>'+e(tr('Kategori Detaylı Bakiye Listesi'))+'</h2><p>'+e(tr(locale))+'</p></div></div><p class="fine">'+e(tr('Güncel açık bakiye · 01.01.2020–30.10.2026 tarihli PDF yalnızca devir referansıdır.'))+'</p><div class="table-wrap"><table class="balance-matrix"><thead><tr>'+headers+'</tr></thead><tbody>'+bodies+(rows.length?footer:'')+'</tbody></table></div>'+(rows.length?'':'<p>'+e(tr('Açık borç bulunamadı.'))+'</p>')+'</section>';
}
