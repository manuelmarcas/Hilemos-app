// Avisos de validación con el estilo de la app, en vez de las burbujas del navegador («Completa este campo»).
// Escucha el evento `invalid` de todos los campos (los formularios siguen usando required, type="email"…),
// cancela la burbuja nativa y muestra la propia bajo el campo, que se marca en rojo hasta que se escribe en él.
// El texto sale de `data-error` si el campo lo trae; si no, uno genérico según el fallo.

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function messageFor(el: Field) {
  const v = el.validity;
  if (v.valueMissing) return el.dataset.error || (el.type === "email" ? "Escribe tu correo." : "Rellena este campo.");
  if (v.typeMismatch && el.type === "email") return "Ese correo no es válido. Tiene que ser como nombre@correo.com.";
  if (v.rangeUnderflow || v.rangeOverflow) {
    const i = el as HTMLInputElement;
    return `Pon un número entre ${i.min} y ${i.max}.`;
  }
  if (v.tooShort) return "Es demasiado corto.";
  if (v.tooLong) return "Es demasiado largo.";
  if (v.badInput) return "Escribe un valor válido.";
  return el.dataset.error || el.validationMessage;
}

let bubble: HTMLDivElement | null = null;
let bubbleFor: Field | null = null;
let shownThisTick = false;

function hideBubble() {
  bubble?.remove();
  bubble = null;
  bubbleFor = null;
}

// Al desplazar (p. ej. al abrirse el teclado del móvil) la burbuja sigue al campo.
let raf = 0;
function follow() {
  if (!bubble || raf) return;
  raf = requestAnimationFrame(() => { raf = 0; if (bubble && bubbleFor) place(bubbleFor, bubble); });
}

function place(el: Field, b: HTMLDivElement) {
  const r = el.getBoundingClientRect();
  const w = Math.min(320, window.innerWidth - 32);
  b.style.maxWidth = `${w}px`;
  b.style.top = `${r.bottom + 8}px`;
  b.style.left = `${Math.max(16, Math.min(r.left, window.innerWidth - 16 - b.offsetWidth))}px`;
}

function show(el: Field) {
  hideBubble();
  const b = document.createElement("div");
  b.className = "field-error";
  b.id = "field-error";
  b.setAttribute("role", "alert");
  b.innerHTML = '<span class="field-error__icon" aria-hidden="true">!</span>';
  b.append(messageFor(el));
  // Dentro de un diálogo modal tiene que ir en el diálogo: lo de fuera queda por debajo.
  (el.closest("dialog") || document.body).append(b);
  place(el, b);
  bubble = b;
  bubbleFor = el;
  el.classList.add("input--invalid");
  el.setAttribute("aria-invalid", "true");
  el.setAttribute("aria-describedby", b.id);
}

function clear(el: Field) {
  el.classList.remove("input--invalid");
  el.removeAttribute("aria-invalid");
  if (el.getAttribute("aria-describedby") === "field-error") el.removeAttribute("aria-describedby");
  hideBubble();
}

export function installFieldErrors() {
  document.addEventListener("invalid", e => {
    const el = e.target as Field;
    if (!(el instanceof HTMLElement)) return;
    e.preventDefault(); // sin burbuja del navegador
    el.classList.add("input--invalid");
    // Al enviar un formulario el navegador avisa de todos los campos mal: solo se enseña el primero.
    if (shownThisTick) return;
    shownThisTick = true;
    requestAnimationFrame(() => { shownThisTick = false; });
    el.focus();
    show(el);
  }, true);
  // Al escribir en el campo se quita el aviso; al salir de él, la burbuja (el borde rojo sigue hasta que se escribe).
  document.addEventListener("input", e => {
    const el = e.target as Field;
    if (el instanceof HTMLElement && el.classList.contains("input--invalid")) clear(el);
  }, true);
  document.addEventListener("focusout", hideBubble, true);
  window.addEventListener("resize", follow);
  window.addEventListener("scroll", follow, true);
  window.visualViewport?.addEventListener("resize", follow);
}
