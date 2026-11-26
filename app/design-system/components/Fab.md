# Fab

Botón flotante redondo, abajo a la derecha, relleno `brand` con `shadow-pop`, para lo que tiene que estar a mano del
pulgar en el móvil.

- Uso: `<button class="fab">` (o `<a class="fab">`). Contador opcional: `fab__badge`. Oculto: `fab--hidden` (no se puede
  pulsar ni enfocar; aparece creciendo un poco y fundiéndose con `motion-enter`).
- Hay dos y no más por pantalla:
  - **Chat** (`ChatFab`), dentro de una votación: sale mientras las pestañas quedan por debajo de la pantalla, con los
    mensajes sin leer, y lleva al chat.
  - **Nueva votación**, en «Mis votaciones» con pantalla táctil; con ratón, el «+» va junto al título.
- La lista que tiene debajo deja hueco al final para que no tape nada.
