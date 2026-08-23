import { icon } from "./icons.js";
import { navLinks } from "./nav.js";
import { initRouter } from "./router.js";

const topnav = document.getElementById("topnav");
const mount = document.getElementById("app");

document.getElementById("brand-mark").innerHTML = icon("book");

topnav.innerHTML = navLinks
  .map(
    (link) => `
    <a class="topnav-link" data-key="${link.key}" href="${link.hash}">
      ${icon(link.icon)}
      <span>${link.title}</span>
    </a>`
  )
  .join("");

function setActiveLink(path) {
  const section = path.split("/").filter(Boolean)[0] || "ver";
  topnav.querySelectorAll(".topnav-link").forEach((a) => {
    a.classList.toggle("active", a.dataset.key === section);
  });
}

initRouter({
  mount,
  onNavigate: (path) => setActiveLink(path),
});

// --- Service worker (offline / instalable) ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.warn("SW no registrado:", err));
  });
}
