# VocabuLAB

PWA (Progressive Web App) instalable para practicar vocabulario y frases comunes en inglés: ver/agregar/editar/borrar palabras, traducir, practicar con tarjetas, frases comunes y examen tipo quiz.

Migración a HTML/CSS/JS (vanilla, sin build step) de la app original de Power Apps `APP_PowerApps/VocabuLAB.msapp`. 100% estática y funciona offline tras la primera carga (salvo la pantalla Traducir, que llama a una API pública de traducción).

## Diferencia clave frente a la app original

La app de Power Apps escribía directo al Excel vía conectores (`Patch`/`Remove`/`SubmitForm`). Una página estática no puede hacer eso, así que aquí:

- `data/vocabulario.json` y `data/frases.json` (generados desde el Excel) son el **seed** de solo lectura — nunca se tocan en tiempo de ejecución.
- Al abrir la app por primera vez en un navegador, el seed se copia a **localStorage**. Todo lo que agregues/edites/borres/marques como aprendida vive ahí — es privado de ese navegador/dispositivo.
- En **Palabras** y **Frases**, cada pantalla tiene su propio botón **Exportar CSV** (con confirmación previa) que descarga `vocabulario_YYYY-MM-DD.csv` o `frases_YYYY-MM-DD.csv` respectivamente, con el estado actual (seed + tus cambios), por si quieres reincorporarlo a mano al Excel original o respaldarlo. La pantalla **Ayuda** tiene el flujo inverso, **Restaurar desde CSV**: sube uno de esos archivos para recuperar tus datos en otro navegador/dispositivo (reemplaza por completo el dataset correspondiente, no se combina).
- La pantalla **Traducir** usa la API pública de [MyMemory](https://mymemory.translated.net/) en vez del conector Microsoft Translator del original (que requiere autenticación de Power Apps). No hay detección automática de idioma gratuita, así que eliges el sentido de la traducción (Inglés→Español / Español→Inglés).
- **Ayuda** tiene ademas un respaldo manual a **Google Drive** (`js/drive.js`, botones "Guardar en Drive" / "Restaurar desde Drive"): crea/reutiliza una carpeta `VocabuLAB` visible en el Drive normal del usuario (scope `drive.file`, la app solo ve esa carpeta y sus archivos, no el resto del Drive) y ahi sube `VocabuLAB_backup.json` (fuente de verdad, usado por Restaurar) junto con `vocabulario.csv` y `frases.csv` (los mismos que generan los botones Exportar CSV, para abrir en Excel/Sheets sin pasar por la app). Usa Google Identity Services (OAuth por token, sin backend); requiere un Client ID de Google Cloud Console con el origen de la PWA autorizado (ver seccion "Configurar Google Drive" abajo).

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
js/drive.js                                # backup/restauracion manual contra Google Drive (OAuth + Drive API v3)
js/translate.js                            # wrapper de la API de traduccion (MyMemory)
js/util/format.js                          # helpers de DOM/datos (el, uid, downloadCsv, etc.)
js/views/*.js                              # 1 modulo por pantalla: export async function render(container, params)
data/*.json                                # seed de vocabulario/frases (generado desde el Excel)
icons/                                     # iconos PWA (logo definitivo, ver mas abajo)
tools/                                     # scripts de extraccion/generacion (no forman parte de la app en runtime)
APP_PowerApps/                             # app original de Power Apps + Excel (fuente de verdad de los datos)
```

## Regenerar el seed desde una nueva exportación del Excel

1. Reemplaza `APP_PowerApps/Base de datos/Vocabulario_Ingles.xlsx` por la versión actualizada.
2. `pip install openpyxl` (una sola vez).
3. `python tools/extract_data.py` — regenera `data/vocabulario.json` y `data/frases.json`.

Ojo: esto **no** afecta lo que un usuario ya tenga guardado en su localStorage — el seed solo se usa la primera vez que la app abre en un navegador nuevo.

## Configurar Google Drive (backup en la nube)

El `CLIENT_ID` en `js/drive.js` es publico (no es secreto, es normal que viva en el codigo del navegador), pero solo funciona si el origen desde el que sirves la PWA esta autorizado en ese cliente OAuth. Si necesitas crear uno nuevo (o agregar un origen, por ejemplo al mover la app a otro dominio):

1. [console.cloud.google.com](https://console.cloud.google.com/) → crear proyecto → **APIs y servicios → Biblioteca** → habilitar "Google Drive API".
2. **APIs y servicios → Pantalla de consentimiento de OAuth**: tipo Externo, agrega el scope `.../auth/drive.file`, y agrega tu propia cuenta de Gmail en "Usuarios de prueba". Deja la app en estado "Testing" (no hace falta publicarla/verificarla para uso personal).
3. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**, tipo "Aplicación web". En "Orígenes de JavaScript autorizados" agrega cada origen desde el que abras la app (sin ruta ni `/` final), por ejemplo `https://tu-usuario.github.io`, `http://127.0.0.1:5500`, `http://localhost:5500`.
4. Copia el Client ID (`....apps.googleusercontent.com`) y pegalo en `CLIENT_ID` en `js/drive.js`.

Nota: mientras el proyecto este en "Testing", la sesion de Google expira cada 7 dias — al usar "Guardar/Restaurar desde Drive" despues de ese tiempo simplemente vuelve a pedir iniciar sesion.

## Pendiente / Fase 3

- Si se prefiere un `.xlsx` real de 2 hojas en vez de 2 CSV al exportar, habría que vendorizar una librería como SheetJS.

## Iconos / logo

`icons/icon.svg` es el logo definitivo (dos flashcards con "Ab"). Los PNG (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`) se generan a partir de ese SVG con `tools/generate_icons.py`. A diferencia del resto de la app, este script sí necesita dependencias de Python para rasterizar SVG:

```
pip install svglib reportlab pycairo rlPyCairo pillow
python tools/generate_icons.py
```

Si editas `icons/icon.svg`, vuelve a correr el script para regenerar los PNG (y sube `CACHE_VERSION` en `sw.js`).

## Publicar en GitHub Pages

1. Push a la rama `main` del repositorio remoto.
2. En GitHub → Settings → Pages, selecciona "Deploy from a branch", rama `main`, carpeta `/ (root)`.
3. La PWA queda instalable una vez servida por HTTPS.
