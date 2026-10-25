/* Planificador de clases: funciona sin conexión.
   Cambiá VERSION cada vez que subas un index.html nuevo, así los celulares toman la actualización. */
const VERSION = "lapacho-2026-10-24e";
const ARCHIVOS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./lapacho-config.js"];
/* Lectura de fotos sin conexión: se guarda aparte y, si falla (poco espacio), la app sigue funcionando */
const OCR = ["./ocr/tesseract.min.js", "./ocr/worker.min.js", "./ocr/core/tesseract-core-simd-lstm.wasm.js", "./ocr/core/tesseract-core-lstm.wasm.js", "./ocr/lang/spa.traineddata.gz"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS).then(() => c.addAll(OCR).catch(err => console.warn("ocr", err)))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  /* Primero la red (para tener siempre la última versión); sin conexión, la copia guardada */
  e.respondWith(fetch(r).then(res => { const copia = res.clone(); caches.open(VERSION).then(c => c.put(r, copia)); return res; }).catch(() => caches.match(r).then(m => m || caches.match("./index.html"))));
});
