// Cosmetic device preference only. Never part of Supabase account settings.
(()=>{let choice=document.querySelector('meta[name="ayapark-design-default"]')?.content==='classic'?'classic':'modern';try{const value=localStorage.getItem('ayapark2-design-v1');if(['classic','modern'].includes(value))choice=value;}catch{}document.documentElement.dataset.design=choice;})();
