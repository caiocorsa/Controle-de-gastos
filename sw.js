const V = 'gastos-v2';
const ARQUIVOS = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Arquivos do próprio app: tenta a internet primeiro (sem usar cópia velha do navegador)
// e só usa a cópia guardada se estiver sem internet ou se a rede demorar mais de 4 s.
// Fontes e outros arquivos externos: usa a cópia guardada e atualiza em segundo plano.
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const proprio = new URL(r.url).origin === self.location.origin;
  if (proprio) {
    const cache = () => caches.match(r, { ignoreSearch: true }).then(h => h || caches.match('./'));
    const rede = fetch(r, { cache: 'no-cache' }).then(res => {
      if (res && res.ok) { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); }
      return res;
    });
    const limite = new Promise((_, rej) => setTimeout(rej, 4000));
    e.respondWith(Promise.race([rede, limite]).catch(cache));
  } else {
    e.respondWith(
      caches.match(r).then(hit => {
        const rede = fetch(r).then(res => {
          if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); }
          return res;
        }).catch(() => hit);
        return hit || rede;
      })
    );
  }
});
