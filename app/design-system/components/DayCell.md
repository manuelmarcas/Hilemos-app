# DayCell

Casilla de un día del calendario, partida en una franja por opción (hasta 4), con el icono de la opción y su número de votos.

- Uso: `<div class="cell n2">` con `<div class="day">` y un `<button class="opt c0">` por opción (`c0`…`c3` por orden). `n3` y `n4` dan más alto a la casilla.
- Mi voto: `on` y `aria-pressed="true"`; la franja se rellena con el color de la opción y el contador pasa a `card`.
- La más votada de cada opción lleva `best`: anillo doble `best` + `card`, visible sobre cualquier relleno.
- Días que no se votan: `off` en la casilla y botones `disabled`, sin contador. Huecos antes del día 1: `cell empty`.
- La leyenda (`legend`) va siempre encima del calendario y dice qué significa cada icono y el anillo.
- Semanas (`wrow`), meses (`mtile`) y horas (`hcell`) siguen la misma lógica con una sola opción en `c0`.
