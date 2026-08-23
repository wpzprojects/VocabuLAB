// Pantalla "Practicar" (3. Pantalla_Practicar): tarjetas de vocabulario con
// filtro por Lista/Aprendida, orden aleatorio, toggle de idioma mostrado
// primero, boton "Ver" para revelar la traduccion, y marcar Aprendida.

import { el, distinct } from "../util/format.js";
import { getVocabulario, updatePalabra, setAprendida } from "../store.js";

export async function render(container) {
  const rows = await getVocabulario();

  const state = { lista: "", aprendida: "", aleatorio: false, swap: false };

  container.append(
    el("h1", { class: "page-title" }, "Practicar vocabulario"),
    el("p", { class: "page-subtitle" }, "Repasa tus palabras con tarjetas.")
  );

  const listaSelect = el("select", {}, [
    el("option", { value: "" }, "Todas"),
    ...distinct(rows, "lista").map((v) => el("option", { value: v }, String(v))),
  ]);
  const aprendidaSelect = el("select", {}, [
    el("option", { value: "" }, "Todas"),
    el("option", { value: "si" }, "Si"),
    el("option", { value: "no" }, "No"),
  ]);
  const aleatorioCheck = el("input", { type: "checkbox" });
  const swapToggle = el("input", { type: "checkbox" });

  const toolbar = el("div", { class: "flash-toolbar" }, [
    el("div", { class: "field" }, [el("label", {}, "Lista"), listaSelect]),
    el("div", { class: "field" }, [el("label", {}, "Aprendida"), aprendidaSelect]),
    el("div", { class: "field field-auto" }, [
      el("span", { class: "field-title" }, "Orden"),
      el("label", { class: "checkbox-row" }, ["Aleatorio", aleatorioCheck]),
    ]),
    el("div", { class: "field field-auto" }, [
      el("span", { class: "field-title" }, "Idioma"),
      el("label", { class: "toggle-row" }, [
        el("span", {}, "Intercambiar"),
        el("span", { class: "toggle-switch" }, [swapToggle, el("span", { class: "track" }), el("span", { class: "thumb" })]),
      ]),
    ]),
  ]);
  container.append(toolbar);

  const countEl = el("p", { class: "row-count" }, "");
  const list = el("div", { class: "flash-list" });
  container.append(countEl, list);

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function applyFilters() {
    let filtered = rows.filter(
      (r) =>
        (!state.lista || String(r.lista) === state.lista) &&
        (!state.aprendida || (state.aprendida === "si" ? r.aprendida : !r.aprendida))
    );
    filtered = state.aleatorio
      ? shuffle(filtered)
      : [...filtered].sort((a, b) => a.palabra_ing.localeCompare(b.palabra_ing, "es"));
    renderList(filtered);
  }

  function renderList(filtered) {
    countEl.textContent = `Filas: ${filtered.length}`;
    list.innerHTML = "";
    if (filtered.length === 0) {
      list.append(el("div", { class: "empty-state" }, el("p", {}, "No hay palabras con esos filtros.")));
      return;
    }
    filtered.forEach((row) => list.append(buildCard(row)));
  }

  function buildCard(row) {
    const primary = state.swap ? row.palabra_esp : row.palabra_ing;
    const secondary = state.swap ? row.palabra_ing : row.palabra_esp;

    const card = el("div", { class: `flash-card${row.aprendida ? "" : " pending"}` });
    const secondaryEl = el("div", { class: "flash-secondary", hidden: true }, secondary);
    const contextEl = row.contexto ? el("div", { class: "flash-context", hidden: true }, row.contexto) : null;
    const main = el("div", { class: "flash-main" }, [
      el("div", { class: "flash-primary" }, primary),
      secondaryEl,
      ...(contextEl ? [contextEl] : []),
    ]);

    const revealBtn = el("button", { class: "btn btn-sm" }, "Ver");
    revealBtn.addEventListener("click", () => {
      secondaryEl.hidden = !secondaryEl.hidden;
      if (contextEl) contextEl.hidden = secondaryEl.hidden;
      revealBtn.textContent = secondaryEl.hidden ? "Ver" : "Ocultar";
    });

    const editBtn = el("button", { class: "btn btn-sm" }, "Editar");
    editBtn.addEventListener("click", () => openEditModal(row));

    const learnedCheck = el("input", { type: "checkbox", checked: row.aprendida || null });
    learnedCheck.addEventListener("change", async () => {
      await setAprendida(row.id, learnedCheck.checked);
      row.aprendida = learnedCheck.checked;
      card.classList.toggle("pending", !learnedCheck.checked);
    });
    const learnedToggle = el("label", { class: "toggle-row" }, [
      el("span", {}, "Aprendida"),
      el("span", { class: "toggle-switch" }, [learnedCheck, el("span", { class: "track" }), el("span", { class: "thumb" })]),
    ]);

    card.append(main, el("div", { class: "flash-actions" }, [revealBtn, editBtn, learnedToggle]));
    return card;
  }

  listaSelect.addEventListener("change", () => {
    state.lista = listaSelect.value;
    applyFilters();
  });
  aprendidaSelect.addEventListener("change", () => {
    state.aprendida = aprendidaSelect.value;
    applyFilters();
  });
  aleatorioCheck.addEventListener("change", () => {
    state.aleatorio = aleatorioCheck.checked;
    applyFilters();
  });
  swapToggle.addEventListener("change", () => {
    state.swap = swapToggle.checked;
    applyFilters();
  });

  applyFilters();

  // ---------------- modal Editar ----------------

  const backdrop = el("div", { class: "modal-backdrop", hidden: true });
  container.append(backdrop);

  function openEditModal(row) {
    backdrop.innerHTML = "";
    backdrop.hidden = false;

    const ingInput = el("input", { type: "text", value: row.palabra_ing });
    const espInput = el("input", { type: "text", value: row.palabra_esp });
    const listaInput = el("input", { type: "text", value: row.lista ?? "" });
    const contextoInput = el("textarea", { rows: 3 }, row.contexto || "");

    const cancelBtn = el("button", { class: "btn" }, "Cancelar");
    const saveBtn = el("button", { class: "btn btn-primary" }, "Guardar cambios");
    const modal = el("div", { class: "modal" }, [
      el("h2", {}, "Editar palabra"),
      el("div", { class: "field" }, [el("label", {}, "Palabra en ingles"), ingInput]),
      el("div", { class: "field" }, [el("label", {}, "Palabra en espanol"), espInput]),
      el("div", { class: "field" }, [el("label", {}, "Lista"), listaInput]),
      el("div", { class: "field" }, [el("label", {}, "Palabra en contexto"), contextoInput]),
      el("div", { class: "modal-actions" }, [cancelBtn, saveBtn]),
    ]);
    backdrop.append(modal);

    cancelBtn.addEventListener("click", closeModal);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal();
    });
    saveBtn.addEventListener("click", async () => {
      const patch = {
        palabra_ing: ingInput.value.trim(),
        palabra_esp: espInput.value.trim(),
        lista: listaInput.value.trim(),
        contexto: contextoInput.value.trim(),
      };
      await updatePalabra(row.id, patch);
      Object.assign(row, patch);
      closeModal();
      applyFilters();
    });
  }

  function closeModal() {
    backdrop.hidden = true;
    backdrop.innerHTML = "";
  }
}
