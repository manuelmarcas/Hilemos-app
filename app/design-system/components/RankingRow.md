# RankingRow

Fila de «Opciones más votadas»: puesto, opción, fecha y número de votos, con las 5 primeras y los empates compartiendo puesto.

- Uso: `<div class="summary-row">` con `<div class="sr-main">` (puesto `rank`, opción `tag-best`, fecha `what`) y después los votos.
- El 1º (y los empatados en el 1º) llevan `first`: fondo `best-soft`, borde `best` y la pastilla del puesto en `best`.
- Con votos visibles, los votos son un botón `votes-btn` que despliega `voters` debajo; en anónimas, un `<span class="votes">`.
- «N votos» queda a la derecha si cabe y, si no, baja alineado a la izquierda (`sr-main` crece con `flex: 1 1 auto`).
- La ganadora de un desempate lleva `tb-badge` «⚖️ Ganó el desempate».
- No marques el 1º con una franja de color en el borde izquierdo: usa el fondo y el borde.
