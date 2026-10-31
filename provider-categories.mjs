export const initialProviderCategories=['Temizlik','Peyzaj','Elektrik','Asansör','Havuz','Tesisat','Diğer'];

export function providerCategoryChoices(d){
 const all=[...(d.providerCategories||[]).map(c=>({id:c.id||'',name:c.name})),
 ...(d.providers||[]).flatMap(p=>(Array.isArray(p.categories)&&p.categories.length?p.categories:[p.category]).filter(Boolean).map(name=>({id:'',name})))];
 if(!all.length)return initialProviderCategories.map(name=>({id:'',name}));
 const seen=new Set();
 return all.filter(c=>{
  const name=String(c.name||'').trim(),key=name.toLocaleLowerCase('tr-TR');
  if(!name||seen.has(key))return false;
  seen.add(key);return true;
 }).sort((a,b)=>a.name.localeCompare(b.name,'tr'));
}
export function providerServices(p){
 const values=Array.isArray(p.categories)&&p.categories.length?p.categories:[p.category];
 return [...new Set(values.map(s=>String(s||'').trim()).filter(Boolean))];
}
export function providerMatchesCategory(p,category){
 return !category||category==='all'||providerServices(p).includes(category);
}
