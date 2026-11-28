// sw.js: кэш для работы без интернета. После изменения файлов поменяй номер версии V, чтобы кэш обновился.
const V='chess-v2';
const CORE=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','book.json','https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(CORE.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||/lichess\.(org|ovh)$/.test(u.hostname))return;
 e.respondWith(caches.open(V).then(async c=>{
  if(u.origin===location.origin){
   try{const r=await fetch(e.request);if(r&&r.ok)c.put(e.request,r.clone());return r}
   catch(err){const h=await c.match(e.request);if(h)return h;throw err}
  }
  const hit=await c.match(e.request);if(hit)return hit;
  const r=await fetch(e.request);if(r&&r.ok)c.put(e.request,r.clone());return r;
 }));
});
