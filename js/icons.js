// Iconos SVG minimalistas inline (trazo, sin dependencias externas) para
// que la PWA funcione 100% offline sin cargar fuentes de icono remotas.
const paths = {
  bolt: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z",
  book: "M5 4.5A2.5 2.5 0 0 1 7.5 2H19a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7.5A2.5 2.5 0 0 0 5 22V4.5Zm2 0V19a2.48 2.48 0 0 1 .5-.05H18V4H7.5a.5.5 0 0 0-.5.5Z",
  help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-6.2v-.3c0-1 .6-1.6 1.4-2.2.9-.7 1.5-1.3 1.5-2.4 0-1.5-1.2-2.4-2.8-2.4-1.4 0-2.5.7-2.9 2m2.8 7.7h.01",
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
  shuffle: "m18 4 3 3-3 3M3 17h4l10-13h4M18 20l3-3-3-3M3 7h4l3 4m6 2 3 4h4",
  save: "M5 4h11l4 4v12H5V4Zm3 0v5h8V4M8 14h8v6H8v-6Z",
  download: "M12 3v13m0 0-4-4m4 4 4-4M4 21h16",
  x: "m6 6 12 12M18 6 6 18",
};

export function icon(name, cls = "") {
  const d = paths[name] || paths.help;
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}
