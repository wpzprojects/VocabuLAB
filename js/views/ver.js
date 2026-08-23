// Pantalla "Ver" (1. Pantalla_Ver): lista de vocabulario con selector de
// Lista, buscador, orden A-Z y CRUD (Nuevo/Editar/Borrar).

import { el, escapeHtml, debounce, distinct } from "../util/format.js";
import { getVocabulario, addPalabra, updatePalabra, deletePalabra, exportCsv } from "../store.js";

export async function render(container) {
  const rows = await getVocabulario();

  let sortDesc = false;
  let listaFiltro = "";
  let query = "";

  container.append(
    el("h1", { class: "page-title" }, "Palabras"),
    el("p", { class: "page-subtitle" }, "Tu vocabulario en ingles: busca, filtra por lista, y agrega o edita palabras.")
  );

  const toolbar = el("div", { class: "toolbar" });
  const listaSelect = el("select", { id: "ver-lista" }, [
    el("option", { value: "" }, "Todas"),
    ...distinct(rows, "lista").map((v) => el("option", { value: v }, String(v))),
  ]);
  const searchInput = el("input", { type: "search", id: "ver-buscar", placeholder: "Buscar en ingles o espanol..." });
  const sortBtn = el("button", { class: "btn" }, "A-Z");
  const exportBtn = el("button", { class: "btn" }, "Exportar CSV");
  const newBtn = el("button", { class: "btn btn-primary" }, "+ Nueva palabra");

  toolbar.append(
    el("div", { class: "field" }, [el("label", { for: "ver-lista" }, "Lista"), listaSelect]),
    el("div", { class: "field search" }, [el("label", { for: "ver-buscar" }, "Buscar"), searchInput]),
    sortBtn,
    exportBtn,
    newBtn
  );
  container.append(toolbar);

  const resultsWrap = el("div", {});
  container.append(resultsWrap);

  function applyFilters() {
    let filtered = rows.filter((r) => !listaFiltro || String(r.lista) === listaFiltro);
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (r) => r.palabra_ing.toLowerCase().includes(q) || r.palabra_esp.toLowerCase().includes(q)
      );
    }
    filtered = [...filtered].sort((a, b) =>
      sortDesc ? b.palabra_ing.localeCompare(a.palabra_ing, "es") : a.palabra_ing.localeCompare(b.palabra_ing, "es")
    );
    renderResults(filtered);
  }

  function renderResults(filtered) {
    resultsWrap.innerHTML = "";
    resultsWrap.append(el("p", { class: "row-count" }, `Filas: ${filtered.length}`));

    if (filtered.length === 0) {
      resultsWrap.append(el("div", { class: "empty-state" }, el("p", {}, "No hay palabras con esos filtros.")));
      return;
    }

    const thead = el("thead", {}, [
      el("tr", {}, [
        el("th", {}, "Ingles"),
        el("th", {}, "Espanol"),
        el("th", {}, "Lista"),
        el("th", {}, "Aprendida"),
        el("th", {}, ""),
      ]),
    ]);
    const tbody = el("tbody", {});
    filtered.forEach((row) => {
      const editBtn = el("button", { class: "btn btn-sm", onclick: () => openModal(row) }, "Editar");
      const delBtn = el(
        "button",
        {
          class: "btn btn-sm btn-danger",
          onclick: async () => {
            if (!confirm(`Eliminar "${row.palabra_ing}"?`)) return;
            await deletePalabra(row.id);
            await render0();
          },
        },
        "Borrar"
      );
      tbody.append(
        el("tr", {}, [
          el("td", {}, row.palabra_ing),
          el("td", {}, row.palabra_esp),
          el("td", {}, escapeHtml(row.lista || "—")),
          el("td", {}, row.aprendida ? el("span", { class: "badge badge-success" }, "Si") : el("span", { class: "badge" }, "No")),
          el("td", { class: "row-actions" }, [editBtn, delBtn]),
        ])
      );
    });
    resultsWrap.append(el("div", { class: "table-wrap" }, el("table", {}, [thead, tbody])));
  }

  async function render0() {
    container.innerHTML = "";
    await render(container);
  }

  listaSelect.addEventListener("change", () => {
    listaFiltro = listaSelect.value;
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
    sortDesc = !sortDesc;
    applyFilters();
  });
  exportBtn.addEventListener("click", () => exportCsv());
  newBtn.addEventListener("click", () => openModal(null));

  applyFilters();

  // ---------------- modal Nueva/Editar ----------------

  const backdrop = el("div", { class: "modal-backdrop", hidden: true });
  container.append(backdrop);

  function openModal(row) {
    backdrop.innerHTML = "";
    backdrop.hidden = false;

    const ingInput = el("input", { type: "text", value: row?.palabra_ing || "", required: true });
    const espInput = el("input", { type: "text", value: row?.palabra_esp || "", required: true });
    const listaInput = el("input", { type: "text", value: row?.lista ?? "", placeholder: "1, 2, 3..." });
    const contextoInput = el("textarea", { rows: 3, placeholder: "Ej: I've never used a bow and arrow" }, row?.contexto || "");
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
    const modal = el("div", { class: "modal" }, [form, el("div", { class: "modal-actions" }, [cancelBtn, saveBtn])]);

    backdrop.append(modal);

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
      const payload = { palabra_ing, palabra_esp, lista: listaInput.value.trim(), contexto: contextoInput.value.trim() };
      if (row) await updatePalabra(row.id, payload);
      else await addPalabra(payload);
      closeModal();
      render0();
    });
  }

  function closeModal() {
    backdrop.hidden = true;
    backdrop.innerHTML = "";
  }
}
