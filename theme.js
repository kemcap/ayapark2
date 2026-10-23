/* Apply saved preference before paint; system changes follow only in System mode. */
(()=>{
 const key='ayapark2-v2-theme',root=document.documentElement,system=window.matchMedia('(prefers-color-scheme: dark)');
 let preference='system';try{const saved=localStorage.getItem(key);if(['light','dark','system'].includes(saved))preference=saved;}catch{}
 function apply(){
  const theme=preference==='system'?(system.matches?'dark':'light'):preference;
  root.dataset.theme=theme;root.dataset.themePreference=preference;
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=theme==='dark'?'#202629':'#F5F2EC';
  const select=document.getElementById('themePreference');if(select){const de=root.lang==='de';select.setAttribute('aria-label',de?'Darstellung':'Görünüm');select.title=de?'Darstellung':'Görünüm';for(const [i,label] of (de?['System','Hell','Dunkel']:['Sistem','Açık','Koyu']).entries())select.options[i].textContent=label;select.value=preference;}
 }
 apply();
 document.addEventListener('DOMContentLoaded',()=>{
  const button=document.getElementById('themeToggle');if(!button)return;
  const select=document.createElement('select');select.id='themePreference';select.className='theme-preference';
  for(const v of ['system','light','dark']){const option=document.createElement('option');option.value=v;select.append(option);}
  button.replaceWith(select);select.addEventListener('change',()=>{preference=select.value;try{localStorage.setItem(key,preference);}catch{}apply();});apply();
 });
 document.addEventListener('ay2:languagechange',apply);system.addEventListener('change',()=>{if(preference==='system')apply();});
 window.addEventListener('storage',event=>{if(event.key!==key&&event.key!==null)return;preference=['light','dark','system'].includes(event.newValue)?event.newValue:'system';apply();});
})();
