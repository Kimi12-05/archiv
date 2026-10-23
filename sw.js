const C='archiv-v4';
const ASSETS=['./','./index.html'];
const PX='/__p';

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(C).then(c=>c.addAll(ASSETS)).catch(()=>{}).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).catch(()=>{}).then(()=>self.clients.claim()));
});

async function weiterleiten(ziel,req){
  if(!ziel)return new Response('kein Ziel',{status:400,headers:{'X-Proxy':'1'}});
  const h={};
  try{req.headers.forEach((v,k)=>{if(k!=='host'&&k!=='content-length')h[k]=v;});}catch(e){}
  const init={method:req.method,headers:h,redirect:'follow'};
  if(req.method!=='GET'&&req.method!=='HEAD'){try{init.body=await req.text();}catch(e){}}
  try{
    const res=await fetch(ziel,init);
    const buf=await res.arrayBuffer();
    const out=new Headers();
    res.headers.forEach((v,k)=>{out.set(k,v);});
    out.delete('content-encoding');
    out.delete('content-length');
    out.set('X-Proxy','1');
    return new Response(buf,{status:res.status,statusText:res.statusText,headers:out});
  }catch(err){
    return new Response(String((err&&err.message)||err),{status:599,headers:{'X-Proxy':'1','Content-Type':'text/plain'}});
  }
}

self.addEventListener('fetch',e=>{
  const r=e.request;
  let u;try{u=new URL(r.url);}catch(err){return;}
  if(u.origin===location.origin&&u.pathname.endsWith(PX)){
    e.respondWith(weiterleiten(u.searchParams.get('u'),r));
    return;
  }
  if(r.method==='GET'&&r.mode==='navigate'){
    e.respondWith(fetch(r).then(res=>{
      if(res&&res.ok){const cl=res.clone();caches.open(C).then(x=>x.put('./',cl)).catch(()=>{});}
      return res;
    }).catch(()=>caches.match('./')));
    return;
  }
  if(r.method!=='GET'||u.origin!==location.origin){e.respondWith(fetch(r));return;}
  e.respondWith(caches.match(r).then(c=>c||fetch(r).then(res=>{
    if(res&&res.ok){const cl=res.clone();caches.open(C).then(x=>x.put(r,cl)).catch(()=>{});}
    return res;
  }).catch(()=>caches.match('./'))));
});
