// Wrapper de traduccion. El original usaba el conector "Microsoft Translator"
// de Power Apps (requiere autenticacion en la nube); aqui se usa la API
// publica y gratuita de MyMemory (sin API key, CORS habilitado) desde el
// navegador. A diferencia del original, no hay deteccion automatica de
// idioma gratuita, asi que la pantalla Traducir pide explicitamente el
// sentido de la traduccion (en->es / es->en) en vez de auto-detectarlo.

import { generarConGemini } from "./gemini.js";

export async function translate(text, from, to) {
  const q = text.trim();
  if (!q) return "";
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${from}|${to}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo contactar el servicio de traduccion");
  const data = await res.json();
  const translated = data?.responseData?.translatedText;
  if (!translated) throw new Error("El servicio de traduccion no devolvio resultado");
  return translated;
}

// "Traducir con IA": Gemini devuelve la traduccion principal y, si el texto
// tiene varios significados, hasta 3 alternativas con una nota corta en
// espanol para elegir cual guardar. Devuelve [{ texto, nota }], la primera
// es la principal.
const IDIOMAS = { en: "English", es: "Spanish" };

export async function translateConGemini(text, from, to, clave) {
  const q = text.trim();
  if (!q) return [];
  const prompt = [
    `Translate this ${IDIOMAS[from]} text into ${IDIOMAS[to]} for a Spanish-speaking learner of English: "${q}".`,
    " Give the most common translation first. If the text has other common meanings or usages, add up to 3 alternative translations;",
    " for a full sentence, add at most 1 alternative phrasing, or none.",
    ' Reply only with JSON: {"opciones":[{"texto":"...","nota":"..."}]},',
    ' where "nota" is a very short Spanish note (max 6 words) on when that option is used, or "" for the first one if obvious.',
  ].join("");
  const respuesta = await generarConGemini(prompt, clave, { temperature: 0.3, maxOutputTokens: 512, json: true });
  let data;
  try {
    data = JSON.parse(respuesta.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    throw new Error("Gemini devolvio una respuesta inesperada");
  }
  const vistas = new Set();
  const opciones = (data?.opciones || [])
    .map((o) => ({ texto: String(o?.texto || "").trim(), nota: String(o?.nota || "").trim() }))
    .filter((o) => o.texto && !vistas.has(o.texto.toLowerCase()) && vistas.add(o.texto.toLowerCase()))
    .slice(0, 4);
  if (opciones.length === 0) throw new Error("Gemini no devolvio traduccion");
  return opciones;
}
