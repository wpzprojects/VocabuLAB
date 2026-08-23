// Utilidades pequeñas de DOM/datos usadas por todas las vistas.

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function debounce(fn, delay = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

export function distinct(rows, key) {
  return [...new Set(rows.map((r) => r[key]).filter((v) => v !== null && v !== undefined && v !== ""))].sort(
    (a, b) => String(a).localeCompare(String(b), "es", { numeric: true })
  );
}

// Valor numerico mas alto de una columna (para prellenar "Lista" con la
// ultima lista existente al crear una palabra); ignora valores vacios o no
// numericos.
export function maxNumeric(rows, key) {
  const nums = rows
    .map((r) => r[key])
    .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(Number)
    .filter((n) => Number.isFinite(n));
  return nums.length ? String(Math.max(...nums)) : "";
}

const TILDES = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u" };
const LEADING_FILLERS = new Set(["a", "an", "the", "to", "el", "la", "los", "las", "un", "una", "unos", "unas"]);

// Normaliza una respuesta para comparar en el Examen: minusculas, sin
// puntuacion final ni espacios de mas, sin tildes (a-e-i-o-u, pero NO toca
// la ñ -- en espanol es una letra distinta, no una vocal acentuada), y sin
// un articulo/palabra de relleno al inicio (the/a/an, el/la/los/las/un...).
export function normalizeAnswer(value) {
  let s = String(value)
    .trim()
    .toLowerCase()
    .replace(/[áéíóúü]/g, (c) => TILDES[c])
    .replace(/[.,;:!?¿¡]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = s.split(" ");
  if (words.length > 1 && LEADING_FILLERS.has(words[0])) {
    s = words.slice(1).join(" ");
  }
  return s;
}

// Distancia de edicion (Levenshtein) entre dos strings, para tolerar
// pequenos errores de tipeo en el Examen.
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

// Cuantos errores de tipeo se toleran segun el largo de la palabra: 0 para
// palabras muy cortas (donde 1 error ya cambia el significado), 1 para
// palabras medianas, 2 para palabras largas.
function typoTolerance(len) {
  if (len <= 3) return 0;
  if (len <= 7) return 1;
  return 2;
}

// Separa un campo de traduccion del Examen en todas las respuestas validas:
// por comas ("De hecho, en realidad"), por barras ("emite/emitido"), y por
// aclaraciones entre parentesis -- tanto el texto de afuera como el de
// adentro cuentan por separado (ej. "Cumbre (evento)" acepta "cumbre" o
// "evento"; "Morder (verbo), poco (adjetivo)" acepta cualquiera de las 4).
function expandAlternatives(expectedRaw) {
  const out = new Set();
  for (const piece of String(expectedRaw).split(",")) {
    for (const sub of piece.split("/")) {
      const sinParentesis = sub.replace(/\([^)]*\)/g, "");
      const norm1 = normalizeAnswer(sinParentesis);
      if (norm1) out.add(norm1);
      for (const m of sub.match(/\(([^)]*)\)/g) || []) {
        const norm2 = normalizeAnswer(m.slice(1, -1));
        if (norm2) out.add(norm2);
      }
    }
  }
  return [...out];
}

// Compara la respuesta del usuario contra la(s) traduccion(es) correcta(s)
// del Examen. Acepta pequenos errores de tipeo via distancia de edicion.
export function isCorrectAnswer(userAnswer, expectedRaw) {
  const answer = normalizeAnswer(userAnswer);
  if (!answer) return false;
  return expandAlternatives(expectedRaw).some(
    (alt) => answer === alt || levenshtein(answer, alt) <= typoTolerance(alt.length)
  );
}

// Id corto y suficientemente unico para filas nuevas creadas en el navegador
// (reemplaza el __PowerAppsId__ que generaba Power Apps).
export function uid() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" }[c]));
}

// Genera un CSV (con BOM UTF-8 para que Excel detecte tildes/ñ correctamente)
// a partir de columnas [{key, label}] y dispara la descarga en el navegador.
export function downloadCsv(filename, columns, rows) {
  const escapeCell = (value) => {
    const s = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    columns.map((c) => escapeCell(c.label)).join(","),
    ...rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(",")),
  ];
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  downloadBlob(filename, blob);
}

// Parser de CSV (inverso de downloadCsv): entiende comillas, comas y saltos
// de linea dentro de un campo, y quita el BOM UTF-8 que downloadCsv agrega.
// Devuelve un array de objetos usando la primera fila como encabezados.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows
    .slice(1)
    .filter((r) => r.some((v) => v !== ""))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
