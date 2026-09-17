// Config de navegacion: equivalente al menu superior de 5 botones del
// original en Power Apps (Cont_Menus_*: Palabras / Traducir / Practicar /
// Frases / Examen, presente en las 5 pantallas).

export const navLinks = [
  { key: "palabras", title: "Palabras", icon: "eye", hash: "#/palabras", desc: "Consulta y edita tu vocabulario" },
  { key: "traducir", title: "Traducir", icon: "sync", hash: "#/traducir", desc: "Traduce palabras al vuelo" },
  { key: "practicar", title: "Practicar", icon: "clock", hash: "#/practicar", desc: "Repasa con tarjetas" },
  { key: "examen", title: "Examen", icon: "check", hash: "#/examen", desc: "Evalua lo que sabes" },
  { key: "frases", title: "Frases", icon: "chat", hash: "#/frases", desc: "Practica frases completas" },
  { key: "ayuda", title: "Ayuda", icon: "help", hash: "#/ayuda", desc: "Guia de uso y contacto" },
];
