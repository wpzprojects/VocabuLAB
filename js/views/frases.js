// Pantalla "Frases" (4. Pantalla_Frases): mismo patron de Ver (lista + CRUD)
// aplicado a Frases_Comunes, con un toggle inline de "Aprendida" por fila.

import { el, debounce, distinct, confirmAction } from "../util/format.js";
import { icon } from "../icons.js";
import { getFrases, addFrase, updateFrase, deleteFrase, setFraseAprendida, exportFrasesCsv } from "../store.js";

export async function render(container) {
  const rows = await getFrases();

  let categoriaFiltro = "";
  let query = "";
  let sortDesc = false;
  let aleatorio = false;

  container.append(
    el("h1", { class: "page-title" }, "Frases comunes"),
    el("p", { class: "page-subtitle" }, "Frases frecuentes en ingles por categoria.")
  );

  const catSelect = el("select", {}, [
    el("option", { value: "" }, "Todas"),
    ...distinct(rows, "categoria").map((v) => el("option", { value: v }, String(v))),
  ]);
  const searchInput = el("input", { type: "search", placeholder: "Buscar frase..." });
  const sortBtn = el("button", { class: "btn" }, "A-Z");
  const shuffleBtn = el(
    "button",
    { class: "btn btn-icon-only", "aria-label": "Aleatorizar", title: "Aleatorizar" },
    el("span", { html: icon("shuffle") })
  );
  const exportBtn = el("button", { class: "btn" }, "Exportar CSV");
  const newBtn = el("button", { class: "btn btn-primary" }, "+ Nueva frase");

  const toolbar = el("div", { class: "toolbar" }, [
    el("div", { class: "toolbar-row" }, [
      el("div", { class: "field" }, [el("label", {}, "Categoria"), catSelect]),
      el("div", { class: "field search" }, [el("label", {}, "Buscar"), searchInput]),
    ]),
    el("div", { class: "toolbar-row" }, [sortBtn, shuffleBtn, exportBtn, newBtn]),
  ]);
  container.append(toolbar);

  const resultsWrap = el("div", {});
  container.append(resultsWrap);

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function applyFilters() {
    let filtered = rows.filter((r) => !categoriaFiltro || r.categoria === categoriaFiltro);
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.frase_ing.toLowerCase().includes(q) ||
          r.frase_esp.toLowerCase().includes(q) ||
          (r.notas_uso || "").toLowerCase().includes(q)
      );
    }
    filtered = aleatorio
      ? shuffle(filtered)
      : [...filtered].sort((a, b) =>
          sortDesc ? b.frase_ing.localeCompare(a.frase_ing, "es") : a.frase_ing.localeCompare(b.frase_ing, "es")
        );
    renderResults(filtered);
  }

  function renderResults(filtered) {
    resultsWrap.innerHTML = "";
    resultsWrap.append(el("p", { class: "row-count" }, `Selecciona una fila para editar · Filas: ${filtered.length}`));

    if (filtered.length === 0) {
      resultsWrap.append(el("div", { class: "empty-state" }, el("p", {}, "No hay frases con esos filtros.")));
      return;
    }

    const thead = el("thead", {}, [
      el("tr", {}, [
        el("th", {}, "Ingles"),
        el("th", { class: "col-center" }, "Aprendida"),
        el("th", {}, "Espanol"),
      ]),
    ]);
    const tbody = el("tbody", {});
    filtered.forEach((row) => {
      const learnedCheck = el("input", { type: "checkbox", checked: row.aprendida || null });
      learnedCheck.addEventListener("click", (e) => e.stopPropagation());
      learnedCheck.addEventListener("change", async () => {
        await setFraseAprendida(row.id, learnedCheck.checked);
        row.aprendida = learnedCheck.checked;
      });

      tbody.append(
        el(
          "tr",
          {
            class: "clickable",
            tabindex: "0",
            onclick: () => openModal(row),
            onkeydown: (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openModal(row);
              }
            },
          },
          [
            el("td", {}, row.frase_ing),
            el("td", { class: "col-center" }, learnedCheck),
            el("td", {}, row.frase_esp),
          ]
        )
      );
    });
    resultsWrap.append(el("div", { class: "table-wrap" }, el("table", {}, [thead, tbody])));
  }

  async function render0() {
    container.innerHTML = "";
    await render(container);
  }

  catSelect.addEventListener("change", () => {
    categoriaFiltro = catSelect.value;
    applyFilters();
  });
  searchInput.addEventListener(
    "input",
    debounce(() => {
      query = searchInput.value.trim();
      applyFilters();
    }, 200)
  );
  sortBtn.addEventListener("click", () => {
    aleatorio = false;
    sortDesc = !sortDesc;
    applyFilters();
  });
  shuffleBtn.addEventListener("click", () => {
    aleatorio = true;
    applyFilters();
  });
  exportBtn.addEventListener("click", async () => {
    if (await confirmAction("Descargar frases_*.csv con el estado actual?")) exportFrasesCsv();
  });
  newBtn.addEventListener("click", () => openModal(null));

  applyFilters();

  // ---------------- modal Nueva/Editar ----------------

  const backdrop = el("div", { class: "modal-backdrop", hidden: true });
  container.append(backdrop);

  function openModal(row) {
    backdrop.innerHTML = "";
    backdrop.hidden = false;

    const categorias = distinct(rows, "categoria");
    const ingInput = el("input", { type: "text", value: row?.frase_ing || "" });
    const espInput = el("input", { type: "text", value: row?.frase_esp || "" });
    const notasInput = el("textarea", { rows: 2, placeholder: "Notas de uso (opcional)" }, row?.notas_uso || "");
    const errorMsg = el("p", { class: "text-sm", style: "color:var(--danger)" }, "");

    const yaEsCategoriaConocida = row?.categoria && categorias.includes(row.categoria);
    const catSelectModal = el("select", {}, [
      el("option", { value: "" }, "Sin categoria"),
      ...categorias.map((v) => el("option", { value: v }, String(v))),
    ]);
    if (yaEsCategoriaConocida) catSelectModal.value = row.categoria;

    const nuevaCatCheck = el("input", { type: "checkbox", checked: row?.categoria && !yaEsCategoriaConocida ? "" : null });
    const nuevaCatInput = el("input", {
      type: "text",
      placeholder: "Nombre de la categoria",
      value: row?.categoria && !yaEsCategoriaConocida ? row.categoria : "",
      hidden: !nuevaCatCheck.checked || null,
    });
    nuevaCatCheck.addEventListener("change", () => {
      nuevaCatInput.hidden = !nuevaCatCheck.checked;
      catSelectModal.disabled = nuevaCatCheck.checked;
      if (nuevaCatCheck.checked) nuevaCatInput.focus();
    });
    catSelectModal.disabled = nuevaCatCheck.checked;

    const cancelBtn = el("button", { class: "btn" }, "Cancelar");
    const saveBtn = el("button", { class: "btn btn-primary" }, "Guardar");
    const deleteBtn = row
      ? el(
          "button",
          {
            class: "btn btn-danger",
            onclick: async () => {
              const ok = await confirmAction(`Eliminar "${row.frase_ing}"? Esta accion no se puede deshacer.`, { danger: true, okLabel: "Eliminar" });
              if (!ok) return;
              await deleteFrase(row.id);
              closeModal();
              await render0();
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
    const modal = el("div", { class: "modal" }, [
      el("h2", {}, row ? "Editar frase" : "Nueva frase"),
      el("div", { class: "field" }, [el("label", {}, "Frase en ingles"), ingInput]),
      el("div", { class: "field" }, [el("label", {}, "Frase en espanol"), espInput]),
      el("div", { class: "field" }, [el("label", {}, "Categoria existente"), catSelectModal]),
      el("div", { class: "field" }, [
        el("label", { class: "checkbox-row" }, [nuevaCatCheck, "Agregar categoria nueva"]),
        nuevaCatInput,
      ]),
      el("div", { class: "field" }, [el("label", {}, "Notas de uso"), notasInput]),
      errorMsg,
      actions,
    ]);
    backdrop.append(modal);

    cancelBtn.addEventListener("click", closeModal);
    if (!backdrop.dataset.modalBound) {
      backdrop.dataset.modalBound = "1";
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) closeModal();
      });
    }
    saveBtn.addEventListener("click", async () => {
      const frase_ing = ingInput.value.trim();
      const frase_esp = espInput.value.trim();
      if (!frase_ing || !frase_esp) {
        errorMsg.textContent = "Ingles y espanol son obligatorios.";
        return;
      }
      const categoria = nuevaCatCheck.checked ? nuevaCatInput.value.trim() : catSelectModal.value;
      const payload = { categoria, frase_ing, frase_esp, notas_uso: notasInput.value.trim() };
      if (row) await updateFrase(row.id, payload);
      else await addFrase(payload);
      closeModal();
      render0();
    });
  }

  function closeModal() {
    backdrop.hidden = true;
    backdrop.innerHTML = "";
  }
}
