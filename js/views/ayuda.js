// Pantalla "Ayuda": explica pantalla por pantalla como usar la app. No existe
// en el original de Power Apps, es contenido estatico agregado en la
// migracion para orientar al usuario.

import { el } from "../util/format.js";

const APP_VERSION = "1.13.0";

const SECCIONES = [
  {
    titulo: "Palabras",
    items: [
      "Busca en ingles o espanol, filtra por Lista, u ordena con Z-A y el boton de aleatorio.",
      "Toca una fila para editarla o borrarla; + Nueva palabra abre el mismo formulario en blanco.",
      "En el formulario, Sugerir ejemplo llena Palabra en contexto con una frase de uso que puedes editar antes de guardar. Requiere internet; con tu clave de Gemini (ver Configuracion) los ejemplos respetan el significado en espanol.",
      "La columna Aprendida es solo informativa: se marca en Practicar.",
    ],
  },
  {
    titulo: "Traducir",
    items: [
      "Toca el boton de sentido para alternar Ingles → Espanol / Espanol → Ingles, escribe el texto y presiona Traducir (servicio MyMemory) o Traducir con IA (Gemini, con tu clave): la IA da varias acepciones y tocas la que quieres guardar. Requiere internet.",
      "Con el resultado puedes guardarlo como palabra nueva, eligiendo su Lista.",
    ],
  },
  {
    titulo: "Practicar",
    items: [
      "Tarjetas con tu vocabulario: filtra por Lista y Aprendidas, y activa Orden aleatorio si quieres.",
      "Intercambiar idioma cambia cual idioma se muestra primero. Ver revela la traduccion (y el contexto, si lo hay); Editar abre la palabra.",
      "El interruptor Aprendida de cada tarjeta marca la palabra al instante.",
    ],
  },
  {
    titulo: "Examen",
    items: [
      "Cuestionario con tu vocabulario: filtra por Lista y Aprendidas, y define cuantas preguntas con # de palabras (0 = todas). Orden aleatorio e Intercambiar idioma funcionan como en Practicar.",
      "Escribe tu respuesta y presiona Evaluar (o Enter); el resultado se acumula arriba. Reset test genera el cuestionario de nuevo.",
    ],
  },
  {
    titulo: "Frases",
    items: [
      "Igual que Palabras, pero organizadas por Categoria; la busqueda tambien revisa las notas de uso.",
      "Toca una fila para editarla o borrarla; Aprendida se marca directo en la tabla.",
    ],
  },
];

export function render(container) {
  const wrap = el("div", { class: "view-ayuda" });
  container.append(wrap);

  wrap.append(
    el("h1", { class: "page-title" }, "Ayuda"),
    el("p", { class: "page-subtitle" }, "Como funciona cada pantalla de la app.")
  );

  SECCIONES.forEach((seccion) => {
    wrap.append(
      el("div", { class: "card" }, [
        el("h2", { class: "section-title", style: "margin-top:0" }, seccion.titulo),
        el(
          "ul",
          { class: "help-list" },
          seccion.items.map((texto) => el("li", {}, texto))
        ),
      ])
    );
  });

  wrap.append(
    el("p", { class: "text-sm text-muted" }, [
      'Todo lo que agregues, edites, borres o marques como palabra o frase "aprendida" se guarda solo en este navegador/dispositivo (localStorage); usa ',
      el("strong", {}, "Exportar CSV"),
      " o ",
      el("strong", {}, "Guardar en Drive"),
      " de vez en cuando como respaldo; ambos estan en ",
      el("a", { href: "#/config" }, "Configuracion"),
      ".",
    ])
  );

  wrap.append(buildDeveloperCard());
}

function buildDeveloperCard() {
  const statusMsg = el("p", { class: "text-sm dev-update-status", hidden: true }, "");
  return el("div", { class: "card dev-card" }, [
    el("div", { class: "dev-header" }, [
      el("span", { class: "dev-avatar" }, "WP"),
      el("div", {}, [
        el("p", { class: "dev-name" }, "Wilsson Uriel Perez Valero"),
        el("p", { class: "dev-role" }, "Desarrollador de VocabuLAB"),
      ]),
    ]),
    el("div", { class: "dev-contact" }, [
      el("a", { href: "mailto:wperez.net@hotmail.com" }, "wperez.net@hotmail.com"),
      el("a", { href: "tel:+573104762477" }, "+57 310 476 2477"),
    ]),
    el("div", { class: "dev-footer" }, [
      el("span", {}, `Colombia · 2026 · v${APP_VERSION}`),
      buildUpdateButton(statusMsg),
    ]),
    statusMsg,
  ]);
}

// Busca un sw.js nuevo en el servidor. Si lo hay, se instala solo
// (skipWaiting + clients.claim) y app.js recarga la pagina al cambiar el
// controlador, asi que aqui solo se informa el resultado.
function buildUpdateButton(statusMsg) {
  const btn = el("button", { class: "btn btn-sm" }, "Buscar actualizacion");
  const setStatus = (text, color) => {
    statusMsg.style.color = color || "var(--text-muted)";
    statusMsg.textContent = text;
    statusMsg.hidden = false;
  };

  btn.addEventListener("click", async () => {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (!reg) {
      setStatus("Este navegador no permite buscar actualizaciones; recarga la pagina.", "var(--danger)");
      return;
    }
    btn.disabled = true;
    setStatus("Buscando actualizacion...");
    try {
      await reg.update();
      if (reg.installing || reg.waiting) {
        setStatus("Hay una version nueva: se esta descargando y la app se recargara sola.", "var(--success)");
      } else {
        setStatus("Ya tienes la ultima version.", "var(--success)");
        btn.disabled = false;
      }
    } catch (err) {
      setStatus("No se pudo buscar la actualizacion. Revisa tu conexion a internet.", "var(--danger)");
      btn.disabled = false;
    }
  });
  return btn;
}

