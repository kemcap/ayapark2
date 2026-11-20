// AYA PARK 2 service worker: network-only; no private data cached.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',()=>{});
self.addEventListener('push',event=>{
 let data={};
 try{data=event.data?.json()||{}}catch{}
 const safeUrl=String(data.url||'').startsWith('https://kemcap.github.io/ayapark2/#overview')?'https://kemcap.github.io/ayapark2/#overview':'https://kemcap.github.io/ayapark2/#announcements';
 const options={body:typeof data.body==='string'?data.body.slice(0,200):'Yeni önemli site duyurusu var. Görmek için uygulamayı açın.',icon:'./assets/app-icon.png',badge:'./assets/app-icon.png',tag:typeof data.tag==='string'?data.tag.slice(0,100):'ayapark-important',data:{url:safeUrl}};
 event.waitUntil(self.registration.showNotification('AYA PARK 2',options));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=event.notification.data?.url==='https://kemcap.github.io/ayapark2/#overview'?'https://kemcap.github.io/ayapark2/#overview':'https://kemcap.github.io/ayapark2/#announcements';
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const windowClient of windows){if(windowClient.url.startsWith('https://kemcap.github.io/ayapark2/')){await windowClient.focus();try{await windowClient.navigate(target)}catch{}return;}}
  await self.clients.openWindow(target);
 })());
});
