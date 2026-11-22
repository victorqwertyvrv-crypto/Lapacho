/* Lapacho: funciona sin conexión.
   Estrategias por tipo de recurso:
   - Página, configuración y manifiesto: primero la red (con 4 segundos de espera) para recibir siempre la versión
     nueva; sin conexión, la copia guardada.
   - Íconos y lectura de fotos (ocr/), que no cambian entre versiones: primero la copia guardada (cache first).
   - El programa (app-<código>.js): cada versión tiene su propio nombre, así que se guarda una vez y se usa siempre
     desde la copia (cache first). Al guardar uno nuevo se borran los anteriores. Servido desde la copia, Chrome
     guarda además el programa ya compilado y Lapacho abre más rápido.
   - El resto de los archivos propios: la copia guardada al instante y se actualiza en segundo plano
     (stale-while-revalidate).
   Los datos del docente no pasan por acá: se guardan en el navegador (IndexedDB y localStorage).
   Cambiá VERSION solo si cambia la lista de archivos o la carpeta ocr/: al cambiarla se borra la copia guardada
   y los celulares vuelven a descargar la lectura de fotos (unos 10 MB). */
const VERSION = "lapacho-2026-11-22a";
const ARCHIVOS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./lapacho-config.js"];
const OCR = ["./ocr/tesseract.min.js", "./ocr/worker.min.js", "./ocr/core/tesseract-core-simd-lstm.wasm.js", "./ocr/core/tesseract-core-lstm.wasm.js", "./ocr/lang/spa.traineddata.gz"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(async c => {
    await c.addAll(ARCHIVOS.map(u => new Request(u, {cache:"reload"})));
    /* el programa de la versión actual, que index.html nombra */
    try { const h = await (await c.match("./index.html")).text(), m = h.match(/<script src="(app-[0-9a-f]+\.js)"/); if (m) await c.add(new Request("./" + m[1], {cache:"reload"})); } catch (err) { console.warn("app", err); }
    /* la lectura de fotos se copia desde la versión anterior o se descarga si falta; si falla (poco espacio), la app sigue */
    const viejas = (await caches.keys()).filter(k => k !== VERSION);
    const faltan = [];
    for (const u of OCR){
      if (await c.match(u)) continue;
      let r = null; for (const k of viejas){ r = await (await caches.open(k)).match(u); if (r) break; }
      if (r) await c.put(u, r); else faltan.push(u);
    }
    if (faltan.length) await c.addAll(faltan).catch(err => console.warn("ocr", err));
  }).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const guardar = (r, res) => { if (res && res.ok){ const copia = res.clone(); caches.open(VERSION).then(c => c.put(r, copia)); } return res; };
/* Cuando llega una página nueva, se guarda también su programa, para que funcione sin conexión la próxima vez */
function precargarApp(res){
  if (!res || !res.ok || !/text\/html/.test(res.headers.get("content-type") || "")) return;
  res.clone().text().then(async h => {
    const m = h.match(/<script src="(app-[0-9a-f]+\.js)"/); if (!m) return;
    const url = new URL("./" + m[1], self.registration.scope).href, c = await caches.open(VERSION);
    if (await c.match(url)) return;
    const a = await fetch(url, {cache:"reload"}); if (!a.ok) return;
    await c.put(url, a); /* la anterior se borra recién cuando la página nueva pide este programa */
  }).catch(err => console.warn("app", err));
}
function redPrimero(e, r, u){
  const red = fetch(u.href, {cache:"no-cache", credentials:"same-origin"}).then(res => { precargarApp(res); return guardar(r, res); });
  const espera = new Promise(res => setTimeout(res, 4000)).then(() => caches.match(r));
  return Promise.race([red, espera.then(m => m || red)]).catch(() => caches.match(r).then(m => m || caches.match("./index.html")));
}
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  if (r.mode === "navigate" || /(\/|\.html?|lapacho-config\.js|manifest\.json|sw\.js)$/.test(u.pathname)){ e.respondWith(redPrimero(e, r, u)); return; }
  if (/\/app-[0-9a-f]+\.js$/.test(u.pathname)){
    const limpiar = async () => { const c = await caches.open(VERSION); for (const k of await c.keys()) if (/\/app-[0-9a-f]+\.js$/.test(new URL(k.url).pathname) && k.url !== r.url) await c.delete(k); };
    e.respondWith(caches.match(r).then(m => {
      if (m){ e.waitUntil(limpiar()); return m; }
      return fetch(r).then(res => { if (res && res.ok){ const copia = res.clone(); e.waitUntil(caches.open(VERSION).then(c => c.put(r, copia)).then(limpiar)); } return res; });
    }));
    return;
  }
  if (/\/ocr\/|\/icon-[^/]+\.png$/.test(u.pathname)){ e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => guardar(r, res)))); return; }
  e.respondWith(caches.match(r).then(m => { const red = fetch(r).then(res => guardar(r, res)).catch(() => m); return m || red; }));
});
