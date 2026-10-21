/* Apply before the stylesheet to avoid flashing the wrong theme. */
(()=>{
 const key='ayapark2-v2-theme',root=document.documentElement;
 const system=window.matchMedia('(prefers-color-scheme: dark)');
 let preference=null;
 try{const saved=localStorage.getItem(key);if(saved==='light'||saved==='dark')preference=saved;}catch{}
 function apply(theme){
  const dark=theme==='dark';root.dataset.theme=theme;
  document.querySelector('meta[name="theme-color"]').content=dark?'#111c18':'#f4f5f0';
  const button=document.getElementById('themeToggle');
  if(button){button.setAttribute('aria-pressed',String(dark));button.title=dark?'Açık temaya geç':'Koyu temaya geç';button.hidden=false;}
 }
 apply(preference||(system.matches?'dark':'light'));
 document.addEventListener('DOMContentLoaded',()=>{
  apply(root.dataset.theme);
  document.getElementById('themeToggle').addEventListener('click',()=>{
   preference=root.dataset.theme==='dark'?'light':'dark';
   try{localStorage.setItem(key,preference);}catch{}
   apply(preference);
  });
 });
 system.addEventListener('change',event=>{if(!preference)apply(event.matches?'dark':'light');});
 window.addEventListener('storage',event=>{
  if(event.key!==key&&event.key!==null)return;
  preference=event.newValue==='light'||event.newValue==='dark'?event.newValue:null;
  apply(preference||(system.matches?'dark':'light'));
 });
})();
