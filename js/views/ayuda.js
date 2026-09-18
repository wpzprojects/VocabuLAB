// Pantalla "Ayuda": explica pantalla por pantalla como usar la app. No existe
// en el original de Power Apps, es contenido estatico agregado en la
// migracion para orientar al usuario.

import { el, distinct, confirmAction } from "../util/format.js";
import {
  exportVocabularioCsv,
  exportFrasesCsv,
  importVocabularioCsv,
  importFrasesCsv,
  getVocabulario,
  getFrases,
  deletePalabrasByLista,
  deleteFrasesByCategoria,
} from "../store.js";
import { saveBackupToDrive, restoreBackupFromDrive } from "../drive.js";

const APP_VERSION = "1.6.7";

const SECCIONES = [
  {
    titulo: "Palabras",
    items: [
      "Busca en ingles o espanol, filtra por Lista, u ordena con Z-A y el boton de aleatorio.",
      "Toca una fila para editarla o borrarla; + Nueva palabra abre el mismo formulario en blanco.",
      "La columna Aprendida es solo informativa: se marca en Practicar.",
    ],
  },
  {
    titulo: "Traducir",
    items: [
      "Toca el boton de sentido para alternar Ingles → Espanol / Espanol → Ingles, escribe el texto y presiona Traducir. Requiere internet (servicio MyMemory).",
      "Con el resultado puedes guardarlo como palabra nueva, eligiendo su Lista.",
    ],
  },
  {
    titulo: "Practicar",
    items: [
      "Tarjetas con tu vocabulario: filtra por Lista y Aprendidas, y activa Orden aleatorio si quieres.",
      "Intercambiar idioma cambia cual idioma se muestra primero. Ver revela la traduccion (y el contexto, si lo hay); Editar abre la palabra.",
      "El interruptor Aprendida de cada tarjeta marca la palabra al instante.",
    ],
  },
  {
    titulo: "Examen",
    items: [
      "Cuestionario con tu vocabulario: filtra por Lista y Aprendidas, y define cuantas preguntas con # de palabras (0 = todas). Orden aleatorio e Intercambiar idioma funcionan como en Practicar.",
      "Escribe tu respuesta y presiona Evaluar (o Enter); el resultado se acumula arriba. Reset test genera el cuestionario de nuevo.",
    ],
  },
  {
    titulo: "Frases",
    items: [
      "Igual que Palabras, pero organizadas por Categoria; la busqueda tambien revisa las notas de uso.",
      "Toca una fila para editarla o borrarla; Aprendida se marca directo en la tabla.",
    ],
  },
];

export async function render(container) {
  const wrap = el("div", { class: "view-ayuda" });
  container.append(wrap);

  wrap.append(
    el("h1", { class: "page-title" }, "Ayuda"),
    el("p", { class: "page-subtitle" }, "Como funciona cada pantalla de la app.")
  );

  SECCIONES.forEach((seccion) => {
    wrap.append(
      el("div", { class: "card" }, [
        el("h2", { class: "section-title", style: "margin-top:0" }, seccion.titulo),
        el(
          "ul",
          { class: "help-list" },
          seccion.items.map((texto) => el("li", {}, texto))
        ),
      ])
    );
  });

  wrap.append(
    el("p", { class: "text-sm text-muted" }, [
      'Todo lo que agregues, edites, borres o marques como palabra o frase "aprendida" se guarda solo en este navegador/dispositivo (localStorage); usa ',
      el("strong", {}, "Exportar CSV"),
      " o ",
      el("strong", {}, "Guardar en Drive"),
      " de vez en cuando como respaldo.",
    ])
  );

  const [vocab, frases] = await Promise.all([getVocabulario(), getFrases()]);
  wrap.append(buildAdvancedCard(vocab, frases));
  wrap.append(buildCsvCard());
  wrap.append(buildCloudBackupCard());
  wrap.append(buildDeveloperCard());
}

function buildAdvancedCard(vocab, frases) {
  return el("div", { class: "card" }, [
    el("h2", { class: "section-title", style: "margin-top:0" }, "Opciones avanzadas"),
    el("p", { class: "text-sm text-muted" }, "Borra en bloque palabras o frases completas. No se puede deshacer."),
    buildBulkDeleteField("Borrar palabras por lista", distinct(vocab, "lista"), deletePalabrasByLista, "palabras"),
    buildBulkDeleteField("Borrar frases por categoria", distinct(frases, "categoria"), deleteFrasesByCategoria, "frases"),
  ]);
}

function buildBulkDeleteField(label, options, deleteFn, plural) {
  const select = el(
    "select",
    { disabled: options.length ? null : true },
    options.length ? options.map((v) => el("option", { value: v }, String(v))) : [el("option", { value: "" }, "(sin datos)")]
  );
  const deleteBtn = el("button", { class: "btn btn-danger", disabled: options.length ? null : true }, "Borrar");
  const statusMsg = el("p", { class: "text-sm", hidden: true }, "");

  deleteBtn.addEventListener("click", async () => {
    const value = select.value;
    if (!value) return;
    const ok = await confirmAction(
      `Esto borrara permanentemente todas las ${plural} de "${value}". No se puede deshacer.`,
      { danger: true, okLabel: "Borrar" }
    );
    if (!ok) return;
    const n = await deleteFn(value);
    statusMsg.style.color = "var(--success)";
    statusMsg.textContent = `Listo: se borraron ${n} ${plural}.`;
    statusMsg.hidden = false;
  });

  return el("div", { class: "field" }, [
    el("label", {}, label),
    el("div", { class: "select-with-btn" }, [select, deleteBtn]),
    statusMsg,
  ]);
}

