// Pronunciacion en ingles con la Web Speech API nativa (speechSynthesis).
// Usa el motor de voz del sistema (Google TTS en Android, voces del sistema
// en iOS): sin servicios externos ni API keys, y funciona offline si la voz
// en ingles esta instalada en el telefono.

import { el } from "./util/format.js";
import { icon } from "./icons.js";

export const speechSupported = "speechSynthesis" in window;

let vozIngles = null;

function cargarVozIngles() {
  const voces = speechSynthesis.getVoices();
  vozIngles = voces.find((v) => v.lang === "en-US") || voces.find((v) => v.lang.startsWith("en")) || null;
}

if (speechSupported) {
  cargarVozIngles();
  // Las voces cargan de forma asincrona en varios navegadores.
  speechSynthesis.addEventListener("voiceschanged", cargarVozIngles);
  // Cortar cualquier pronunciacion en curso al cambiar de pantalla.
  window.addEventListener("hashchange", detenerPronunciacion);
}

export function pronunciar(texto) {
  if (!speechSupported || !texto) return;
  speechSynthesis.cancel(); // evita que se encolen pronunciaciones
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = "en-US";
  u.rate = 1; // velocidad normal: a 0.9 algunas voces sonaban distorsionadas
  if (vozIngles) u.voice = vozIngles;
  speechSynthesis.speak(u);
}

export function detenerPronunciacion() {
  if (speechSupported) speechSynthesis.cancel();
}

// Boton de bocina que pronuncia el texto. Devuelve null si el navegador no
// soporta speechSynthesis, para que la vista simplemente no lo muestre.
export function speakButton(texto) {
  if (!speechSupported) return null;
  return el("button", {
    type: "button",
    class: "speak-btn",
    "aria-label": "Escuchar pronunciación",
    title: "Escuchar pronunciación",
    html: icon("speaker"),
    onclick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      pronunciar(texto);
    },
    // Enter/Espacio sobre la bocina no deben llegar a un contenedor que
    // tambien reaccione al teclado (p. ej. las filas de Palabras).
    onkeydown: (e) => {
      if (e.key === "Enter" || e.key === " ") e.stopPropagation();
    },
  });
}
