# Button

Botón de acción con texto que empieza por verbo; `primary` para la acción principal de la vista, normal para el resto y `danger` para lo destructivo.

- Uso: `<button class="btn primary">`. Variantes: `primary`, `danger` (texto rojo, fondo `card`), `danger-solid` (solo dentro del diálogo que confirma algo destructivo), tamaños `small` y `big`.
- Como mucho un `primary` por vista. En la votación es «Compartir».
- El emoji va antes del texto, dentro de `<span aria-hidden="true">`. En móvil las acciones de la votación forman una rejilla de 3 columnas iguales.
- `link-btn` es un botón con aspecto de enlace, para acciones secundarias junto a un texto («Hacer anónima», «Anular»).
- Cerrar, eliminar, desempatar y anular pasan siempre por un diálogo de confirmación (ver Dialog).
