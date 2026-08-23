// Wrapper de traduccion. El original usaba el conector "Microsoft Translator"
// de Power Apps (requiere autenticacion en la nube); aqui se usa la API
// publica y gratuita de MyMemory (sin API key, CORS habilitado) desde el
// navegador. A diferencia del original, no hay deteccion automatica de
// idioma gratuita, asi que la pantalla Traducir pide explicitamente el
// sentido de la traduccion (en->es / es->en) en vez de auto-detectarlo.

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
