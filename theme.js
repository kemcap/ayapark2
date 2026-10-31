/* Apply saved preference before paint; follow the device only in automatic mode. */
(()=>{
 const key='ayapark2-v2-theme',root=document.documentElement,system=window.matchMedia('(prefers-color-scheme: dark)');
 const modes=['system','light','dark'];
 const shapes={system:'<circle cx="12" cy="12" r="5"/><path d="M12 7a5 5 0 0 0 0 10Z" fill="currentColor" stroke="none"/><path d="M12 2v2m0 16v2m8-10h2m-4.3-7.1 1.4-1.4m-1.4 15.6 1.4 1.4"/>',light:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',dark:'<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>'};
 const icon=mode=>'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">'+shapes[mode]+'</svg>';
 let preference='system';try{const saved=localStorage.getItem(key);if(modes.includes(saved))preference=saved;}catch{}
 function apply(){
  const theme=preference==='system'?(system.matches?'dark':'light'):preference;
  root.dataset.theme=theme;root.dataset.themePreference=preference;
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=getComputedStyle(root).getPropertyValue('--header-bg').trim()||(theme==='dark'?'#252c30':'#eeece7');
  const menu=document.getElementById('themeMenu');if(!menu)return;
  const de=root.lang==='de',en=root.lang==='en',names=de?['Automatisch','Hell','Dunkel']:en?['System','Light','Dark']:['Otomatik','Açık','Koyu'];
  const label=(de?'Darstellung: ':en?'Appearance: ':'Görünüm: ')+names[modes.indexOf(preference)],toggle=document.getElementById('themeToggle');
  toggle.innerHTML=icon(preference);toggle.setAttribute('aria-label',label);toggle.title=label;
  menu.querySelector('.theme-options').setAttribute('aria-label',de?'Darstellung wählen':en?'Choose appearance':'Görünüm seçin');
  for(const [i,mode] of modes.entries()){
   const button=menu.querySelector('[data-theme-choice="'+mode+'"]');button.title=names[i];button.setAttribute('aria-label',names[i]);button.setAttribute('aria-pressed',String(mode===preference));button.querySelector('.sr-only').textContent=names[i];
  }
 }
 apply();
 document.addEventListener('DOMContentLoaded',()=>{
  const old=document.getElementById('themeToggle');if(!old)return;
  const menu=document.createElement('details');menu.id='themeMenu';menu.className='theme-menu';
  menu.innerHTML='<summary id="themeToggle" class="button header-icon"></summary><div class="theme-options" role="group">'+modes.map(mode=>'<button type="button" data-theme-choice="'+mode+'">'+icon(mode)+'<span class="sr-only"></span></button>').join('')+'</div>';
  old.replaceWith(menu);
  menu.addEventListener('click',event=>{
   const choice=event.target.closest('[data-theme-choice]');if(!choice)return;
   preference=choice.dataset.themeChoice;try{localStorage.setItem(key,preference);}catch{}apply();document.dispatchEvent(new CustomEvent('ay2:themechanged',{detail:preference}));menu.open=false;document.getElementById('themeToggle').focus();
  });
  document.addEventListener('click',event=>{if(menu.open&&!menu.contains(event.target))menu.open=false;});
  menu.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();menu.open=false;document.getElementById('themeToggle').focus();}});
  apply();
 });
 document.addEventListener('ay2:settheme',event=>{if(modes.includes(event.detail)){preference=event.detail;try{localStorage.setItem(key,preference);}catch{}apply();}});
 document.addEventListener('ay2:languagechange',apply);system.addEventListener('change',()=>{if(preference==='system')apply();});
 window.addEventListener('storage',event=>{if(event.key!==key&&event.key!==null)return;preference=modes.includes(event.newValue)?event.newValue:'system';apply();});
})();
