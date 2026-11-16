// Tema claro u oscuro. "auto" sigue al dispositivo; la elección se guarda solo en este navegador.
// index.html aplica la elección guardada antes de pintar, para que no parpadee.
const KEY = "votaciones-tema";
const media = matchMedia("(prefers-color-scheme: dark)");

export function getThemePref() {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "auto";
  } catch {
    return "auto";
  }
}

export function isDark() {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : media.matches;
}

export function setThemePref(pref) {
  try {
    if (pref === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch { /* sin almacenamiento: se aplica solo a esta visita */ }
  applyTheme(pref);
}

function applyTheme(pref = getThemePref()) {
  const root = document.documentElement;
  if (pref === "auto") delete root.dataset.theme;
  else root.dataset.theme = pref;
  const meta = document.querySelector('meta[name="theme-color"]');
  const bg = getComputedStyle(root).getPropertyValue("--bg").trim();
  if (meta && bg) meta.content = bg;
  const dark = isDark();
  document.querySelectorAll("emoji-picker").forEach(p => {
    p.classList.toggle("dark", dark);
    p.classList.toggle("light", !dark);
  });
}

export function initTheme() {
  applyTheme();
  media.addEventListener?.("change", () => applyTheme());
}
