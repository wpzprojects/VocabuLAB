// Iconos SVG minimalistas inline (trazo, sin dependencias externas) para
// que la PWA funcione 100% offline sin cargar fuentes de icono remotas.
const paths = {
  bolt: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z",
  book: "M5 4.5A2.5 2.5 0 0 1 7.5 2H19a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7.5A2.5 2.5 0 0 0 5 22V4.5Zm2 0V19a2.48 2.48 0 0 1 .5-.05H18V4H7.5a.5.5 0 0 0-.5.5Z",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4 0a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z",
  help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-7.5v-.3c0-1 .6-1.6 1.4-2.2.9-.7 1.5-1.3 1.5-2.4 0-1.5-1.2-2.4-2.8-2.4-1.4 0-2.5.7-2.9 2m2.8 7.7h.01",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.9-4.9",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M18 6 6 18",
  eye: "M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Zm11 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  sync: "M4 4v5h5M20 20v-5h-5M4.6 15a8 8 0 0 0 14.7 2.3M19.4 9A8 8 0 0 0 4.7 6.7",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-16v6l4 2",
  chat: "M4 4h16v12H8l-4 4V4Z",
  check: "m4 12 6 6L20 6",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z",
  trash: "M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13",
  plus: "M12 5v14M5 12h14",
  sort: "M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0 3 3m-3-3-3 3",
  shuffle:
    "M18 4l3 3l-3 3 M18 20l3 -3l-3 -3 M3 7h3a5 5 0 0 1 5 5a5 5 0 0 0 5 5h5 M21 7h-5a4.978 4.978 0 0 0 -3 1m-4 8a4.984 4.984 0 0 1 -3 1h-3",
  save: "M5 4h11l4 4v12H5V4Zm3 0v5h8V4M8 14h8v6H8v-6Z",
  download: "M12 3v13m0 0-4-4m4 4 4-4M4 21h16",
  x: "m6 6 12 12M18 6 6 18",
  sparkle: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Zm7 12 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z",
  speaker: "M11 5 6 9H2v6h4l5 4V5Zm4.5 3.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14",
};

export function icon(name, cls = "") {
  const d = paths[name] || paths.help;
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}
