// Pantalla "Ver" (1. Pantalla_Ver): lista de vocabulario con selector de
// Lista, buscador, orden A-Z y CRUD (Nuevo/Editar/Borrar).

import { el, debounce, distinct, maxNumeric } from "../util/format.js";
import { getVocabulario, exportVocabularioCsv } from "../store.js";
import { openPalabraModal } from "../palabraModal.js";

export async function render(container) {
  const rows = await getVocabulario();
  const listaDefault = maxNumeric(rows, "lista");

  let sortDesc = false;
  let listaFiltro = "";
  let query = "";

  container.append(
    el("h1", { class: "page-title" }, "Palabras"),
    el("p", { class: "page-subtitle" }, "Busca, filtra y edita tu vocabulario.")
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
        el("th", {}, "Aprendida"),
      ]),
    ]);
    const tbody = el("tbody", {});
    filtered.forEach((row) => {
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
            el("td", {}, row.palabra_ing),
            el("td", {}, row.palabra_esp),
            el("td", {}, row.aprendida ? el("span", { class: "badge badge-success" }, "Si") : el("span", { class: "badge" }, "No")),
          ]
        )
      );
    });
    resultsWrap.append(el("div", { class: "table-wrap" }, el("table", {}, [thead, tbody])));
    resultsWrap.append(el("p", { class: "text-sm text-muted" }, "Toca una fila para editarla o borrarla."));
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
  exportBtn.addEventListener("click", () => {
    if (confirm("Descargar vocabulario_*.csv con el estado actual?")) exportVocabularioCsv();
  });
  newBtn.addEventListener("click", () => openModal(null));

  applyFilters();

  // ---------------- modal Nueva/Editar ----------------

  const backdrop = el("div", { class: "modal-backdrop", hidden: true });
  container.append(backdrop);

  function openModal(row) {
    openPalabraModal(backdrop, {
      row,
      defaults: { lista: listaDefault },
      onSaved: render0,
      onDeleted: render0,
    });
  }
}
