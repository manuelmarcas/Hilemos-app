# Chip

Botón redondeado para filtrar o elegir entre varias opciones a la vez: grupos en «Mis votaciones», meses, horas y presets al crear una votación.

- Uso: `<button class="chip" aria-pressed="false">`; añade `on` y `aria-pressed="true"` cuando está elegido.
- `ghost` (borde discontinuo) para crear algo nuevo («＋ Grupo»); `static` para un dato que no se pulsa («10 días»).
- El número de elementos va en `<span class="n">` al final.
- Desactivado (meses ya pasados) con `disabled`: se apaga con `opacity-off`.
