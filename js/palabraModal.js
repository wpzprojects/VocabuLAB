// Modal compartido de Nueva/Editar palabra (usado por Palabras y por
// Traducir al guardar un resultado, para que ambas vias puedan completar
// Lista y Palabra en contexto antes de guardar).

import { el, bindIntegerInput, confirmAction } from "./util/format.js";
import { addPalabra, updatePalabra, deletePalabra, getGeminiKey, setGeminiKey, isGeminiKeyOmitida, setGeminiKeyOmitida } from "./store.js";
import { icon } from "./icons.js";
import { sugerirEjemplo, enlacesBusqueda } from "./ejemplos.js";

// backdrop: el ".modal-backdrop" (creado y anexado al container por quien
//   llama) que se reutiliza para mostrar/ocultar el modal.
// row: la palabra a editar, o null/undefined para "Nueva palabra".
// defaults: valores iniciales para una palabra nueva (palabra_ing,
//   palabra_esp, lista, contexto) -- ignorados si row esta presente.
// onSaved(row): se llama tras guardar (creando o editando).
// onDeleted(): se llama tras borrar (solo aplica si row esta presente).
export function openPalabraModal(backdrop, { row = null, defaults = {}, onSaved, onDeleted } = {}) {
  backdrop.innerHTML = "";
  backdrop.hidden = false;

  const ingInput = el("input", { type: "text", value: row?.palabra_ing ?? defaults.palabra_ing ?? "", required: true });
  const espInput = el("input", { type: "text", value: row?.palabra_esp ?? defaults.palabra_esp ?? "", required: true });
  const listaInput = el("input", {
    type: "text",
    inputmode: "numeric",
    pattern: "[0-9]*",
    value: row ? row.lista ?? "" : defaults.lista ?? "",
    placeholder: "1, 2, 3...",
  });
  bindIntegerInput(listaInput);
  const contextoInput = el(
    "textarea",
    { rows: 3, placeholder: "Ej: I've never used a bow and arrow" },
    row?.contexto ?? defaults.contexto ?? ""
  );
  const errorMsg = el("p", { class: "text-sm", style: "color:var(--danger)" }, "");

  // "Sugerir ejemplo": llena el campo de contexto (siempre editable; solo
  // se guarda al presionar Guardar). Ver js/ejemplos.js para las fuentes.
  const suggestBtn = el("button", { type: "button", class: "btn btn-sm", html: `${icon("sparkle")}<span>Sugerir ejemplo</span>` });
  const suggestStatus = el("p", { class: "hint suggest-status", hidden: true });
  const contextoField = el("div", { class: "field" }, [
    el("label", {}, "Palabra en contexto (opcional)"),
    contextoInput,
    el("div", { class: "suggest-row" }, [suggestBtn]),
    suggestStatus,
  ]);
  // Ultimo texto sugerido: si el campo todavia lo tiene, pedir otro no
  // necesita confirmacion (no se pierde nada escrito por el usuario).
  let ultimaSugerencia = "";
  let keyPanel = null;

  function setSuggestStatus(children) {
    suggestStatus.innerHTML = "";
    suggestStatus.append(...[].concat(children));
    suggestStatus.hidden = false;
  }

  suggestBtn.addEventListener("click", () => {
    if (!ingInput.value.trim()) {
      setSuggestStatus("Escribe primero la palabra en ingles.");
      return;
    }
    if (!navigator.onLine) {
      setSuggestStatus("Sin conexion: la sugerencia no esta disponible.");
      return;
    }
    if (!getGeminiKey() && !isGeminiKeyOmitida()) {
      showKeyPanel();
      return;
    }
    pedirSugerencia();
  });

  // La primera vez (sin clave y sin haber dicho "Seguir sin clave") se
  // ofrece configurar la clave de Gemini; tambien se cambia desde Ayuda.
  function showKeyPanel() {
    if (keyPanel) return;
    const keyInput = el("input", { type: "password", placeholder: "Pega tu clave de Gemini", autocomplete: "off" });
    const saveKeyBtn = el("button", { type: "button", class: "btn btn-primary" }, "Guardar");
    const skipBtn = el("button", { type: "button", class: "btn btn-sm" }, "Seguir sin clave");
    keyPanel = el("div", { class: "key-panel" }, [
      el("p", { class: "text-sm" }, [
        "Para ejemplos acordes al significado en espanol, usa tu clave gratuita de Gemini (",
        el("a", { href: "https://aistudio.google.com/apikey", target: "_blank", rel: "noopener" }, "obtener clave"),
        "). Se guarda solo en este dispositivo.",
      ]),
      el("div", { class: "select-with-btn" }, [keyInput, saveKeyBtn]),
      skipBtn,
    ]);
    contextoField.append(keyPanel);
    keyInput.focus();

    function closeKeyPanel() {
      keyPanel.remove();
      keyPanel = null;
      pedirSugerencia();
    }
    saveKeyBtn.addEventListener("click", () => {
      if (!keyInput.value.trim()) return;
      setGeminiKey(keyInput.value);
      setGeminiKeyOmitida(false);
      closeKeyPanel();
    });
    skipBtn.addEventListener("click", () => {
      setGeminiKeyOmitida(true);
      closeKeyPanel();
    });
  }

  async function pedirSugerencia() {
    const actual = contextoInput.value.trim();
    if (actual && actual !== ultimaSugerencia) {
      const ok = await confirmAction("El campo ya tiene un ejemplo. Reemplazarlo por una sugerencia?", { okLabel: "Reemplazar" });
      if (!ok) return;
    }
    suggestBtn.disabled = true;
    setSuggestStatus("Buscando ejemplo...");
    try {
      const r = await sugerirEjemplo({ palabraIng: ingInput.value, palabraEsp: espInput.value, anterior: actual });
      const avisos = r.avisos.length ? ` (${r.avisos.join("; ")})` : "";
      if (r.texto) {
        contextoInput.value = r.texto;
        ultimaSugerencia = r.texto;
        suggestBtn.querySelector("span").textContent = "Otra sugerencia";
        setSuggestStatus(`Fuente: ${r.fuente}${avisos}`);
      } else {
        const links = enlacesBusqueda(ingInput.value).map((l) => el("a", { href: l.url, target: "_blank", rel: "noopener" }, l.nombre));
        setSuggestStatus([`No se encontro un ejemplo${avisos}. Buscalo en `, links[0], " o ", links[1], "."]);
      }
    } catch (err) {
      setSuggestStatus(`No se pudo sugerir: ${err.message || err}`);
    } finally {
      suggestBtn.disabled = false;
    }
  }

  const form = el("div", {}, [
    el("h2", {}, row ? "Editar palabra" : "Nueva palabra"),
    el("div", { class: "field" }, [el("label", {}, "Palabra en ingles"), ingInput]),
    el("div", { class: "field" }, [el("label", {}, "Palabra en espanol"), espInput]),
    el("div", { class: "field" }, [el("label", {}, "Lista"), listaInput]),
    contextoField,
    errorMsg,
  ]);

  const cancelBtn = el("button", { class: "btn" }, "Cancelar");
  const saveBtn = el("button", { class: "btn btn-primary" }, "Guardar");
  const deleteBtn = row
    ? el(
        "button",
        {
          class: "btn btn-danger",
          onclick: async () => {
            const ok = await confirmAction(`Eliminar "${row.palabra_ing}"? Esta accion no se puede deshacer.`, { danger: true, okLabel: "Eliminar" });
            if (!ok) return;
            await deletePalabra(row.id);
            closeModal();
            await onDeleted?.();
          },
        },
        "Borrar"
      )
    : null;
  const actions = row
    ? el("div", { class: "modal-actions modal-actions--split" }, [
        deleteBtn,
        el("div", { class: "modal-actions-group" }, [cancelBtn, saveBtn]),
      ])
    : el("div", { class: "modal-actions" }, [cancelBtn, saveBtn]);
  const modal = el("div", { class: "modal" }, [form, actions]);

  backdrop.append(modal);

  function closeModal() {
    backdrop.hidden = true;
    backdrop.innerHTML = "";
  }

  cancelBtn.addEventListener("click", closeModal);
  // El listener de "click afuera cierra" se ata una sola vez por backdrop
  // (no en cada apertura), para no ir acumulando listeners repetidos. Como
  // closeModal solo toca el backdrop (nunca datos de esta apertura puntual),
  // el de la primera apertura sigue sirviendo para todas las siguientes.
  if (!backdrop.dataset.modalBound) {
    backdrop.dataset.modalBound = "1";
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal();
    });
  }
  saveBtn.addEventListener("click", async () => {
    const palabra_ing = ingInput.value.trim();
    const palabra_esp = espInput.value.trim();
    if (!palabra_ing || !palabra_esp) {
      errorMsg.textContent = "Ingles y espanol son obligatorios.";
      return;
    }
    const listaRaw = listaInput.value.trim();
    if (listaRaw && !/^\d+$/.test(listaRaw)) {
      errorMsg.textContent = "Lista debe ser un numero entero (sin decimales ni texto).";
      return;
    }
    const payload = { palabra_ing, palabra_esp, lista: listaRaw, contexto: contextoInput.value.trim() };
    const saved = row ? await updatePalabra(row.id, payload) : await addPalabra(payload);
    closeModal();
    await onSaved?.(saved);
  });
}
