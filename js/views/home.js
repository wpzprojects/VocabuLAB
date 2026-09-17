// Pantalla Home: punto de entrada de la app. Muestra una tarjeta por cada
// seccion existente (mismo listado que el topnav) para navegar directo a
// ella. Se llega aqui al abrir la app o al hacer clic en el nombre en la
// barra de titulo (topbar).

import { el } from "../util/format.js";
import { icon } from "../icons.js";
import { navLinks } from "../nav.js";

export async function render(container) {
  container.append(el("p", { class: "page-subtitle home-subtitle" }, "Elige una seccion para continuar."));

  const grid = el(
    "div",
    { class: "home-grid" },
    navLinks
      .filter((link) => link.key !== "ayuda")
      .map((link) =>
        el("a", { class: "card home-card", href: link.hash }, [
          el("span", { class: "home-card-icon", html: icon(link.icon) }),
          el("span", { class: "home-card-body" }, [
            el("span", { class: "home-card-title" }, link.title),
            el("span", { class: "home-card-desc" }, link.desc || ""),
          ]),
        ])
      )
  );

  container.append(grid);
}
