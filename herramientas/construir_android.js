/* Arma el index.html de la aplicación instalada (Android) a partir de la página publicada como artifact.
   Uso:  node herramientas/construir_android.js <pagina-del-artifact.html> <salida/index.html>
   Pasos: (1) abre la página con Chromium, (2) usa su propia función «descargarSinConexion» para incluir jsPDF y pdf.js,
   (3) le suma el manifest, el ícono, el archivo de configuración y el registro del service worker.
   Necesita: Node, Playwright con Chromium (ya instalado en el entorno de Claude) y acceso a npm. */
const { execSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const [entrada, salida] = process.argv.slice(2);
if (!entrada || !salida) { console.error('Uso: node construir_android.js <entrada.html> <salida.html>'); process.exit(1); }
let playwright;
try { playwright = require('playwright'); } catch (e) { playwright = require('/opt/npm-tools/node_modules/playwright'); }
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lapacho-'));
  const sh = c => execSync(c, {cwd: tmp, stdio: 'pipe'}).toString();
  sh('npm pack jspdf@2.5.1 pdfjs-dist@3.11.174 --silent');
  for (const f of fs.readdirSync(tmp).filter(f => f.endsWith('.tgz'))) sh(`mkdir -p ${f}.d && tar xzf ${f} -C ${f}.d`);
  const jspdf = path.join(tmp, fs.readdirSync(tmp).find(f => f.startsWith('jspdf') && f.endsWith('.d')), 'package/dist/jspdf.umd.min.js');
  const pdfjs = path.join(tmp, fs.readdirSync(tmp).find(f => f.startsWith('pdfjs-dist') && f.endsWith('.d')), 'package/build');
  const src = fs.readFileSync(entrada, 'utf8');
  const envuelto = /<html/i.test(src) ? src : `<!doctype html><html><head><meta charset="utf-8"></head><body>${src}</body></html>`;
  const pagina = path.join(tmp, 'pagina.html'); fs.writeFileSync(pagina, envuelto);
  const b = await playwright.chromium.launch(); const ctx = await b.newContext({acceptDownloads: true});
  await ctx.route('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', r => r.fulfill({path: jspdf, contentType: 'application/javascript'}));
  await ctx.route('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/*', r => r.fulfill({path: path.join(pdfjs, r.request().url().split('/').pop()), contentType: 'application/javascript', headers: {'access-control-allow-origin': '*'}}));
  const errs = []; const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + pagina); await pg.waitForTimeout(600);
  const [d] = await Promise.all([pg.waitForEvent('download'), pg.evaluate(() => descargarSinConexion())]);
  const off = path.join(tmp, 'sin-conexion.html'); await d.saveAs(off); await b.close();
  if (errs.length) { console.error('Errores de la página:', errs.join('; ')); process.exit(2); }
  let s = fs.readFileSync(off, 'utf8');
  const i = s.indexOf('<title>'); if (!(i > 0 && i < 3000)) throw new Error('No se encontró <title>');
  const j = s.indexOf('</title>', i) + 8;
  s = s.slice(0, i) + '<title>Lapacho, planificador docente</title>\n<meta name="theme-color" content="#1F6B52">\n<link rel="manifest" href="manifest.json">\n<link rel="icon" href="icon-192.png">\n<link rel="apple-touch-icon" href="icon-192.png">\n<script src="lapacho-config.js"></script>' + s.slice(j);
  const k = s.lastIndexOf('</body>'); if (k < 0) throw new Error('No se encontró </body>');
  s = s.slice(0, k) + '<script>if ("serviceWorker" in navigator && location.protocol !== "file:" && window.isSecureContext) navigator.serviceWorker.register("sw.js").catch(e => console.warn("sw", e));</script>\n' + s.slice(k);
  fs.writeFileSync(salida, s); console.log('index.html listo:', s.length, 'caracteres');
})().catch(e => { console.error(e); process.exit(3); });
