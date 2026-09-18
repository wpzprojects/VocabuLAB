# VocabuLAB

PWA en HTML/CSS/JS vanilla (sin build step, sin dependencias en runtime) para practicar vocabulario y frases en inglés. Es la migración de la app de Power Apps que vive en `APP_PowerApps/`. Ver `README.md` para el detalle funcional, la configuración de Google Drive y la publicación en GitHub Pages.

## Ejecutar

Servir la carpeta con un servidor estático (no funciona con `file://` por los `fetch()` y los módulos ES):

```
python -m http.server 8080
```

No hay tests ni linter configurados. Para verificar un cambio, abrir la app en el navegador y probar la pantalla afectada.

## Arquitectura

- Router SPA por hash en `js/router.js`. Cada ruta carga con `import()` un módulo de `js/views/` que exporta `async function render(container, params)`. Para agregar una pantalla: crear el módulo, registrar la ruta en `routeTable` y agregar el archivo a `APP_SHELL` en `sw.js`.
- `js/store.js` es la única capa de persistencia. Los JSON de `data/` son seed de solo lectura; en el primer arranque se copian a localStorage y ahí vive todo lo del usuario. Las vistas no deben tocar localStorage directamente.
- `js/drive.js`: backup/restauración manual a Google Drive (OAuth por token, scope `drive.file`).
- `js/translate.js`: wrapper de la API pública de MyMemory.
- `js/util/format.js`: helpers de DOM/datos (`el`, `uid`, `downloadCsv`, etc.). Reutilizarlos antes de escribir helpers nuevos.
- `css/tokens.css` (paleta clara/oscura) y `css/app.css` (componentes). Usar los tokens, no colores sueltos.
- `tools/` son scripts de Python de uso puntual (`extract_data.py` regenera el seed desde el Excel, `generate_icons.py` rasteriza el SVG). No forman parte de la app.

## Versionado (obligatorio en cada cambio que se publique)

Hay dos constantes independientes que **siempre se suben juntas, en el mismo commit**:

1. `APP_VERSION` en `js/views/ayuda.js` (semver `X.Y.Z`). Es la versión visible, solo aparece en la tarjeta de desarrollador de Ayuda (`buildDeveloperCard()`), no en la barra superior. Fix = patch, feature nueva = minor, rediseño o cambio incompatible = major.
2. `CACHE_VERSION` en `sw.js` (`"vNN"`). Si `sw.js` no cambia de bytes, el navegador nunca instala la versión nueva del service worker y los usuarios que ya visitaron siguen viendo CSS/JS viejo. Ya pasó una vez: un fix parecía "no verse" durante varias rondas porque solo se había subido `APP_VERSION`.

El mensaje del commit debe indicar el cambio de versión al final, por ejemplo: `Add shuffle button to Palabras, matching Frases (v1.5.9 -> v1.6.0)`.

## Convenciones

- Texto de la interfaz y comentarios en español.
- Mantener el estilo vanilla: módulos ES, sin frameworks ni bundlers. No agregar dependencias sin preguntar.
- No modificar `data/*.json` a mano: se regeneran con `tools/extract_data.py` desde el Excel.
- Si se edita `icons/icon.svg`, regenerar los PNG con `tools/generate_icons.py` y subir `CACHE_VERSION`.
