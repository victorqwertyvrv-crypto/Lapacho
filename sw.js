/* Lapacho: funciona sin conexión.
   La página se pide siempre primero a la red (sin usar copias viejas del navegador), así que cada versión nueva
   de index.html llega sola la próxima vez que se abre la app con internet.
   Cambiá VERSION solo si cambia la lista de archivos o la carpeta ocr/: al cambiarla se borra la copia guardada
   y los celulares vuelven a descargar la lectura de fotos (unos 10 MB). */
const VERSION = "lapacho-2026-10-24e";
const ARCHIVOS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./lapacho-config.js"];
/* Lectura de fotos sin conexión: se guarda aparte y, si falla (poco espacio), la app sigue funcionando */
const OCR = ["./ocr/tesseract.min.js", "./ocr/worker.min.js", "./ocr/core/tesseract-core-simd-lstm.wasm.js", "./ocr/core/tesseract-core-lstm.wasm.js", "./ocr/lang/spa.traineddata.gz"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(async c => {
    await c.addAll(ARCHIVOS.map(u => new Request(u, {cache:"reload"})));
    /* la lectura de fotos se descarga solo si todavía no está guardada */
    const faltan = [];
    for (const u of OCR) if (!(await c.match(u))) faltan.push(u);
    if (faltan.length) await c.addAll(faltan).catch(err => console.warn("ocr", err));
  }).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  /* Primero la red (para tener siempre la última versión); sin conexión, la copia guardada.
     La página y la configuración se piden sin la caché del navegador, para no recibir una versión vieja. */
  const fresco = r.mode === "navigate" || /(\/|\.html?|lapacho-config\.js|manifest\.json)$/.test(u.pathname);
  const red = fresco ? fetch(u.href, {cache:"no-cache", credentials:"same-origin"}) : fetch(r);
  e.respondWith(red.then(res => { if (res.ok){ const copia = res.clone(); caches.open(VERSION).then(c => c.put(r, copia)); } return res; })
    .catch(() => caches.match(r).then(m => m || caches.match("./index.html"))));
});
