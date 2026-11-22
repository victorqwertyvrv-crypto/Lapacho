# Herramientas para publicar Lapacho

`construir_android.js` arma el `index.html` de la aplicación instalada a partir de la página publicada de Lapacho
(la que se actualiza con las revisiones semanales y mensuales).

    node herramientas/construir_android.js <pagina-publicada.html> index.html

Qué hace: abre la página con Chromium, usa su función «descargarSinConexion» (que incluye jsPDF y pdf.js) y le suma
el manifest, el ícono, `lapacho-config.js` y el registro del service worker. Desde la versión 77 (22/11/2026) además
saca el programa principal a `app-<código>.js` (el código sale del contenido) y borra el de la versión anterior: el
service worker lo guarda y Chrome conserva el programa ya compilado, así que la app abre unas dos veces más rápido
desde la segunda vez. Subir siempre `index.html` y su `app-<código>.js` juntos.

Para publicar una versión nueva:
1. Armar `index.html` (y `app-<código>.js`) con el comando de arriba.
2. Subir los dos a la rama `main` (`git add -A` incluye el borrado del programa anterior). El service worker pide primero la red, así que los celulares con internet toman la versión
   nueva la próxima vez que abren la app; no hace falta tocar nada más.
3. Cambiar `VERSION` en `sw.js` solo si cambia la lista de archivos o la carpeta `ocr/`.

No hay datos de estudiantes ni de docentes en este repositorio, ni claves: `lapacho-config.js` solo lleva el ID de
cliente de Google (que identifica a la aplicación, no a una persona).
