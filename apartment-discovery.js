/* A subtle recurring affordance, not a decorative attention trap. */
(()=>{
 const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
 const tick=()=>{
  if(document.visibilityState!=='visible'||motion.matches)return;
  for(const card of document.querySelectorAll('.apartment-card:has(.apartment-open-cue)')){
   if(card.closest('[hidden]')||card.hidden)continue;
   card.classList.remove('ay2-discovery-pulse');
   void card.offsetWidth;
   card.classList.add('ay2-discovery-pulse');
   setTimeout(()=>card.classList.remove('ay2-discovery-pulse'),700);
  }
 };
 setInterval(tick,3000);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('.ay2-discovery-pulse').forEach(el=>el.classList.remove('ay2-discovery-pulse'));});
})();
