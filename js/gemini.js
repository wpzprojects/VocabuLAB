// Llamado a la API de Gemini desde el navegador (permite CORS), con la
// clave que el usuario guarda en este dispositivo (ver store.js). Lo usan
// "Sugerir ejemplo" (ejemplos.js) y "Traducir con IA" (translate.js).

// Modelo ligero con capa gratuita. Si Google lo retira, basta cambiarlo
// aqui (ver https://ai.google.dev/gemini-api/docs/models).
const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Devuelve el texto de la respuesta. Con `json: true` se pide la respuesta
// como JSON (el llamador la parsea). Los errores traen un mensaje legible.
export async function generarConGemini(prompt, clave, { temperature = 1, maxOutputTokens = 256, json = false } = {}) {
  const generationConfig = { temperature, maxOutputTokens };
  if (json) generationConfig.responseMimeType = "application/json";
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": clave },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig }),
  });
  if (!res.ok) {
    if (res.status === 400 || res.status === 401 || res.status === 403) throw new Error("la clave de Gemini no es valida");
    if (res.status === 429) throw new Error("se alcanzo el limite de uso de Gemini");
    throw new Error(`Gemini respondio con error ${res.status}`);
  }
  const data = await res.json();
  return (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("")
    .trim();
}
