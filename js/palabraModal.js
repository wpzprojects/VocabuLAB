// Modal compartido de Nueva/Editar palabra (usado por Palabras y por
// Traducir al guardar un resultado, para que ambas vias puedan completar
// Lista y Palabra en contexto antes de guardar).

import { el } from "./util/format.js";
import { addPalabra, updatePalabra, deletePalabra } from "./store.js";

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
    type: "number",
    min: "0",
    step: "1",
    inputmode: "numeric",
    value: row ? row.lista ?? "" : defaults.lista ?? "",
    placeholder: "1, 2, 3...",
  });
  const contextoInput = el(
    "textarea",
    { rows: 3, placeholder: "Ej: I've never used a bow and arrow" },
    row?.contexto ?? defaults.contexto ?? ""
  );
  const errorMsg = el("p", { class: "text-sm", style: "color:var(--danger)" }, "");

  const form = el("div", {}, [
    el("h2", {}, row ? "Editar palabra" : "Nueva palabra"),
    el("div", { class: "field" }, [el("label", {}, "Palabra en ingles"), ingInput]),
    el("div", { class: "field" }, [el("label", {}, "Palabra en espanol"), espInput]),
    el("div", { class: "field" }, [el("label", {}, "Lista"), listaInput]),
    el("div", { class: "field" }, [el("label", {}, "Palabra en contexto (opcional)"), contextoInput]),
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
            if (!confirm(`Eliminar "${row.palabra_ing}"?`)) return;
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
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });
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
