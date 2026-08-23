// Pantalla "Traducir" (2. Pantalla_Traducir + 2.1 Guardar_Traduccion).
// El original llamaba al conector Microsoft Translator (requiere auth de
// Power Apps) y auto-detectaba el idioma; aqui se usa la API publica
// MyMemory y se pide explicitamente el sentido de la traduccion.

import { el, maxNumeric } from "../util/format.js";
import { icon } from "../icons.js";
import { translate } from "../translate.js";
import { getVocabulario } from "../store.js";
import { openPalabraModal } from "../palabraModal.js";

const DIR_LABELS = { "en|es": "Ingles → Espanol", "es|en": "Espanol → Ingles" };

export async function render(container) {
  const listaDefault = maxNumeric(await getVocabulario(), "lista");

  container.append(
    el("h1", { class: "page-title" }, "Traducir"),
    el("p", { class: "page-subtitle" }, "Traduce y guardalo como palabra nueva.")
  );

  const card = el("div", { class: "card" });
  container.append(card);

  let dir = "en|es";
  const dirLabel = el("span", {}, DIR_LABELS[dir]);
  const dirBtn = el(
    "button",
    { type: "button", class: "btn", style: "width:100%; justify-content:space-between;" },
    [dirLabel, el("span", { html: icon("sync") })]
  );
  dirBtn.addEventListener("click", () => {
    dir = dir === "en|es" ? "es|en" : "en|es";
    dirLabel.textContent = DIR_LABELS[dir];
  });
  const textInput = el("textarea", { rows: 3, placeholder: "Escribe el texto a traducir..." });
  const translateBtn = el("button", { class: "btn btn-primary" }, "Traducir");
  const errorMsg = el("p", { class: "text-sm", style: "color:var(--danger)", hidden: true }, "");

  card.append(
    el("div", { class: "field" }, [el("label", {}, "Sentido (toca para invertir)"), dirBtn]),
    el("div", { class: "field" }, [el("label", {}, "Texto"), textInput]),
    el("div", { class: "btn-row" }, [translateBtn]),
    errorMsg
  );

  const resultWrap = el("div", { hidden: true, style: "margin-top:var(--space-4)" });
  container.append(resultWrap);

  const backdrop = el("div", { class: "modal-backdrop", hidden: true });
  container.append(backdrop);

  translateBtn.addEventListener("click", async () => {
    const text = textInput.value.trim();
    errorMsg.hidden = true;
    if (!text) return;

    translateBtn.disabled = true;
    translateBtn.textContent = "Traduciendo...";
    try {
      const [from, to] = dir.split("|");
      const result = await translate(text, from, to);
      showResult(text, result, from);
    } catch (err) {
      errorMsg.textContent = err.message || "No se pudo traducir. Revisa tu conexion a internet.";
      errorMsg.hidden = false;
    } finally {
      translateBtn.disabled = false;
      translateBtn.textContent = "Traducir";
    }
  });

  function showResult(original, translated, from) {
    resultWrap.innerHTML = "";
    resultWrap.hidden = false;

    const palabraIng = from === "en" ? original : translated;
    const palabraEsp = from === "en" ? translated : original;

    const saveBtn = el("button", { class: "btn btn-primary" }, "Guardar como palabra nueva");
    const savedMsg = el("p", { class: "text-sm", style: "color:var(--success)", hidden: true }, "Palabra guardada.");

    resultWrap.append(
      el("div", { class: "card" }, [
        el("h2", {}, "Resultado"),
        el("p", {}, [el("strong", {}, translated)]),
        el("div", { class: "btn-row" }, [saveBtn]),
        savedMsg,
      ])
    );

    saveBtn.addEventListener("click", () => {
      openPalabraModal(backdrop, {
        defaults: { palabra_ing: palabraIng, palabra_esp: palabraEsp, lista: listaDefault },
        onSaved: () => {
          savedMsg.hidden = false;
          saveBtn.textContent = "Guardado";
        },
      });
    });
  }
}
