# Tiebreak

Tarjeta ámbar encima del calendario donde cada participante elige una sola de las opciones empatadas en el primer puesto.

- Uso: `<section class="tiebreak">` con `tb-head` (título y `tb-state`), `tb-sub`, `tb-options` y, solo para quien creó la votación, `tb-actions`.
- Cada opción es un `<button class="tb-opt">` con círculo `tb-radio`, muestra `sw c0`…`c3`, quién la ha elegido (`av-stack`, solo con votos visibles) y `count`.
- Elegida: `on` y `aria-pressed="true"`, en `brand` sobre `brand-soft`. Pulsarla otra vez la quita; pulsar otra la cambia.
- Al finalizar: `done` en la tarjeta (borde `line`), botones `disabled` y la ganadora con `win` (`best` sobre `best-soft`). Si sigue el empate, «⚖️ Repetir entre las empatadas».
