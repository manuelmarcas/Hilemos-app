# PollCard

Tarjeta de una votación en «Mis votaciones»: icono del tipo, título, datos, etiquetas de estado y menú ⋯.

- Uso: `<div class="poll-card">` con `pc-row` → `pc-link` (icono `pc-icon`, `pc-main` con `pc-title` y `pc-meta`, `pc-badges`) y el botón `pc-more`.
- `pc-meta`: tipo, tamaño y autor separados por « · » («Días · 10 días · creada por ti»).
- El menú ⋯ despliega debajo: mover a un grupo, «Compartir», «📦 Archivar» (o «Desarchivar» en la zona de archivadas) y «Salir de la votación» (o «Quitar de mi lista» si la votación ya no existe).
- En el móvil, la tarjeta se desliza: → archiva (o desarchiva), con la barra de «Deshacer» y cuenta atrás, y ← sale de la votación, que siempre pide confirmación (no se puede deshacer).
- Votación borrada por su autor: `is-gone` y etiqueta «Eliminada».
