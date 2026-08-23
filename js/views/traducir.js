// Pantalla "Traducir" (2. Pantalla_Traducir + 2.1 Guardar_Traduccion).
// El original llamaba al conector Microsoft Translator (requiere auth de
// Power Apps) y auto-detectaba el idioma; aqui se usa la API publica
// MyMemory y se pide explicitamente el sentido de la traduccion.

import { el, maxNumeric } from "../util/format.js";
import { translate } from "../translate.js";
import { addPalabra, getVocabulario } from "../store.js";

export async function render(container) {
  const listaDefault = maxNumeric(await getVocabulario(), "lista");

  container.append(
    el("h1", { class: "page-title" }, "Traducir"),
    el("p", { class: "page-subtitle" }, "Traduce y guardalo como palabra nueva.")
  );

  const card = el("div", { class: "card" });
  container.append(card);

  const dirSelect = el("select", {}, [
    el("option", { value: "en|es" }, "Ingles → Espanol"),
    el("option", { value: "es|en" }, "Espanol → Ingles"),
  ]);
  const textInput = el("textarea", { rows: 3, placeholder: "Escribe el texto a traducir..." });
  const translateBtn = el("button", { class: "btn btn-primary" }, "Traducir");
  const errorMsg = el("p", { class: "text-sm", style: "color:var(--danger)", hidden: true }, "");

  card.append(
    el("div", { class: "field" }, [el("label", {}, "Sentido"), dirSelect]),
    el("div", { class: "field" }, [el("label", {}, "Texto"), textInput]),
    el("div", { class: "btn-row" }, [translateBtn]),
    errorMsg
  );

  const resultWrap = el("div", { hidden: true });
  container.append(resultWrap);

  translateBtn.addEventListener("click", async () => {
    const text = textInput.value.trim();
    errorMsg.hidden = true;
    if (!text) return;

    translateBtn.disabled = true;
    translateBtn.textContent = "Traduciendo...";
    try {
      const [from, to] = dirSelect.value.split("|");
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

    const listaInput = el("input", {
      type: "number",
      min: "0",
      step: "1",
      inputmode: "numeric",
      value: listaDefault,
      placeholder: "1, 2, 3...",
    });
    const saveBtn = el("button", { class: "btn btn-primary" }, "Guardar como palabra nueva");
    const saveErrorMsg = el("p", { class: "text-sm", style: "color:var(--danger)", hidden: true }, "");
    const savedMsg = el("p", { class: "text-sm", style: "color:var(--success)", hidden: true }, "Palabra guardada.");

    resultWrap.append(
      el("div", { class: "card" }, [
        el("h2", {}, "Resultado"),
        el("p", {}, [el("strong", {}, translated)]),
        el("div", { class: "field" }, [el("label", {}, "Guardar en la lista"), listaInput]),
        saveErrorMsg,
        el("div", { class: "btn-row" }, [saveBtn]),
        savedMsg,
      ])
    );

    saveBtn.addEventListener("click", async () => {
      const listaRaw = listaInput.value.trim();
      if (listaRaw && !/^\d+$/.test(listaRaw)) {
        saveErrorMsg.textContent = "Lista debe ser un numero entero (sin decimales ni texto).";
        saveErrorMsg.hidden = false;
        return;
      }
      saveErrorMsg.hidden = true;
      saveBtn.disabled = true;
      await addPalabra({ lista: listaRaw, palabra_ing: palabraIng, palabra_esp: palabraEsp });
      savedMsg.hidden = false;
      saveBtn.textContent = "Guardado";
    });
  }
}
