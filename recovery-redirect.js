/* Supabase may return recovery credentials to the configured Site URL.
   Forward them to the password form before initializing the main application. */
(function(){
 const hash=new URLSearchParams(location.hash.replace(/^#/,''));
 const query=new URLSearchParams(location.search);
 if((hash.get('type')||query.get('type'))!=='recovery')return;
 const target=new URL('./reset.html',location.href);
 target.search=location.search;target.hash=location.hash;
 location.replace(target.href);
})();
