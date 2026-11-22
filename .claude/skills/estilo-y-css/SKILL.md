---
name: estilo-y-css
description: Normas de estilo de Hilemos para CSS y componentes visuales — colores y medidas solo desde los tokens del design system, convención BEM para las clases (bloque__elemento--modificador, mezclas, variables para lo de dentro, sin ids ni etiquetas), tooltips con data-tip, iconos con <Icon>, container queries, tema oscuro y móvil. Úsala siempre que vayas a escribir o cambiar CSS, añadir clases o un componente con aspecto propio, cambiar un color, un icono o un espaciado, o revisar el aspecto de una pantalla, aunque el cambio sea de una línea.
---

# Estilo y CSS en Hilemos

La referencia completa está en `app/design-system/README.md` (léela si vas a tocar algo más que un detalle): color,
tipografía, espacios, estados, iconos, componentes y la sección **«CSS: convención BEM»**. Esta skill es el resumen
para trabajar y lo que hay que comprobar antes de dar el cambio por bueno.

## Valores: solo tokens

- Colores, sombras, radios, espacios, opacidades y fuentes salen de `app/design-system/tokens.json` (única fuente):
  la app los convierte en variables CSS (`var(--brand)`, `var(--radius-lg)`…). En los `.css` nunca se define un valor
  de diseño nuevo ni un color suelto: si hace falta uno, se añade a `tokens.json` con su `usage` y se documenta.
- Cada token tiene un uso escrito («`best` solo significa la más votada», «`danger` es lo destructivo o bloqueado»).
  Respétalo: si un color no encaja con su uso, probablemente hace falta otro token.

## Clases: BEM

- `bloque`, `bloque__elemento`, `bloque--modificador`: `.poll-card`, `.poll-card__title`, `.poll-card--gone`.
- Modificadores de **una sola clase**, siempre junto a la base: `className={bem("chip", { on })}` → `chip chip--on`.
  Nunca `.chip.chip--on` en el CSS: todo pesa una clase y decide el orden.
- **Un bloque no retoca el interior de otro**. Si `chat` necesita su botón distinto, el botón lleva también
  `chat__send` (mezcla) y se estila esa clase, detrás de la del control. Si es tamaño o color de algo de dentro, el
  bloque de fuera fija una variable (`--icon-size`, `--icon-color`, `--count-…`).
- **Sin ids ni etiquetas** en los selectores: un título dentro de una tarjeta es `.step__title`, no `.step h2`.
  Excepciones: texto con formato (`strong`, `b`, `p`, `li`), filas y celdas de tabla, y el reinicio de `base.css`.
- **Cuidado con los estados**: al ser todo de una clase, `.chip:hover:not(:disabled)` (tres) le gana a `.chip--on`.
  Si un modificador debe mandar también con el ratón encima o deshabilitado, nómbralo: `.chip--on:hover:not(:disabled)`.
- Lo que ya expresa un atributo ARIA o un estado nativo (`[aria-expanded="true"]`, `:disabled`) se estila con él.
- En JSX: `bem()` y `cls()` de `app/src/lib/util.ts`. Clases dinámicas con la clave calculada:
  `bem("cell__opt", { [`c${i}`]: true })`.

## Piezas de la interfaz

- **Iconos**: `<Icon name="…" />` (`app/src/components/Icon.tsx`), SVG de trazo en el color del texto. Si falta uno,
  se añade ahí con el mismo trazo y se apunta en la lista de iconos del design system. Los emojis son solo para lo que
  escribe la gente.
- **Tooltips**: `data-tip="…"`, nunca `title` (salen tarde y sin estilo). En móvil no hay: lo que explican tiene que
  entenderse también sin ellos. Si es el único nombre de un botón, va también en `aria-label`.
- **Ancho disponible**: las pantallas usan container queries sobre `.app__view` (`@container view (min-width:560px)`),
  no media queries del ancho de la ventana (el menú lateral ocupa sitio).
- **Móvil**: nada puede sacar la página de la pantalla (sin scroll horizontal), con un margen lateral cómodo; los
  botones a todo el ancho cuando no caben juntos.
- **Tema oscuro**: los tokens tienen valor claro y oscuro; si un color se ve mal en uno de los dos, se arregla en el
  token, no con una regla para `[data-theme="dark"]`.

## Antes de terminar

1. Comprobadores (desde la raíz del repo):
   ```bash
   node .claude/skills/limpieza-codigo/scripts/selectores-bem.mjs   # «Todo en BEM»
   node .claude/skills/limpieza-codigo/scripts/clases-css.mjs       # sin clases huérfanas ni CSS sin usar
   ```
2. Míralo en el navegador en claro, oscuro y móvil (skill `probar-en-navegador`). Si el cambio no debía cambiar el
   aspecto (renombrar, reordenar), compara capturas antes y después.
3. Si has cambiado cómo se usa algo (un color, un componente, una regla), actualiza `app/design-system/README.md` en el
   mismo cambio.
