# PollCard

Tarjeta de una votación en «Mis votaciones»: icono del tipo, título, datos, etiquetas de estado y menú ⋯.

- Uso: `<div class="poll-card">` con `pc-row` → `pc-link` (icono `pc-icon`, `pc-main` con `pc-title` y `pc-meta`, `pc-badges`) y el botón `pc-more`.
- `poll-card__head`: el título y, a su lado, el bocadillo de mensajes sin leer (`poll-card__chat`, icono `chat` con un punto).
- `poll-card__meta`: solo cuántas casillas tiene y de quién es si no es tuya («10 días · de Ana»; si es tuya, «10 días»
  y la etiqueta «Tuya»). El tipo lo dice el icono (su nombre, en el tooltip).
- Cerrada: candado rojo (`poll-card__closed`) entre las etiquetas.
- «Duplicar», en el menú ⋯, lleva la estrella de premium dentro del botón.
- El menú ⋯ despliega debajo: mover a un grupo, «Compartir», «📦 Archivar» (o «Desarchivar» en la zona de archivadas) y «Salir de la votación» (o «Quitar de mi lista» si la votación ya no existe).
- En el móvil, la tarjeta se desliza: → archiva (o desarchiva), con la barra de «Deshacer» y cuenta atrás, y ← sale de la votación, que siempre pide confirmación (no se puede deshacer).
- Votación borrada por su autor: `poll-card--gone` y etiqueta «Eliminada».
- Sin pista de deslizar bajo la lista: el gesto se descubre solo.
