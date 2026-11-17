/* Cache only the public shell and same-origin static assets. Never cache API or auth responses. */
const VERSION='cyberhealth-shell-v2';
const SHELL=['/','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png','/icons/maskable-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('cyberhealth-shell-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  if(url.pathname!=='/')return;
  event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(VERSION).then(cache=>cache.put('/',copy)));}return response;}).catch(()=>caches.match('/').then(response=>response||Response.error())));return;
 }
 if(!url.pathname.startsWith('/_next/static/')&&!SHELL.includes(url.pathname))return;
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(VERSION).then(cache=>cache.put(request,copy)));}return response;})));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
  const app=windows.find(client=>{const url=new URL(client.url);return url.origin===self.location.origin&&url.pathname==='/';});
  if(!app)return self.clients.openWindow('/#rest');
  await app.focus();
  app.postMessage({type:'cyberhealth-rest'});
 }));
});
