# SidebarItem

Grupo plegable y fila de votación del menú lateral, para moverse entre votaciones sin salir de la que tienes abierta.

- Uso: `sb-group` con `sb-ghead` (botón `sb-gtoggle`: flecha, nombre en mayúsculas `micro` y contador `sb-count`) y una `sb-list` de `sb-li` → `sb-row` → `sb-item` (icono `sb-ic` y `sb-title`).
- La votación abierta lleva `active` en el `sb-li` y `aria-current="page"` en el enlace: `brand-strong` sobre `brand-soft`.
- Los grupos no llevan icono de carpeta: el nombre en mayúsculas basta.
- Fijo a la izquierda desde 960px de pantalla; por debajo, cajón con fondo oscurecido que se abre con ☰.
