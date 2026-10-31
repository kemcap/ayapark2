// Scroll-direction header: no layout replacement, debt/UI state remains untouched.
// Direction distances are accumulated to ignore touchpad jitter and inertial scroll.
export function createSmartHeaderState({initialY=0,hideDistance=36,showDistance=20,topZone=8}={}){
 let lastY=Math.max(0,Number(initialY)||0),direction=0,distance=0,hidden=false;
 return {
  update(nextY,{headerHeight=68,locked=false}={}){
   const y=Math.max(0,Number(nextY)||0),delta=y-lastY;
   lastY=y;
   if(locked||y<=topZone){hidden=false;direction=0;distance=0;return hidden;}
   if(Math.abs(delta)<1)return hidden;
   const nextDirection=delta>0?1:-1;
   if(direction!==nextDirection){direction=nextDirection;distance=0;}
   distance+=Math.abs(delta);
   if(direction>0&&!hidden&&y>headerHeight+topZone&&distance>=hideDistance){
    hidden=true;distance=0;
   }else if(direction<0&&hidden&&distance>=showDistance){
    hidden=false;distance=0;
   }
   return hidden;
  },
  reveal(y=lastY){lastY=Math.max(0,Number(y)||0);hidden=false;direction=0;distance=0;},
  isHidden(){return hidden;}
 };
}

export function installSmartHeader({win=window,doc=document,header=doc.querySelector('.topbar')}={}){
 if(!header)return ()=>{};
 const state=createSmartHeaderState({initialY:win.scrollY});
 let frame=0;
 const apply=()=>{
  frame=0;
  const locked=doc.body?.classList.contains('signed-out')||
   !!header.querySelector('details[open], :focus-visible')||
   !!doc.querySelector('dialog[open]');
  const hidden=state.update(win.scrollY,{headerHeight:header.offsetHeight||68,locked});
  header.classList.toggle('smart-header-hidden',hidden);
 };
 const queue=()=>{if(!frame)frame=win.requestAnimationFrame(apply);};
 const reveal=()=>{state.reveal(win.scrollY);header.classList.remove('smart-header-hidden');};
 const onFocus=event=>{if(header.contains(event.target))reveal();};
 const onToggle=event=>{if(header.contains(event.target))reveal();};
 doc.documentElement.classList.add('smart-header-enabled');
 win.addEventListener('scroll',queue,{passive:true}); // window-only; dialog scrolling does not affect it
 win.addEventListener('resize',reveal,{passive:true});
 win.addEventListener('pageshow',reveal);
 doc.addEventListener('focusin',onFocus);
 header.addEventListener('toggle',onToggle,true);
 apply();
 return ()=>{
  if(frame)win.cancelAnimationFrame(frame);
  win.removeEventListener('scroll',queue);
  win.removeEventListener('resize',reveal);
  win.removeEventListener('pageshow',reveal);
  doc.removeEventListener('focusin',onFocus);
  header.removeEventListener('toggle',onToggle,true);
  header.classList.remove('smart-header-hidden');
  doc.documentElement.classList.remove('smart-header-enabled');
 };
}
