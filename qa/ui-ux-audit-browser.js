const frame=document.querySelector('#app'),status=document.querySelector('#status'),output=document.querySelector('#results');
const settle=()=>new Promise(r=>setTimeout(r,20));
document.querySelector('#run').onclick=async()=>{
 const results=[];document.querySelector('#run').disabled=true;
 try{
  const doc=frame.contentDocument,win=frame.contentWindow;
  const style=doc.createElement('link');style.rel='stylesheet';style.href='./qa-settled.css';doc.head.append(style);
  const axe=doc.createElement('script');axe.src='./axe.min.js';await new Promise((resolve,reject)=>{axe.onload=resolve;axe.onerror=reject;doc.head.append(axe);});
  await doc.fonts.ready;
  const variants=document.querySelector('#variants').checked;
  if(variants){for(let i=0;i<3&&doc.documentElement.lang!=='de';i++){doc.querySelector('#languageToggle').click();await settle();}}
  for(const variant of variants?[{theme:'light',font:'xlarge',design:'modern'},{theme:'dark',font:'xlarge',design:'modern'},{theme:'dark',font:'xlarge',design:'classic'}]:[{theme:'light',font:'normal',design:'modern'}]){
   doc.documentElement.dataset.theme=variant.theme;doc.documentElement.dataset.font=variant.font;doc.documentElement.dataset.design=variant.design;
  for(const width of variants?[320,390,1440]:[320,390,768,1440]){
   frame.width=width;await settle();
   for(const role of ['super','staff','resident']){
    const roles=doc.querySelector('#roleSelect');roles.value=role;roles.dispatchEvent(new win.Event('change',{bubbles:true}));await settle();
    for(let language=0;language<(variants?1:3);language++){
     if(language){doc.querySelector('#languageToggle').click();await settle();}
     const lang=doc.documentElement.lang;
     // Mobile navigation has a different grouping; use existing public route links from the desktop list.
     const pages=role==='resident'?['overview','units','dues','reports','announcements','providers','law','settings']:['overview','units','persons','dues','transactions','reports','announcements','providers','law','settings'];
     for(const page of pages){
      if(win.location.hash!=='#'+page){await new Promise(resolve=>{win.addEventListener('hashchange',resolve,{once:true});win.location.hash=page;});}await settle();
      const actual=doc.querySelector('#content h1')?.textContent;
      const sw=doc.documentElement.scrollWidth,cw=doc.documentElement.clientWidth;
      const errors=[...doc.querySelectorAll('body>pre')].map(n=>n.textContent);
      const result={...variant,width,role,lang,page,heading:actual,overflow:sw>cw+2,scrollWidth:sw,viewport:cw,errors};
      if(width===390&&language===0){
       const a=await win.axe.run(doc,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
       result.violations=a.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.slice(0,4).map(n=>({target:n.target,summary:n.failureSummary}))}));
      }
      if(result.overflow)result.offenders=[...doc.querySelectorAll('#content *')].filter(n=>{const b=n.getBoundingClientRect();return b.width&&b.right>cw+2&&getComputedStyle(n).visibility!=='hidden';}).slice(0,5).map(n=>({tag:n.tagName,class:n.className}));
      results.push(result);output.textContent=JSON.stringify({cases:results.length,failures:results.filter(r=>r.overflow||!r.heading||r.errors.length||r.violations?.length)});status.textContent='Geprüft: '+results.length+' · '+width+'px · '+role+' · '+lang+' · '+page;
     }
    }
   }
  }
  }
  const failures=results.filter(r=>r.overflow||!r.heading||r.errors.length||r.violations?.length);
  output.textContent=JSON.stringify({cases:results.length,failures,results},null,2);
  status.textContent='Fertig: '+results.length+' Ansichten · '+failures.length+' auffällige Ansichten';
 }catch(e){status.textContent='Fehler: '+e.stack;}
 document.querySelector('#run').disabled=false;
};
