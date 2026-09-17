// Backup/restauracion manual contra Google Drive (Fase 2, ver README).
// Usa Google Identity Services (OAuth por token, sin backend) + Drive API
// v3 con el scope drive.file: la app solo puede ver/tocar los archivos que
// ella misma crea, nunca el resto del Drive del usuario. Todo se guarda
// dentro de una carpeta "VocabuLAB" visible en el Drive normal (no en la
// carpeta oculta appDataFolder) para que el usuario pueda entrar a
// verlo/descargarlo el mismo si pierde el dispositivo: el JSON (fuente de
// verdad, usado para Restaurar) y, como copia legible/portable, los mismos
// CSV que generan los botones "Exportar CSV" de Palabras y Frases.

import { getVocabulario, getFrases, replaceVocabulario, replaceFrases, buildVocabularioCsv, buildFrasesCsv } from "./store.js";

const CLIENT_ID = "369651784678-cj4a864f64144vcotm7avfe6jqnk4l0s.apps.googleusercontent.com";
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const GIS_SRC = "https://accounts.google.com/gsi/client";

const FOLDER_NAME = "VocabuLAB";
const BACKUP_FILENAME = "VocabuLAB_backup.json";
const VOCAB_CSV_FILENAME = "vocabulario.csv";
const FRASES_CSV_FILENAME = "frases.csv";

let gisReady = null;
let tokenClient = null;
let accessToken = null;
let tokenExpiresAt = 0;

function loadGis() {
  if (gisReady) return gisReady;
  gisReady = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Google Identity Services. Revisa tu conexion a internet."));
    document.head.append(script);
  });
  return gisReady;
}

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;

  await loadGis();
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: () => {},
      });
    }
    tokenClient.callback = (resp) => {
      if (resp.error) {
        reject(new Error(`Google Drive rechazo el acceso (${resp.error}).`));
        return;
      }
      accessToken = resp.access_token;
      tokenExpiresAt = Date.now() + (Number(resp.expires_in) || 3600) * 1000 - 60000;
      resolve(accessToken);
    };
    tokenClient.requestAccessToken({ prompt: "" });
  });
}

async function driveFetch(url, options = {}) {
  const token = await getAccessToken();
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Drive respondio con error ${res.status}: ${body.slice(0, 200)}`);
  }
  return res;
}

async function driveFindOne(query) {
  const q = encodeURIComponent(query);
  const res = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`);
  const data = await res.json();
  return data.files?.[0] || null;
}

// Busca la carpeta "VocabuLAB" sin crearla (usado al restaurar: si no
// existe, no hay nada que restaurar).
async function findFolder() {
  const folder = await driveFindOne(
    `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  return folder?.id || null;
}

// Igual, pero la crea si hace falta (usado al guardar).
async function findOrCreateFolder() {
  const existing = await findFolder();
  if (existing) return existing;
  const res = await driveFetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  const created = await res.json();
  return created.id;
}

async function findFileInFolder(folderId, filename) {
  return driveFindOne(`name = '${filename}' and '${folderId}' in parents and trashed = false`);
}

// Crea el archivo si no existe dentro de la carpeta, o sobreescribe su
// contenido si ya existe (Drive conserva el historial de versiones
// anteriores de ese mismo archivo automaticamente).
async function upsertFile(folderId, filename, mimeType, content) {
  const existing = await findFileInFolder(folderId, filename);
  if (existing) {
    await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`, {
      method: "PATCH",
      headers: { "Content-Type": mimeType },
      body: content,
    });
    return;
  }

  const boundary = "vocabulab-" + Math.random().toString(36).slice(2);
  const metadata = JSON.stringify({ name: filename, mimeType, parents: [folderId] });
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
    `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n${content}\r\n--${boundary}--`;
  await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
}

export async function saveBackupToDrive() {
  const [vocabulario, frases, vocabularioCsv, frasesCsv] = await Promise.all([
    getVocabulario(),
    getFrases(),
    buildVocabularioCsv(),
    buildFrasesCsv(),
  ]);
  const jsonPayload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), vocabulario, frases });

  const folderId = await findOrCreateFolder();
  await upsertFile(folderId, BACKUP_FILENAME, "application/json", jsonPayload);
  await upsertFile(folderId, VOCAB_CSV_FILENAME, "text/csv;charset=utf-8", vocabularioCsv);
  await upsertFile(folderId, FRASES_CSV_FILENAME, "text/csv;charset=utf-8", frasesCsv);

  return { folder: FOLDER_NAME };
}

export async function restoreBackupFromDrive() {
  const folderId = await findFolder();
  const file = folderId ? await findFileInFolder(folderId, BACKUP_FILENAME) : null;
  if (!file) {
    throw new Error(`No se encontro un respaldo en la carpeta "${FOLDER_NAME}" de tu Drive. Primero usa "Guardar en Drive" desde algun dispositivo.`);
  }
  const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
  const data = await res.json();
  if (!Array.isArray(data.vocabulario) || !Array.isArray(data.frases)) {
    throw new Error("El respaldo encontrado en Drive no tiene el formato esperado.");
  }
  await replaceVocabulario(data.vocabulario);
  await replaceFrases(data.frases);
  return { vocabularioCount: data.vocabulario.length, frasesCount: data.frases.length };
}
