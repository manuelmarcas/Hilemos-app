# DayCell

Casilla de un día del calendario, partida en una franja por opción (hasta 4), con el icono de la opción y su número de votos.

- Uso: `<div class="cell n2">` con `<div class="day">` y un `<button class="opt c0">` por opción (`c0`…`c3` por orden). `n3` y `n4` dan más alto a la casilla. El icono y el contador se ajustan al número de opciones: con `n1` la opción es la casilla entera y van grandes, uno encima del otro (icono a 1.5rem, 1.9rem en pantallas anchas y 2rem en la vista previa); con `n2`, algo mayores; con `n3` y `n4`, en su tamaño base.
- Mi voto: `on` y `aria-pressed="true"`; la franja se rellena con el color de la opción y el contador pasa a `card`.
- La más votada de cada opción lleva `best`: anillo doble `best` + `card`, visible sobre cualquier relleno.
- Días que no se votan: `cell--off`, solo con su número (sin las opciones) y sin altura mínima: la fila solo crece si
  tiene días votables. Huecos antes del día 1: `cell--empty`, también sin altura.
- Los días de la semana sin ningún día votable ese mes van a media anchura (`--calendar-cols`, calculado con
  `weekdaysWith`), para dar sitio a los demás.
- Con menos de 6 días votables no hay calendario: lista `day-list` (una fila por día con `day-list__date` y un
  `day-list__opt` por opción, con los mismos colores `c0`…`c3`, `--on` y `--best`). Con una o dos opciones, el botón
  lleva también su nombre.
- Al cambiar el recuento, el número da un salto (`count--bump`); al cargar, no.
- La leyenda (`legend`) va siempre encima del calendario y dice qué significa cada icono y el anillo.
- Semanas (`wrow`), meses (`mtile`) y horas (`hcell`) siguen la misma lógica con una sola opción en `c0`.
