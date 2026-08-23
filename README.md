# VocabuLAB

PWA (Progressive Web App) instalable para practicar vocabulario y frases comunes en inglés: ver/agregar/editar/borrar palabras, traducir, practicar con tarjetas, frases comunes y examen tipo quiz.

Migración a HTML/CSS/JS (vanilla, sin build step) de la app original de Power Apps `APP_PowerApps/VocabuLAB.msapp`. 100% estática y funciona offline tras la primera carga (salvo la pantalla Traducir, que llama a una API pública de traducción).

## Diferencia clave frente a la app original

La app de Power Apps escribía directo al Excel vía conectores (`Patch`/`Remove`/`SubmitForm`). Una página estática no puede hacer eso, así que aquí:

- `data/vocabulario.json` y `data/frases.json` (generados desde el Excel) son el **seed** de solo lectura — nunca se tocan en tiempo de ejecución.
- Al abrir la app por primera vez en un navegador, el seed se copia a **localStorage**. Todo lo que agregues/edites/borres/marques como aprendida vive ahí — es privado de ese navegador/dispositivo.
- En **Palabras**, el botón **Exportar CSV** descarga `vocabulario_YYYY-MM-DD.csv` y `frases_YYYY-MM-DD.csv` con el estado actual (seed + tus cambios), por si quieres reincorporarlo a mano al Excel original o respaldarlo.
- La pantalla **Traducir** usa la API pública de [MyMemory](https://mymemory.translated.net/) en vez del conector Microsoft Translator del original (que requiere autenticación de Power Apps). No hay detección automática de idioma gratuita, así que eliges el sentido de la traducción (Inglés→Español / Español→Inglés).

## Ejecutar localmente

No hay build step. Basta con servir la carpeta con cualquier servidor estático (el `fetch()` de los módulos y de los datos requiere `http://`, no funciona abriendo `index.html` directamente con `file://`):

```
npx serve .
# o
python -m http.server 8080
```

Y abrir `http://localhost:PUERTO/`.

## Estructura

```
index.html, manifest.webmanifest, sw.js   # shell PWA
css/                                       # tokens.css (paleta clara/oscura) + app.css (componentes)
js/app.js, router.js, nav.js, icons.js     # bootstrap, router SPA por hash, navegacion, iconos SVG inline
js/store.js                                # persistencia: seed JSON -> localStorage, CRUD, exportCsv()
js/translate.js                            # wrapper de la API de traduccion (MyMemory)
js/util/format.js                          # helpers de DOM/datos (el, uid, downloadCsv, etc.)
js/views/*.js                              # 1 modulo por pantalla: export async function render(container, params)
data/*.json                                # seed de vocabulario/frases (generado desde el Excel)
icons/                                     # iconos PWA (placeholder generado, ver mas abajo)
tools/                                     # scripts de extraccion/generacion (no forman parte de la app en runtime)
APP_PowerApps/                             # app original de Power Apps + Excel (fuente de verdad de los datos)
```

## Regenerar el seed desde una nueva exportación del Excel

1. Reemplaza `APP_PowerApps/Base de datos/Vocabulario_Ingles.xlsx` por la versión actualizada.
2. `pip install openpyxl` (una sola vez).
3. `python tools/extract_data.py` — regenera `data/vocabulario.json` y `data/frases.json`.

Ojo: esto **no** afecta lo que un usuario ya tenga guardado en su localStorage — el seed solo se usa la primera vez que la app abre en un navegador nuevo.

## Pendiente / Fase 2

- **Backup a Google Drive**: técnicamente viable desde el navegador (Google Identity Services + Drive API v3, sin backend), pero requiere que el dueño de la app cree un cliente OAuth en Google Cloud Console y autorice el origen donde se sirva la PWA. El hook `backupToDrive()` en `js/store.js` está listo para implementarse ahí.
- Si se prefiere un `.xlsx` real de 2 hojas en vez de 2 CSV al exportar, habría que vendorizar una librería como SheetJS.

## Iconos / logo

`icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` e `icons/icon.svg` son un placeholder generado con `tools/generate_icons.py` (sin dependencias externas). Reemplázalos cuando haya un logo definitivo.

## Publicar en GitHub Pages

1. Push a la rama `main` del repositorio remoto.
2. En GitHub → Settings → Pages, selecciona "Deploy from a branch", rama `main`, carpeta `/ (root)`.
3. La PWA queda instalable una vez servida por HTTPS.
