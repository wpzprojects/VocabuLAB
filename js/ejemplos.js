// Sugerencia de ejemplos de uso para una palabra en ingles. Fuentes en
// orden de prioridad:
//   1. Gemini (si el usuario configuro su clave): frase corta y natural con
//      la acepcion que indica la palabra en espanol.
//   2. Free Dictionary API (dictionaryapi.dev): sin clave, pero muchas
//      palabras no traen ejemplo y no distingue acepciones.
//   3. Si ninguna devuelve nada, la vista ofrece enlaces de busqueda manual
//      (enlacesBusqueda).
// Las APIs se llaman directo desde el navegador (ambas permiten CORS).

import { getGeminiKey } from "./store.js";
import { generarConGemini } from "./gemini.js";

// Quita notas entre parentesis que el usuario agrega a la palabra, p. ej.
// "Abroad (L1 ok)" -> "Abroad".
export function limpiarPalabra(texto) {
  return String(texto || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Separa las acepciones guardadas con comas ("Correr, funcionar") para
// pedir el ejemplo con una sola a la vez.
function acepciones(texto) {
  const partes = limpiarPalabra(texto).split(",").map((p) => p.trim()).filter(Boolean);
  return partes.length ? partes : [""];
}

async function desdeGemini(palabra, significado, anterior, clave) {
  const partes = [
    `Write one short, natural English example sentence (intermediate level, at most 15 words) using "${palabra}"`,
    significado ? ` with the meaning of the Spanish "${significado}".` : ".",
    anterior ? ` It must be different from: "${anterior}".` : "",
    " Reply with only the sentence: no quotes, no translation, no explanation.",
  ];
  const respuesta = await generarConGemini(partes.join(""), clave);
  const texto = respuesta
    .split("\n")[0]
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .trim();
  return texto || null;
}

async function desdeDiccionario(palabra, anterior) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(palabra.toLowerCase())}`;
  const res = await fetch(url);
  if (res.status === 404) return null; // la palabra no existe en el diccionario
  if (!res.ok) throw new Error(`el diccionario respondio con error ${res.status}`);
  const data = await res.json();
  const ejemplos = [];
  for (const entrada of data || []) {
    for (const acepcion of entrada.meanings || []) {
      for (const def of acepcion.definitions || []) {
        if (def.example && !ejemplos.includes(def.example)) ejemplos.push(def.example);
      }
    }
  }
  if (ejemplos.length === 0) return null;
  // Al pedir otra sugerencia, rota al siguiente ejemplo en vez de repetir.
  const i = ejemplos.indexOf(anterior);
  return ejemplos[(i + 1) % ejemplos.length];
}

// Devuelve { texto, fuente } o { texto: null }, y en `avisos` los motivos
// por los que alguna fuente fallo (para mostrarlos discretamente).
// turno: numero de sugerencias ya pedidas; si la palabra tiene varias
// acepciones separadas por comas, cada sugerencia usa la siguiente en el
// orden guardado (la primera, luego la segunda... y vuelve a empezar).
export async function sugerirEjemplo({ palabraIng, palabraEsp, anterior = "", turno = 0 }) {
  const ings = acepciones(palabraIng);
  const esps = acepciones(palabraEsp);
  const palabra = ings[turno % ings.length];
  const significado = esps[turno % esps.length];
  const avisos = [];
  const clave = getGeminiKey();

  if (clave) {
    try {
      const texto = await desdeGemini(palabra, significado, anterior, clave);
      if (texto) return { texto, fuente: "Gemini", avisos };
    } catch (err) {
      avisos.push(err.message || String(err));
    }
  }

  try {
    const texto = await desdeDiccionario(palabra, anterior);
    if (texto) return { texto, fuente: "Free Dictionary", avisos };
  } catch (err) {
    avisos.push(err.message || String(err));
  }

  return { texto: null, avisos };
}

// Ultimo recurso: buscar a mano un ejemplo y copiarlo.
export function enlacesBusqueda(palabraIng) {
  const palabra = acepciones(palabraIng)[0];
  return [
    { nombre: "YouGlish", url: `https://youglish.com/pronounce/${encodeURIComponent(palabra)}/english/us` },
    {
      nombre: "Cambridge",
      url: `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(palabra.toLowerCase().replace(/\s+/g, "-"))}`,
    },
  ];
}
