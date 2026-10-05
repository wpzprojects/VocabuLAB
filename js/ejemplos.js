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

// Modelo ligero con capa gratuita. Si Google lo retira, basta cambiarlo
// aqui (ver https://ai.google.dev/gemini-api/docs/models).
const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Quita notas entre parentesis que el usuario agrega a la palabra, p. ej.
// "Abroad (L1 ok)" -> "Abroad".
export function limpiarPalabra(texto) {
  return String(texto || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function desdeGemini(palabra, significado, anterior, clave) {
  const partes = [
    `Write one short, natural English example sentence (intermediate level, at most 15 words) using "${palabra}"`,
    significado ? ` with the meaning of the Spanish "${significado}".` : ".",
    anterior ? ` It must be different from: "${anterior}".` : "",
    " Reply with only the sentence: no quotes, no translation, no explanation.",
  ];
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": clave },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: partes.join("") }] }],
      generationConfig: { temperature: 1, maxOutputTokens: 256 },
    }),
  });
  if (!res.ok) {
    if (res.status === 400 || res.status === 401 || res.status === 403) throw new Error("la clave de Gemini no es valida");
    if (res.status === 429) throw new Error("se alcanzo el limite de uso de Gemini");
    throw new Error(`Gemini respondio con error ${res.status}`);
  }
  const data = await res.json();
  const texto = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("")
    .trim()
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
export async function sugerirEjemplo({ palabraIng, palabraEsp, anterior = "" }) {
  const palabra = limpiarPalabra(palabraIng);
  const avisos = [];
  const clave = getGeminiKey();

  if (clave) {
    try {
      const texto = await desdeGemini(palabra, limpiarPalabra(palabraEsp), anterior, clave);
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
  const palabra = limpiarPalabra(palabraIng);
  return [
    { nombre: "YouGlish", url: `https://youglish.com/pronounce/${encodeURIComponent(palabra)}/english/us` },
    {
      nombre: "Cambridge",
      url: `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(palabra.toLowerCase().replace(/\s+/g, "-"))}`,
    },
  ];
}
