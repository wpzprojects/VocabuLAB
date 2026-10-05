import { icon } from "./icons.js";
import { navLinks } from "./nav.js";
import { initRouter } from "./router.js";

const topnav = document.getElementById("topnav");
const topbarActions = document.getElementById("topbar-actions");
const mount = document.getElementById("app");

document.getElementById("brand-mark").innerHTML = '<img src="icons/icon.svg" alt="" width="28" height="28">';

topnav.innerHTML = navLinks
  .filter((link) => !link.utility)
  .map(
    (link) => `
    <a class="topnav-link" data-key="${link.key}" href="${link.hash}">
      ${icon(link.icon)}
      <span>${link.title}</span>
    </a>`
  )
  .join("");

topbarActions.innerHTML = navLinks
  .filter((link) => link.utility)
  .map(
    (link) => `
  <a class="icon-btn" data-key="${link.key}" href="${link.hash}" aria-label="${link.title}" title="${link.title}">
    ${icon(link.icon)}
  </a>`
  )
  .join("");

function setActiveLink(path) {
  const section = path.split("/").filter(Boolean)[0] || "";
  document.querySelectorAll("[data-key]").forEach((a) => {
    a.classList.toggle("active", a.dataset.key === section);
  });
  topnav.hidden = section === "";
}

initRouter({
  mount,
  onNavigate: (path) => setActiveLink(path),
});

// --- Service worker (offline / instalable) ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then((reg) => {
        // La app instalada en el celular casi nunca navega de nuevo (se
        // reanuda desde segundo plano), y el navegador solo busca un sw.js
        // nuevo al navegar. Por eso se busca a mano cada vez que vuelve al
        // frente; si no, se queda en una version vieja indefinidamente.
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") reg.update().catch(() => {});
        });
      })
      .catch((err) => console.warn("SW no registrado:", err));
  });

  // Cuando un service worker nuevo toma el control, la pagina abierta sigue
  // con el JS/CSS viejo ya cargado: se recarga para usar la version nueva.
  // Si hay un formulario abierto, espera a que la app pase a segundo plano
  // para no perder lo que se esta escribiendo. (Sin controlador previo es
  // la primera instalacion y no hace falta recargar.)
  if (navigator.serviceWorker.controller) {
    let recargando = false;
    const recargar = () => {
      if (recargando) return;
      recargando = true;
      location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!document.querySelector(".modal-backdrop:not([hidden])")) recargar();
      else document.addEventListener("visibilitychange", () => document.hidden && recargar());
    });
  }
}
