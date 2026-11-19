# PollCard

Tarjeta de una votación en «Mis votaciones»: icono del tipo, título, datos, etiquetas de estado y menú ⋯.

- Uso: `<div class="poll-card">` con `pc-row` → `pc-link` (icono `pc-icon`, `pc-main` con `pc-title` y `pc-meta`, `pc-badges`) y el botón `pc-more`.
- `pc-meta`: tipo, tamaño y autor separados por « · » («Días · 10 días · creada por ti»).
- El menú ⋯ despliega debajo: mover a un grupo, «Compartir», «📦 Archivar» (o «Desarchivar» en la zona de archivadas) y «🗑️ Eliminar de mi lista».
- En el móvil, la tarjeta se desliza: → archiva (o desarchiva) y ← elimina de la lista. Las dos acciones muestran la barra de «Deshacer» con cuenta atrás.
- Votación borrada por su autor: `is-gone` y etiqueta «Eliminada».
