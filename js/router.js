// Router SPA minimalista basado en hash. Un modulo por pantalla, cada uno
// exporta render(container, params).

function segmentsOf(path) {
  return path.split("/").filter(Boolean);
}

function compile(pattern) {
  const names = [];
  const regexParts = segmentsOf(pattern).map((seg) => {
    if (seg.startsWith(":")) {
      names.push(seg.slice(1));
      return "([^/]+)";
    }
    return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  return { regex: new RegExp(`^/${regexParts.join("/")}$`), names };
}

const routeTable = [
  ["/", () => import("./views/ver.js")],
  ["/traducir", () => import("./views/traducir.js")],
  ["/practicar", () => import("./views/practicar.js")],
  ["/frases", () => import("./views/frases.js")],
  ["/examen", () => import("./views/examen.js")],
].map(([pattern, load]) => ({ ...compile(pattern), pattern, load }));

function currentPath() {
  const hash = location.hash || "#/";
  return `/${segmentsOf(hash.slice(1)).join("/")}`;
}

function match(path) {
  for (const route of routeTable) {
    const m = path.match(route.regex);
    if (m) {
      const params = {};
      route.names.forEach((name, i) => (params[name] = decodeURIComponent(m[i + 1])));
      return { route, params };
    }
  }
  return null;
}

export function initRouter({ mount, onNavigate }) {
  let token = 0;

  async function renderCurrent() {
    const path = currentPath();
    const found = match(path);
    const myToken = ++token;

    if (!found) {
      mount.innerHTML = "";
      mount.append(
        Object.assign(document.createElement("div"), {
          className: "empty-state",
          innerHTML: `<h2>Pantalla no encontrada</h2><p class="text-muted">La ruta <code>${path}</code> no existe.</p><p><a class="btn btn-primary" href="#/">Ir a Palabras</a></p>`,
        })
      );
      onNavigate?.(path, {});
      return;
    }

    try {
      const mod = await found.route.load();
      if (myToken !== token) return; // navegacion mas reciente ya en curso
      mount.innerHTML = "";
      mount.scrollTop = 0;
      await mod.render(mount, found.params);
      mount.focus({ preventScroll: true });
    } catch (err) {
      console.error("Error cargando la vista:", err);
      mount.innerHTML = `<div class="empty-state"><h2>Ocurrio un error cargando esta pantalla</h2><p class="text-muted mono">${String(err.message || err)}</p></div>`;
    }
    onNavigate?.(path, found.params);
  }

  window.addEventListener("hashchange", renderCurrent);
  renderCurrent();

  return { refresh: renderCurrent, currentPath };
}
