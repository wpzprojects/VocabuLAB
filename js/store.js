// Capa de persistencia. La app original de Power Apps escribe directo al
// Excel via conectores (Patch/Remove/SubmitForm); una PWA estatica no puede
// hacer eso, asi que aqui:
//   1. data/*.json (generado por tools/extract_data.py desde el Excel) es el
//      SEED de solo lectura -- nunca se modifica en tiempo de ejecucion.
//   2. Al primer uso, el seed se copia a localStorage. Todo cambio del
//      usuario (agregar/editar/borrar/marcar aprendida) vive solo ahi.
//   3. exportCsv() permite sacar el estado actual a CSV para reincorporarlo
//      a mano al Excel original si se quiere.

import { uid, downloadCsv, parseCsv } from "./util/format.js";

const KEY_VOCAB = "vocabulab:v1:vocabulario";
const KEY_FRASES = "vocabulab:v1:frases";

let vocabCache = null;
let frasesCache = null;

async function loadSeed(name) {
  const res = await fetch(`data/${name}.json`);
  if (!res.ok) throw new Error(`No se pudo cargar data/${name}.json`);
  return res.json();
}

function persist(key, rows) {
  localStorage.setItem(key, JSON.stringify(rows));
}

async function ensure(cacheRef, key, seedName) {
  if (cacheRef.value) return cacheRef.value;
  const raw = localStorage.getItem(key);
  if (raw) {
    cacheRef.value = JSON.parse(raw);
  } else {
    cacheRef.value = await loadSeed(seedName);
    persist(key, cacheRef.value);
  }
  return cacheRef.value;
}

const vocabRef = { get value() { return vocabCache; }, set value(v) { vocabCache = v; } };
const frasesRef = { get value() { return frasesCache; }, set value(v) { frasesCache = v; } };

// ---------------- Vocabulario ----------------

export async function getVocabulario() {
  return ensure(vocabRef, KEY_VOCAB, "vocabulario");
}

export async function addPalabra({ lista, palabra_ing, palabra_esp, contexto = "" }) {
  const rows = await getVocabulario();
  const row = { id: uid(), lista: lista || "", palabra_ing, palabra_esp, contexto, aprendida: false };
  rows.push(row);
  persist(KEY_VOCAB, rows);
  return row;
}

export async function updatePalabra(id, patch) {
  const rows = await getVocabulario();
  const row = rows.find((r) => r.id === id);
  if (!row) throw new Error(`Palabra ${id} no encontrada`);
  Object.assign(row, patch);
  persist(KEY_VOCAB, rows);
  return row;
}

export async function deletePalabra(id) {
  let rows = await getVocabulario();
  rows = rows.filter((r) => r.id !== id);
  vocabCache = rows;
  persist(KEY_VOCAB, rows);
}

export async function setAprendida(id, aprendida) {
  return updatePalabra(id, { aprendida });
}

export async function deletePalabrasByLista(lista) {
  let rows = await getVocabulario();
  const before = rows.length;
  rows = rows.filter((r) => String(r.lista) !== String(lista));
  vocabCache = rows;
  persist(KEY_VOCAB, rows);
  return before - rows.length;
}

// ---------------- Frases comunes ----------------

export async function getFrases() {
  return ensure(frasesRef, KEY_FRASES, "frases");
}

export async function addFrase({ categoria, frase_ing, frase_esp, notas_uso = "" }) {
  const rows = await getFrases();
  const row = { id: uid(), categoria: categoria || "", frase_ing, frase_esp, notas_uso, aprendida: false };
  rows.push(row);
  persist(KEY_FRASES, rows);
  return row;
}

export async function updateFrase(id, patch) {
  const rows = await getFrases();
  const row = rows.find((r) => r.id === id);
  if (!row) throw new Error(`Frase ${id} no encontrada`);
  Object.assign(row, patch);
  persist(KEY_FRASES, rows);
  return row;
}

