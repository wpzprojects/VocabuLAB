// Pantalla "Ayuda": explica pantalla por pantalla como usar la app. No existe
// en el original de Power Apps, es contenido estatico agregado en la
// migracion para orientar al usuario.

import { el } from "../util/format.js";

const SECCIONES = [
  {
    titulo: "Palabras",
    items: [
      "Busca por ingles/espanol o filtra por Lista con el selector de arriba.",
      "Toca cualquier fila de la tabla para abrir esa palabra: ahi puedes Guardar los cambios o Borrarla.",
      "El boton + Nueva palabra abre el mismo formulario en blanco para agregar una palabra.",
      "Exportar CSV descarga una copia de respaldo del vocabulario (pide confirmacion antes de descargar).",
    ],
  },
  {
    titulo: "Traducir",
    items: [
      "Elige el sentido (Ingles → Espanol o Espanol → Ingles) y escribe el texto a traducir.",
      "Requiere conexion a internet: usa el servicio publico MyMemory, no funciona sin conexion.",
      "Con el resultado en pantalla puedes indicar una Lista y guardarlo directo como palabra nueva en tu vocabulario.",
    ],
  },
  {
    titulo: "Practicar",
    items: [
      "Muestra tu vocabulario en tarjetas; filtra por Lista, por Aprendida, o actívalas en orden Aleatorio.",
      "El interruptor de Idioma cambia cual de los dos idiomas se muestra primero en la tarjeta.",
      "El boton Ver revela la traduccion (y el contexto, si la palabra tiene uno); Editar abre el formulario de esa palabra.",
      "El interruptor Aprendida de cada tarjeta marca esa palabra como aprendida al instante.",
    ],
  },
  {
    titulo: "Frases",
    items: [
      "Mismo patron que Palabras, pero para frases de uso frecuente organizadas por Categoria en vez de Lista.",
      "Toca una fila para editarla o borrarla; el casillero de Aprendida se marca directo desde la tabla.",
      "Tiene su propio boton Exportar CSV, independiente del de Palabras.",
    ],
  },
  {
    titulo: "Examen",
    items: [
      "Genera un cuestionario con tu vocabulario: filtra por Lista, Aprendida, o limita el numero de palabras.",
      "Orden aleatoriza las preguntas; Direccion cambia si te pregunta la palabra en ingles o en espanol.",
      "Escribe tu respuesta y presiona Evaluar (o Enter) para revisar; el resultado se acumula arriba.",
      "Reset test vuelve a generar el cuestionario desde cero con los filtros actuales.",
    ],
  },
];

export async function render(container) {
  container.append(
    el("h1", { class: "page-title" }, "Ayuda"),
    el("p", { class: "page-subtitle" }, "Como funciona cada pantalla de la app.")
  );

  SECCIONES.forEach((seccion) => {
    container.append(
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

  container.append(
    el("p", { class: "text-sm text-muted" }, [
      "Todo lo que agregues, edites, borres o marques como aprendida se guarda solo en este navegador/dispositivo (localStorage) — usa ",
      el("strong", {}, "Exportar CSV"),
      " de vez en cuando como respaldo.",
    ])
  );
}
