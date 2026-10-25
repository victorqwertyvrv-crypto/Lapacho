# Herramientas para publicar Lapacho

`construir_android.js` arma el `index.html` de la aplicación instalada a partir de la página publicada de Lapacho
(la que se actualiza con las revisiones semanales y mensuales).

    node herramientas/construir_android.js <pagina-publicada.html> index.html

Qué hace: abre la página con Chromium, usa su función «descargarSinConexion» (que incluye jsPDF y pdf.js) y le suma
el manifest, el ícono, `lapacho-config.js` y el registro del service worker. Probado el 25/10/2026: con la versión 39
da un archivo idéntico al publicado.

Para publicar una versión nueva:
1. Armar `index.html` con el comando de arriba.
2. Subirlo a la rama `main`. El service worker pide primero la red, así que los celulares con internet toman la versión
   nueva la próxima vez que abren la app; no hace falta tocar nada más.
3. Cambiar `VERSION` en `sw.js` solo si cambia la lista de archivos o la carpeta `ocr/`.

No hay datos de estudiantes ni de docentes en este repositorio, ni claves: `lapacho-config.js` solo lleva el ID de
cliente de Google (que identifica a la aplicación, no a una persona).
