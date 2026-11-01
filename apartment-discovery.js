/* A subtle recurring affordance, not a decorative attention trap. */
(()=>{
 const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
 const tick=()=>{
  if(document.visibilityState!=='visible'||motion.matches)return;
  const cards=[...document.querySelectorAll('.apartment-card:has(.apartment-open-cue)')].filter(card=>!card.closest('[hidden]')&&!card.hidden);
  for(const card of cards)card.classList.remove('ay2-discovery-pulse');
  // Flush once after all writes; reading each card between writes forces N layouts.
  if(cards.length)void cards[0].offsetWidth;
  for(const card of cards)card.classList.add('ay2-discovery-pulse');
  if(cards.length)setTimeout(()=>{for(const card of cards)card.classList.remove('ay2-discovery-pulse');},700);
 };
 setInterval(tick,3000);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('.ay2-discovery-pulse').forEach(el=>el.classList.remove('ay2-discovery-pulse'));});
})();