function setStatus(statusMsg, text, color) {
  statusMsg.style.color = color || "var(--text-muted)";
  statusMsg.textContent = text;
  statusMsg.hidden = false;
}

function buildCloudBackupCard() {
  const statusMsg = el("p", { class: "text-sm", hidden: true }, "");
  const saveBtn = el("button", { class: "btn btn-primary" }, "Guardar en Drive");
  const restoreBtn = el("button", { class: "btn" }, "Restaurar desde Drive");

  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    setStatus(statusMsg, "Guardando en Drive...", null);
    try {
      await saveBackupToDrive();
      setStatus(statusMsg, 'Listo: respaldo guardado en tu Drive como "VocabuLAB_backup.json".', "var(--success)");
    } catch (err) {
      setStatus(statusMsg, `No se pudo guardar: ${err.message || err}`, "var(--danger)");
    } finally {
      saveBtn.disabled = false;
    }
  });

  restoreBtn.addEventListener("click", async () => {
    const ok = await confirmAction(
      "Esto reemplaza TODAS tus palabras y frases actuales con el contenido del respaldo guardado en Drive. No se puede deshacer. Continuar?",
      { danger: true, okLabel: "Continuar" }
    );
    if (!ok) return;
    restoreBtn.disabled = true;
    setStatus(statusMsg, "Restaurando desde Drive...", null);
    try {
      const info = await restoreBackupFromDrive();
      setStatus(
        statusMsg,
        `Listo: se restauraron ${info.vocabularioCount} palabras y ${info.frasesCount} frases. Entra a Palabras/Frases para verlas.`,
        "var(--success)"
      );
    } catch (err) {
      setStatus(statusMsg, `No se pudo restaurar: ${err.message || err}`, "var(--danger)");
    } finally {
      restoreBtn.disabled = false;
    }
  });

  return el("div", { class: "card" }, [
    el("h2", { class: "section-title", style: "margin-top:0" }, "Respaldo en la nube (Google Drive)"),
    el(
      "p",
      { class: "text-sm text-muted" },
      'Guarda una copia de tu vocabulario y frases en una carpeta "VocabuLAB" de tu Google Drive, o restaurala en otro ' +
        "dispositivo. Requiere conexion a internet e iniciar sesion con tu cuenta de Google."
    ),
    el("div", { class: "btn-row btn-row-equal" }, [saveBtn, restoreBtn]),
    statusMsg,
  ]);
}

function buildDeveloperCard() {
  return el("div", { class: "card dev-card" }, [
    el("div", { class: "dev-header" }, [
      el("span", { class: "dev-avatar" }, "WP"),
      el("div", {}, [
        el("p", { class: "dev-name" }, "Wilsson Uriel Perez Valero"),
        el("p", { class: "dev-role" }, "Desarrollador de VocabuLAB"),
      ]),
    ]),
    el("div", { class: "dev-contact" }, [
      el("a", { href: "mailto:wperez.net@hotmail.com" }, "wperez.net@hotmail.com"),
      el("a", { href: "tel:+573104762477" }, "+57 310 476 2477"),
    ]),
    el("p", { class: "dev-footer" }, `Colombia · 2026 · v${APP_VERSION}`),
  ]);
}

function buildCsvCard() {
  return el("div", { class: "card" }, [
    el("h2", { class: "section-title", style: "margin-top:0" }, "Exportar / Restaurar CSV"),
    el(
      "p",
      { class: "text-sm text-muted" },
      "Exporta un CSV de tu vocabulario o frases como respaldo, o restauralo en un dispositivo nuevo. " +
        "Ojo: Restaurar reemplaza TODO el contenido actual — no se combina, y no se puede deshacer."
    ),
    buildCsvField("Vocabulario", exportVocabularioCsv, importVocabularioCsv),
    buildCsvField("Frases", exportFrasesCsv, importFrasesCsv),
  ]);
}

function buildCsvField(label, exportFn, importFn) {
  const statusMsg = el("p", { class: "text-sm", hidden: true }, "");
  const exportBtn = el("button", { class: "btn btn-primary" }, "Exportar CSV");
  const fileInput = el("input", { type: "file", accept: ".csv,text/csv", hidden: true });
  const restoreBtn = el("label", { class: "btn" }, ["Restaurar CSV", fileInput]);

  exportBtn.addEventListener("click", async () => {
    if (await confirmAction(`Descargar un CSV de ${label.toLowerCase()} con el estado actual?`)) await exportFn();
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    const ok = await confirmAction(
      `Esto reemplaza TODOS los datos actuales de ${label} con el contenido de "${file.name}". No se puede deshacer. Continuar?`,
      { danger: true, okLabel: "Continuar" }
    );
    if (!ok) return;
    try {
      const count = await importFn(await file.text());
      setStatus(statusMsg, `Listo: se restauraron ${count} filas. Entra a la pantalla correspondiente para verlas.`, "var(--success)");
    } catch (err) {
      setStatus(statusMsg, `No se pudo restaurar: ${err.message || err}`, "var(--danger)");
    }
  });

  return el("div", { class: "field" }, [
    el("label", { class: "field-title" }, label),
    el("div", { class: "btn-row btn-row-equal" }, [exportBtn, restoreBtn]),
    statusMsg,
  ]);
}
