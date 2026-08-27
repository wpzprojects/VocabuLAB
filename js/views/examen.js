// Pantalla "Examen" (5. Pantalla_Examen): quiz de escritura -- se muestra
// una palabra y hay que escribir su traduccion. La validacion (ver
// isCorrectAnswer en util/format.js) es flexible: ignora mayusculas,
// tildes, puntuacion final, un articulo inicial (the/el/la/un...), acepta
// cualquiera de las traducciones si hay varias separadas por coma, y
// tolera 1-2 errores de tipeo segun el largo de la palabra.

import { el, distinct, isCorrectAnswer } from "../util/format.js";
import { getVocabulario } from "../store.js";

export async function render(container) {
  const rows = await getVocabulario();

  const state = { lista: "", aprendida: "", aleatorio: false, swap: false, limite: 5 };
  let aciertos = 0;
  let total = 0;

  container.append(
    el("h1", { class: "page-title" }, "Test de vocabulario"),
    el("p", { class: "page-subtitle" }, "Pon a prueba tu vocabulario.")
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
  const limiteInput = el("input", { type: "number", min: 0, max: 100, step: 5, value: String(state.limite) });
  const aleatorioCheck = el("input", { type: "checkbox" });
  const swapToggle = el("input", { type: "checkbox" });
  const resultText = el("span", { class: "quiz-score" }, "Resultado: 0/0");
  const resetBtn = el("button", { class: "btn" }, "Reset test");

  container.append(
    el("div", { class: "flash-toolbar gap-sm" }, [
      el("div", { class: "field" }, [el("label", {}, "Lista"), listaSelect]),
      el("div", { class: "field" }, [el("label", {}, "Aprendidas"), aprendidaSelect]),
    ])
  );
  container.append(
    el("div", { class: "flash-toolbar" }, [
      el("label", { class: "checkbox-row field-auto" }, ["Orden aleatorio", aleatorioCheck]),
      el("label", { class: "toggle-row field-auto" }, [
        el("span", {}, "Intercambiar idioma"),
        el("span", { class: "toggle-switch" }, [swapToggle, el("span", { class: "track" }), el("span", { class: "thumb" })]),
      ]),
    ])
  );
  container.append(
    el("div", { class: "flash-toolbar" }, [
      el("div", { class: "field" }, [el("label", {}, "# de palabras"), limiteInput]),
      resultText,
      resetBtn,
    ])
  );

  const list = el("div", { class: "flash-list" });
  container.append(list);

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildQuestions() {
    let filtered = rows.filter(
      (r) =>
        (!state.lista || String(r.lista) === state.lista) &&
        (!state.aprendida || (state.aprendida === "si" ? r.aprendida : !r.aprendida))
    );
    filtered = state.aleatorio
      ? shuffle(filtered)
      : [...filtered].sort((a, b) => a.palabra_ing.localeCompare(b.palabra_ing, "es"));
    if (state.limite > 0) filtered = filtered.slice(0, state.limite);
    return filtered;
  }

  function updateScore() {
    resultText.textContent = `Resultado: ${aciertos}/${total}`;
  }

  function renderQuestions() {
    aciertos = 0;
    total = 0;
    updateScore();
    list.innerHTML = "";

    const questions = buildQuestions();
    if (questions.length === 0) {
      list.append(el("div", { class: "empty-state" }, el("p", {}, "No hay palabras con esos filtros.")));
      return;
    }

    questions.forEach((row) => {
      const prompt = state.swap ? row.palabra_esp : row.palabra_ing;
      const expected = state.swap ? row.palabra_ing : row.palabra_esp;

      const rowEl = el("div", { class: "quiz-row" });
      const promptEl = el("div", { class: "quiz-prompt" }, prompt);
      const input = el("input", { type: "text", placeholder: "Tu respuesta..." });
      const checkBtn = el("button", { class: "btn btn-sm" }, "Evaluar");

      function evaluate() {
        if (input.disabled) return;
        const ok = isCorrectAnswer(input.value, expected);
        rowEl.classList.add(ok ? "correct" : "incorrect");
        input.disabled = true;
        checkBtn.disabled = true;
        promptEl.append(el("span", { class: "quiz-correct" }, `→ ${expected}`));
        aciertos += ok ? 1 : 0;
        total += 1;
        updateScore();
      }

      checkBtn.addEventListener("click", evaluate);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") evaluate();
      });

      rowEl.append(promptEl, el("div", { class: "quiz-answer-row" }, [input, checkBtn]));
      list.append(rowEl);
    });
  }

  listaSelect.addEventListener("change", () => {
    state.lista = listaSelect.value;
    renderQuestions();
  });
  aprendidaSelect.addEventListener("change", () => {
    state.aprendida = aprendidaSelect.value;
    renderQuestions();
  });
  limiteInput.addEventListener("change", () => {
    state.limite = Number(limiteInput.value) || 0;
    renderQuestions();
  });
  aleatorioCheck.addEventListener("change", () => {
    state.aleatorio = aleatorioCheck.checked;
    renderQuestions();
  });
  swapToggle.addEventListener("change", () => {
    state.swap = swapToggle.checked;
    renderQuestions();
  });
  resetBtn.addEventListener("click", renderQuestions);

  renderQuestions();
}
