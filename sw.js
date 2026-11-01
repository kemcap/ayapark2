// AYA PARK 2 service worker: network-only; no private data cached.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',()=>{});
self.addEventListener('push',event=>{
 let data={};
 try{data=event.data?.json()||{}}catch{}
 const title='AYA PARK 2';
 const options={body:'Yeni önemli site duyurusu var. Görmek için uygulamayı açın.',icon:'./assets/app-icon.png',badge:'./assets/app-icon.png',tag:'ayapark-important',data:{url:'https://kemcap.github.io/ayapark2/#announcements'}};
 event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target='https://kemcap.github.io/ayapark2/#announcements';
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const windowClient of windows){if(windowClient.url.startsWith('https://kemcap.github.io/ayapark2/')){await windowClient.focus();try{await windowClient.navigate(target)}catch{}return;}}
  await self.clients.openWindow(target);
 })());
});