export async function deleteFrase(id) {
  let rows = await getFrases();
  rows = rows.filter((r) => r.id !== id);
  frasesCache = rows;
  persist(KEY_FRASES, rows);
}

export async function setFraseAprendida(id, aprendida) {
  return updateFrase(id, { aprendida });
}

export async function deleteFrasesByCategoria(categoria) {
  let rows = await getFrases();
  const before = rows.length;
  rows = rows.filter((r) => r.categoria !== categoria);
  frasesCache = rows;
  persist(KEY_FRASES, rows);
  return before - rows.length;
}

// ---------------- Backup / exportacion ----------------

export async function exportVocabularioCsv() {
  const vocab = await getVocabulario();
  const stamp = new Date().toISOString().slice(0, 10);

  downloadCsv(
    `vocabulario_${stamp}.csv`,
    [
      { key: "lista", label: "Lista" },
      { key: "palabra_ing", label: "Palabra_Ing" },
      { key: "palabra_esp", label: "Palabra_Esp" },
      { key: "aprendida_txt", label: "Aprendida" },
      { key: "contexto", label: "Palabra_en_contexto" },
    ],
    vocab.map((r) => ({ ...r, aprendida_txt: r.aprendida ? "Si" : "No" }))
  );
}

export async function exportFrasesCsv() {
  const frases = await getFrases();
  const stamp = new Date().toISOString().slice(0, 10);

  downloadCsv(
    `frases_${stamp}.csv`,
    [
      { key: "categoria", label: "Categoria" },
      { key: "frase_ing", label: "Frase_Ing" },
      { key: "frase_esp", label: "Frase_Esp" },
      { key: "notas_uso", label: "Notas_de_uso" },
      { key: "aprendida_txt", label: "Aprendida" },
    ],
    frases.map((r) => ({ ...r, aprendida_txt: r.aprendida ? "Si" : "No" }))
  );
}

// ---------------- Restaurar desde CSV (reemplaza todo el dataset) ----------------

export async function importVocabularioCsv(text) {
  const records = parseCsv(text);
  if (records.length && !("Palabra_Ing" in records[0] && "Palabra_Esp" in records[0])) {
    throw new Error("El archivo no tiene las columnas de Vocabulario (Palabra_Ing, Palabra_Esp...). Es el CSV correcto?");
  }
  const rows = records
    .map((rec) => ({
      id: uid(),
      lista: (rec.Lista || "").trim(),
      palabra_ing: (rec.Palabra_Ing || "").trim(),
      palabra_esp: (rec.Palabra_Esp || "").trim(),
      contexto: (rec.Palabra_en_contexto || "").trim(),
      aprendida: (rec.Aprendida || "").trim().toLowerCase() === "si",
    }))
    .filter((r) => r.palabra_ing && r.palabra_esp);
  vocabCache = rows;
  persist(KEY_VOCAB, rows);
  return rows.length;
}

export async function importFrasesCsv(text) {
  const records = parseCsv(text);
  if (records.length && !("Frase_Ing" in records[0] && "Frase_Esp" in records[0])) {
    throw new Error("El archivo no tiene las columnas de Frases (Frase_Ing, Frase_Esp...). Es el CSV correcto?");
  }
  const rows = records
    .map((rec) => ({
      id: uid(),
      categoria: (rec.Categoria || "").trim(),
      frase_ing: (rec.Frase_Ing || "").trim(),
      frase_esp: (rec.Frase_Esp || "").trim(),
      notas_uso: (rec.Notas_de_uso || "").trim(),
      aprendida: (rec.Aprendida || "").trim().toLowerCase() === "si",
    }))
    .filter((r) => r.frase_ing && r.frase_esp);
  frasesCache = rows;
  persist(KEY_FRASES, rows);
  return rows.length;
}

// Punto de extension para Fase 2 (backup a Google Drive vía Google Identity
// Services + Drive API v3, requiere que el usuario cree un cliente OAuth).
export async function backupToDrive() {
  throw new Error("Backup a Google Drive aun no esta implementado.");
}
