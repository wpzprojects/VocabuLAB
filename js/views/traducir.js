// Pantalla "Traducir" (2. Pantalla_Traducir + 2.1 Guardar_Traduccion).
// El original llamaba al conector Microsoft Translator (requiere auth de
// Power Apps) y auto-detectaba el idioma; aqui se usa la API publica
// MyMemory y se pide explicitamente el sentido de la traduccion. "Traducir
// con IA" usa Gemini (con la clave del usuario) y ofrece varias acepciones
// para elegir cual guardar.

import { el, maxNumeric } from "../util/format.js";
import { icon } from "../icons.js";
import { translate, translateConGemini } from "../translate.js";
import { getVocabulario, getGeminiKey, setGeminiKey, setGeminiKeyOmitida } from "../store.js";
import { openPalabraModal } from "../palabraModal.js";

const DIR_LABELS = { "en|es": "Ingles → Espanol", "es|en": "Espanol → Ingles" };

export async function render(container) {
  const listaDefault = maxNumeric(await getVocabulario(), "lista");

  container.append(
    el("h1", { class: "page-title" }, "Traducir palabras"),
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
  const translateBtn = el("button", { type: "button", class: "btn" }, "Traducir");
  const geminiBtn = el("button", { type: "button", class: "btn btn-primary", html: `${icon("sparkle")}<span>Traducir con IA</span>` });
  const errorMsg = el("p", { class: "text-sm", style: "color:var(--danger)", hidden: true }, "");
  const keyPanelSlot = el("div", {});

  card.append(
    el("div", { class: "field" }, [el("label", {}, "Sentido (toca para invertir)"), dirBtn]),
    el("div", { class: "field" }, [el("label", {}, "Texto"), textInput]),
    el("div", { class: "btn-row btn-row-equal" }, [translateBtn, geminiBtn]),
    keyPanelSlot,
    errorMsg
  );

  const resultWrap = el("div", { hidden: true, style: "margin-top:var(--space-4)" });
  container.append(resultWrap);

  const backdrop = el("div", { class: "modal-backdrop", hidden: true });
  container.append(backdrop);

  function showError(mensaje) {
    errorMsg.textContent = mensaje;
    errorMsg.hidden = false;
  }

  // Corre una traduccion bloqueando ambos botones; `boton` muestra el
  // estado "Traduciendo...".
  async function ejecutar(boton, traducirFn) {
    const text = textInput.value.trim();
    errorMsg.hidden = true;
    if (!text) return;

    const htmlOriginal = boton.innerHTML;
    translateBtn.disabled = geminiBtn.disabled = true;
    boton.textContent = "Traduciendo...";
    try {
      const [from, to] = dir.split("|");
      const { opciones, fuente } = await traducirFn(text, from, to);
      showResult(text, opciones, fuente, from);
    } catch (err) {
      showError(err.message || "No se pudo traducir. Revisa tu conexion a internet.");
    } finally {
      translateBtn.disabled = geminiBtn.disabled = false;
      boton.innerHTML = htmlOriginal;
    }
  }

  translateBtn.addEventListener("click", () =>
    ejecutar(translateBtn, async (text, from, to) => ({
      opciones: [{ texto: await translate(text, from, to), nota: "" }],
      fuente: "MyMemory",
    }))
  );

  function traducirConIa() {
    ejecutar(geminiBtn, async (text, from, to) => {
      try {
        return { opciones: await translateConGemini(text, from, to, getGeminiKey()), fuente: "Gemini" };
      } catch (err) {
        const motivo = err.message || "no se pudo contactar a Gemini";
        throw new Error(`${motivo.charAt(0).toUpperCase()}${motivo.slice(1)}. Puedes usar Traducir mientras tanto.`);
      }
    });
  }

  geminiBtn.addEventListener("click", () => {
    errorMsg.hidden = true;
    if (!textInput.value.trim()) return;
    if (!navigator.onLine) {
      showError("Sin conexion: la traduccion no esta disponible.");
      return;
    }
    if (!getGeminiKey()) {
      showKeyPanel();
      return;
    }
    traducirConIa();
  });

  // Sin clave guardada se ofrece pegarla aqui mismo (tambien se cambia desde
  // Ayuda). A diferencia de Sugerir ejemplo no hay "Seguir sin clave": para
  // traducir sin IA esta el boton Traducir.
  function showKeyPanel() {
    if (keyPanelSlot.firstChild) return;
    const keyInput = el("input", { type: "password", placeholder: "Pega tu clave de Gemini", autocomplete: "off" });
    const saveKeyBtn = el("button", { type: "button", class: "btn btn-primary" }, "Guardar");
    const cancelBtn = el("button", { type: "button", class: "btn btn-sm" }, "Cancelar");
    keyPanelSlot.append(
      el("div", { class: "key-panel" }, [
        el("p", { class: "text-sm" }, [
          "Traducir con IA usa tu clave gratuita de Gemini (",
          el("a", { href: "https://aistudio.google.com/apikey", target: "_blank", rel: "noopener" }, "obtener clave"),
          "). Se guarda solo en este dispositivo.",
        ]),
        el("div", { class: "select-with-btn" }, [keyInput, saveKeyBtn]),
        cancelBtn,
      ])
    );
    keyInput.focus();

    saveKeyBtn.addEventListener("click", () => {
      if (!keyInput.value.trim()) return;
      setGeminiKey(keyInput.value);
      setGeminiKeyOmitida(false);
      keyPanelSlot.innerHTML = "";
      traducirConIa();
    });
    cancelBtn.addEventListener("click", () => {
      keyPanelSlot.innerHTML = "";
    });
  }

  // Con una sola opcion se muestra como texto; con varias (Gemini) se
  // eligen tocandolas y las seleccionadas son las que se guardan.
  function showResult(original, opciones, fuente, from) {
    resultWrap.innerHTML = "";
    resultWrap.hidden = false;

    let elegida = opciones[0].texto;

    const saveBtn = el("button", { class: "btn btn-primary" }, "Guardar como palabra nueva");
    const savedMsg = el("p", { class: "text-sm", style: "color:var(--success)", hidden: true }, "Palabra guardada.");

    let cuerpo;
    if (opciones.length === 1) {
      cuerpo = el("div", {}, [
        el("p", { style: "margin-bottom:0" }, [el("strong", {}, opciones[0].texto)]),
        opciones[0].nota ? el("p", { class: "text-sm text-muted", style: "margin-top:var(--space-1)" }, opciones[0].nota) : null,
      ]);
    } else {
      // Seleccion multiple: las opciones marcadas se guardan unidas por
      // comas, en el orden en que el usuario las fue marcando. La primera
      // viene marcada de entrada.
      const seleccion = [0];
      const botones = opciones.map((o, i) => {
        const b = el(
          "button",
          { type: "button", class: "translation-option", "aria-pressed": i === 0 ? "true" : "false" },
          [el("strong", {}, o.texto), o.nota ? el("span", { class: "text-sm text-muted" }, o.nota) : null]
        );
        b.addEventListener("click", () => {
          const pos = seleccion.indexOf(i);
          if (pos === -1) seleccion.push(i);
          else seleccion.splice(pos, 1);
          b.setAttribute("aria-pressed", pos === -1 ? "true" : "false");
          elegida = seleccion.map((j) => opciones[j].texto).join(", ");
          saveBtn.disabled = !elegida;
          savedMsg.hidden = true;
          saveBtn.textContent = "Guardar como palabra nueva";
        });
        return b;
      });
      cuerpo = el("div", {}, [
        el("p", { class: "text-sm text-muted", style: "margin-top:0" }, "Toca una o varias opciones para guardar:"),
        el("div", { class: "translation-options" }, botones),
      ]);
    }

    resultWrap.append(
      el("div", { class: "card" }, [
        el("div", { class: "result-header" }, [
          el("h2", { style: "margin:0" }, "Resultado"),
          el("span", { class: "text-sm text-muted" }, `Fuente: ${fuente}`),
        ]),
        cuerpo,
        el("div", { class: "btn-row" }, [saveBtn]),
        savedMsg,
      ])
    );

    saveBtn.addEventListener("click", () => {
      // La traduccion guardada siempre arranca en mayuscula.
      elegida = elegida.charAt(0).toUpperCase() + elegida.slice(1);
      const palabraIng = from === "en" ? original : elegida;
      const palabraEsp = from === "en" ? elegida : original;
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
