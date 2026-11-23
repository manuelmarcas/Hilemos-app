Votaciones sirve para que un grupo decida cuándo quedar: qué día, semana, mes u hora, y si es para comer o para cenar. La interfaz es la sobremesa donde se decide: una marca color berenjena sobre grises perla que tiran a su mismo tono, y un color propio para cada opción del día, en pastel: miel, azul cielo, rosa y lila.

Los valores de esta guía están en [`tokens.json`](tokens.json), y la app los toma directamente de ahí: [`tokensPlugin.ts`](tokensPlugin.ts) los convierte en variables CSS al arrancar y al compilar, así que cambiar un valor en `tokens.json` cambia la app y lo deja registrado a la vez. Cuando cambie una regla (cuándo se usa cada color, iconos, componentes…), se actualiza también esta guía.

## Voz y textos

- Habla de tú, en castellano de España y con frases cortas: «Pulsa en las que te vengan bien», «Elige una sola opción».
- Mayúscula solo al principio: «Nueva votación», «Opciones más votadas», «Finalizar desempate».
- Los botones empiezan por verbo y dicen lo que pasa: «Compartir», «Cerrar votación», «Reabrir», «Eliminar». El botón que confirma repite el verbo del título («¿Cerrar la votación?» → «Cerrar votación»); el otro es «Cancelar». Nunca «Sí» / «No».
- Nombra botones y apartados entre comillas angulares: «Compartir», «Mis votaciones».
- Exclamaciones solo en avisos de éxito breves: «¡Votación creada! Compártela con el botón «Compartir».»
- Cantidades siempre con su plural: «1 voto», «5 votos», «8 participantes».
- Fechas en palabras: «Miércoles 23 de diciembre» en títulos y resultados; «mié 23 dic» en etiquetas compactas.
- Las confirmaciones explican la consecuencia: «Se borrarán la votación y todos sus votos para todos los participantes. No se puede deshacer.»

## Color

- Pinta la página con `bg`; tarjetas, celdas, campos y diálogos con `card`; rellenos suaves (contadores, puestos, etiquetas de voto, días no votables) con `soft`; el paso del ratón con `hover`; bordes y separadores con `line`.
- Texto en `ink`; metadatos, ayudas y leyendas en `muted`. Los dos se leen sobre `bg`, `card` y `soft` en ambos temas.
- `brand` es la marca: botón principal, chip activo, opción elegida en el desempate, enlaces (`link`) y foco (`focus`). Usa como mucho un botón `brand` por vista. El texto sobre `brand` va en `on-brand`. Los títulos de página y de sección van en `brand-strong`. Las selecciones (fila activa del menú, «N votos» desplegado, «Votos visibles», «Tuya») van en `brand-strong` sobre `brand-soft`.
- `best` solo significa «la más votada»: el anillo de la casilla, el puesto 1º, la ganadora del desempate y el aviso «Resultado definitivo» (fondo `best-soft`, texto `best`, en lugar del rojo de «Votación cerrada»). La fila del 1º lleva fondo `best-soft` con borde `best`, y la pastilla «1º» va en `on-best` sobre `best`. No uses `best` para acciones.
- El ámbar es el desempate: borde `tie` en su tarjeta y `tie-ink` sobre `tie-soft` en sus etiquetas. El banner del modo demo usa los mismos tokens.
- `danger` solo para lo que no se puede deshacer o ha quedado bloqueado: «Eliminar», «Anular», «Quitar» y el banner de votación cerrada (`danger` sobre `danger-soft`). El botón relleno (`on-danger` sobre `danger`) solo aparece dentro del diálogo que confirma algo destructivo.
- Cada opción de un día usa `c0`, `c1`, `c2` y `c3` por orden (máximo 4). El texto y el icono sobre el relleno van en `c0-ink`…`c3-ink`; el borde de una casilla rellena, en `c0-edge`…`c3-edge`. Son pasteles de la misma luminosidad (`c0` miel, `c1` azul cielo, `c2` rosa, `c3` lila), con tonos repartidos por la rueda para que se distingan sin que ninguno pese más que otro; el icono de cada opción las diferencia también sin ver el color. Todas llevan texto oscuro (`-ink`). No hay verdes ni rojos: el verde es de `best` (el anillo de la más votada) y el rojo de `danger`. Semanas, meses, horas y opciones libres tienen una sola opción y usan `c0` (en las libres, cada opción es una tarjeta con su emoji). Nunca uses estos colores para otra cosa.
- Marca «la más votada» con un anillo doble: 2px de `best` por fuera y 2px de `card` por dentro (`box-shadow: inset 0 0 0 2px var(--best), inset 0 0 0 4px var(--card)`). El hueco de `card` hace que el verde se vea sobre cualquier color de opción.
- El aviso flotante invierte el tema: fondo `ink` y texto `bg`.
- Los neutros (`bg`, `soft`, `hover`, `line`) llevan una pizca del tono de `brand`; no uses cremas ni beiges, que con la berenjena quedan apagados.
- Hay tema claro y oscuro. Por defecto se sigue el del dispositivo y cada persona puede fijarlo en «Tu perfil → Preferencias».

## Tipografía

- Titulares en Bricolage Grotesque (familia `display`): `display` para el título de la votación y de cada página, `heading` para los meses, «Opciones más votadas», «Desempate» y los diálogos, y `wordmark` para la marca de la barra superior.
- Todo lo demás en Figtree (familia `sans`): `body` para párrafos y descripciones, `ui` para botones, chips y filas del menú, `meta` para la línea de datos sobre el título, las tarjetas y la leyenda, y `micro` para etiquetas, contadores y nombres de grupo del menú (estos en mayúsculas con `letter-spacing: .06em`).
- Los campos de texto van a 16px como mínimo para que el móvil no haga zoom al escribir.
- Números que se comparan (votos, puestos, días, horas): `font-variant-numeric: tabular-nums`.
- Carga las dos familias desde Google Fonts.

## Espacio, forma y profundidad

- Usa los pasos de 4px: `space-1` dentro de contadores, `space-2` entre controles de una fila, `space-3` entre filas, `space-4` como relleno de tarjetas y vía lateral mínima, `space-6` entre secciones y `space-8` antes de bloques grandes.
- Radios: `radius-sm` (8px) en celdas de hora y filas del menú; `radius-md` (10px) en botones, campos, celdas del calendario, filas del ranking, opciones del desempate y banners; `radius-lg` (14px) en tableros de mes, tarjetas, menú lateral y desempate; `radius-xl` (18px) en diálogos; `radius-pill` (999px) en chips, etiquetas, contadores, puestos y avatares.
- Solo lleva sombra lo que flota: `shadow-card` en tableros, menú lateral y desempate; `shadow-pop` en menús y aviso flotante; `shadow-dialog` en diálogos. Filas, celdas y opciones se separan con borde `line`, sin sombra.
- Lo que no se puede votar se apaga con `opacity-off` sobre `soft`; los botones desactivados, con `opacity-disabled`.

## Estados

- Al pasar el ratón: fondo `hover`. Elegido: relleno `brand` en chips y en el círculo del desempate; relleno de la opción (`c0`…`c3`) en las casillas del calendario, con `aria-pressed="true"`.
- Desplegables: siempre `<select class="input">` (nunca el aspecto del sistema). Llevan la flecha propia (`--chevron`, en `muted`) y, donde el navegador lo permite (`appearance:base-select`: Chrome, Edge y la app de Android), la lista abierta es una tarjeta `card` con `shadow-pop`, filas como las del menú ⋯ y la elegida en `brand-strong` sobre `brand-soft`; abierto, el campo se pone en `brand-soft`.
- Campos con un fallo: nunca la burbuja del navegador («Completa este campo»). `src/lib/fieldErrors.ts` la sustituye en toda la app: el campo pasa a borde `danger` y debajo sale un aviso `card` con borde `danger`, `shadow-pop`, flecha hacia el campo y un «!» en `on-danger` sobre `danger`. Se quita al escribir. El texto sale de `data-error` en el campo («Escribe tu nombre: es el que verán los demás.»); si no hay, uno genérico según el fallo. Tampoco se usan `alert`, `prompt` ni `confirm` del navegador: avisos flotantes y `ConfirmDialog`.
- Foco de teclado: anillo sólido de 2px en `focus`, separado 2px. Tiene más de 3:1 sobre `bg` y `card` en los dos temas.
- Transiciones de .15s solo en fondo, borde y la flecha de «N votos»; el aviso flotante aparece en .2s. Sin animaciones decorativas.

## Composición

- La maqueta depende del ancho del área de contenido, no del de la pantalla (container queries sobre `#view`). Por debajo de 560px, las acciones de la votación forman una rejilla de 3 columnas iguales. Desde 820px, los meses se muestran de dos en dos. Desde 960px de pantalla, el menú lateral queda fijo a la izquierda; por debajo, es un cajón que se abre con ☰.
- En el ranking, «N votos» va a la derecha si cabe y, si no, baja alineado a la izquierda.
- La página nunca se desplaza en horizontal; la tabla de horas se desplaza dentro de su tarjeta, con la columna de horas fija.
- Ningún ancho depende del contenido. Los hijos de flex y grid llevan `min-width:0` cuando contienen texto o controles; las rejillas de una columna usan `minmax(0,1fr)` (ya está por defecto para todas, con `grid-auto-columns`); el texto sin espacios parte con `overflow-wrap:anywhere` y lo que no debe partir (chips, títulos de una línea) se corta con `text-overflow:ellipsis`. Un `<select>` se mide por su opción más larga: siempre con `max-width:100%`.
- Red de seguridad: `#app` lleva `overflow-x:clip` (no `hidden`, que rompería las barras pegajosas). No es excusa para dejar un desbordamiento: si algo queda cortado por la derecha, el fallo está en ese componente.

## Botones y acciones

- Cada acción va junto a lo que afecta: «📣 Avisar a quien falta» encima de la lista de personas (en «Participantes» y en el desempate abierto), «⚖️ Desempatar» después del texto que explica el empate y «📅 Añadir al calendario» encima del ranking.
- Gestión del creador separada de lo demás: lo que cambia la votación entera (cerrar, acceso, anónima, duplicar, eliminar) va en el menú ⋯ junto al título; lo que gestiona un bloque va en su pie, separado por una línea `line` (el desempate: «Finalizar desempate» y «Anular»; o «Repetir entre las empatadas» y «Quitar desempate»). Comunicarse con el grupo (compartir, avisar, calendario) nunca se mezcla con esos botones.
- En una fila de acciones: la principal primero, luego las secundarias y la destructiva siempre la última. Como mucho un botón `brand` por bloque.
- Lo destructivo va como enlace `.link-btn.danger` cuando deshace un bloque entero («Anular», «Quitar desempate», «Eliminar grupo») y como `.btn.danger` cuando es una opción más en una lista de botones («Rechazar», «Salir de la votación», «Quitar imagen»).
- Formularios y paneles en la página (alineados a la izquierda): «Guardar» / «Crear…» primero y «Cancelar» después. Diálogos (alineados a la derecha): «Cancelar» primero y la confirmación al final, pegada al borde. En los dos casos la principal queda en el borde por el que se empieza a mirar, y en los diálogos el foco empieza en «Cancelar».

## Iconografía

- La interfaz usa iconos propios en SVG (`src/components/Icon.tsx`, `<Icon name="…" />`): trazo de 1.8 sobre 24×24, puntas y esquinas redondeadas, sin relleno salvo puntos y detalles pequeños, y en el color del texto que los rodea (`currentColor`), a 1.2em. Los tipos de votación salen del mismo calendario con dos anillas que el logotipo. El icono `logo` es el logotipo con este mismo trazo (el calendario con la cara): es el icono pequeño de los avisos en Android (`drawable/ic_stat_hilemos.xml`) y la insignia de los avisos web (`public/badge-96.png`). Los iconos grandes que representan algo (tipo de votación en tarjetas, «Mis votaciones» y el menú lateral) van en `brand`; los de los menús, en `muted`.
- Iconos fijos: `link` Compartir, `share` menú de compartir del sistema, `megaphone` Avisar a quien falta, `lock`/`unlock` Cerrar y Reabrir, `trash` Eliminar (y «Quitar de mi lista» una votación que ya no existe), `leave` Salir de la votación, `scale` Desempate, `trophy` Más votadas, `eye` Votos visibles, `incognito` Anónima, `users` participantes y votos, `chat` Chat, `approve` Con aprobación, `mail` Solo estos correos, `hourglass` plazo, `settings` Acceso y plazas, `copy` Duplicar, `edit` Editar votación (y los avisos de cambios en el chat), `flag` Denunciar (un mensaje o a una persona) y la marca «Denunciado» (en el chat, junto al nombre en «Participantes» y en el perfil), `download` Descargar mis datos, `premium` (estrella) la etiqueta «Premium», `eyeOff`/`eye` Ocultar un mensaje del chat y volver a mostrarlo, `archive`/`unarchive`, `more` (⋯), `menu` (☰), `back`, `plus`, `check` y `close` (quitar una fila, como una opción libre). Tipos de votación: `hours`, `days`, `weeks`, `months` y `options` (lista de opciones libres).
- Las opciones libres usan el mismo selector de emojis; sin elegir ninguno llevan ⚪ (`DEFAULT_CHOICE_ICON`), neutro a propósito, que en el formulario se ve atenuado para indicar que es el de serie.
- Los emojis se quedan solo para lo que escribe la gente: títulos, descripciones, chat y el icono de cada opción del día, que elige quien crea la votación desde un selector completo. Los de serie son 🍽️ Comida, 🌙 Cena, ☕ Desayuno, 🌅 Mañana, ☀️ Mediodía y 🌇 Tarde. La imagen de resultados (canvas) usa el emoji equivalente de cada tipo (`TYPE[…].emoji`).
- Al editar una votación, lo que ya tiene votos (días, semanas, meses, horas sueltas y opciones) va en rojo suave: fondo `danger-soft` con borde y texto `danger` (es «bloqueado», uno de los usos de `danger`), también si ya ha pasado, con una leyenda («En rojo, los días que ya tienen votos…») y el título «Tiene votos: no se puede quitar». Las horas sueltas con votos pierden su «×».
- **Tooltips**: nunca el `title` del navegador. Se pone `data-tip="…"` en el elemento y sale la pastilla de la app (`components/Tooltip.tsx`): fondo `ink`, texto `bg` (como el aviso flotante), 0.8rem en negrita, radio 8px y flecha hacia el elemento; encima o, si no cabe, debajo. Sale al pasar el ratón (350 ms) o al llegar con el teclado; en pantallas táctiles no hay, así que no pueden ser la única explicación. Si es el único nombre de algo, va también en `aria-label`.
- Los avisos de cambios en el chat no van en burbuja: una línea centrada con borde discontinuo `line`, texto `muted`, el icono `edit` y el nombre en `ink`.
- El botón de emoji (carita) junto a título, descripción, opciones y chat solo aparece con ratón (`hover:hover` y `pointer:fine`): en el móvil y la tableta el teclado ya trae emojis.
- El icono va antes del texto y nunca solo, salvo en botones con `aria-label` (⋯, ☰, carita). La única otra excepción son las casillas del calendario, cuyo significado explica la leyenda.
- Cargando (`src/components/Loading.tsx`): nunca un texto suelto. Mientras se espera algo:
  - **Al arrancar la app**, el logotipo lila con el ojo abierto (el de la derecha) girando como un círculo de carga
    (`LogoMark` con `eyeClassName`).
  - **Una pantalla o una zona**, `Loading`: el círculo y el texto debajo («Cargando votación…»).
  - **La lista de votaciones**, `PollListSkeleton`: tarjetas vacías con un brillo que pasa.
  - **Un botón que espera** («Entrando con Google…», «Creando…»), `Spinner` delante del texto, y el resto de
    botones que harían otra cosa, desactivados.
  - El círculo es `line-strong` con el tramo que gira en `brand` (`on-brand` sobre un relleno `brand`). Con movimiento
    reducido el círculo y el ojo giran más despacio y el brillo se para.
- Al abrir una pantalla con formulario (nueva votación, editar), el primer campo solo recibe el foco con ratón
  (`hasMouse()`): en el móvil abriría el teclado sin que nadie lo haya pedido.
- Logotipo: un calendario blanco con cara que guiña un ojo y saca la lengua, sobre fondo `brand`. El original (de Recraft) está en `logo/logo-recraft-original.svg`; los que usa la app salen de él:
  - `public/icon.svg`, `icon-192.png`, `icon-512.png` y `apple-touch-icon.png` (180 px): a sangre, sin esquinas; Android, iPhone y la Play Store las recortan por su cuenta.
  - `public/icon-maskable.svg` y sus PNG: el dibujo al 80 % para que quepa en el círculo de los iconos adaptables de Android.
  - `logo/logo-lila.svg`: el logotipo sin fondo, que es el principal dentro de la app. Solo el calendario en `logo` (lila claro, el mismo tono que `brand` en oscuro), con los ojos y la sonrisa en `#2A2329` para que se lean en los dos temas. Lo usan `src/components/LogoMark.tsx` (barra superior y pantalla de entrada) y `public/favicon.svg` (pestaña del navegador). Los iconos de la app son los únicos que llevan el fondo `brand`.
  - App de Android: el icono (lanzador, selector de cuentas de Google, ajustes) y la pantalla de arranque usan el logotipo con fondo, el de `logo/logo-recraft-original.svg` (calendario blanco sobre su morado `#542A53`), nunca el lila. Los genera `scripts/android-icons.mjs` (`npm run android:assets`): el calendario va en vectorial (`drawable/ic_launcher_logo.xml`) para que se vea nítido también ampliado en la pantalla de arranque, sobre el fondo `bg` de la app.
  - `logo/play-store-512.png`: el icono para la ficha de la Play Store.
- En la barra superior va el logotipo sin fondo (`LogoMark`, en `logo`) seguido de «Hilemos» en `wordmark`, en dos colores y nunca en negro: «Hile» en `wordmark-hile` (la parte clara) y «mos» en `wordmark-mos` (la oscura), los dos de la familia del lila de `logo`. En claro: lila #b97aae y berenjena #451d42; en oscuro: el lila del logo #dca6d2 y malva #a8679c. El nombre va siempre con la H mayúscula, «Hilemos», también en el logotipo.
- Avatares: la foto de perfil recortada en círculo o, si no hay, la inicial sobre un tono que sale del nombre (fondo `hsl(h 42% 86%)` y letra `hsl(h 45% 26%)`; en oscuro, `hsl(h 28% 30%)` y `hsl(h 60% 88%)`). En grupo se solapan 7px con un aro de 2px en `card`.

## Componentes

- Aviso del desempate (`.tie-note`): cuando cambia porque alguien deja de participar, lo ven todos. Va en `tie-soft` con texto `tie-ink`, como el estado del desempate: dentro de su tarjeta, bajo la explicación, o, si el desempate se quitó, suelto en su lugar (`.tie-note--solved`, con borde `tie`).
- «Se fueron» (`GonePeople`, en «Participantes»): quienes salieron cuando ya no se podía votar, con sus votos y un nombre sin dueño. Va debajo de la tabla, plegado tras un botón con el mismo triángulo que despliega los votos de una persona, en `muted`, y su tabla en `muted` con los avatares en gris: cuentan en los totales, pero ya no están.
- Perfil de un participante (`PersonDialog`, `.person-card`): se abre al pulsar en un nombre de «Participantes»; el resto de la fila (la flecha `.person-row__caret`, los números o el hueco) despliega sus votos: la fila lleva cursor de mano, pero solo el nombre se sombrea. Foto grande, nombre en `brand-strong`, papel en `muted` y, para quien administra, sus denuncias en `danger` sobre `danger-soft`. «Denunciar» es un botón `btn--danger` (contorno), porque solo abre la denuncia; el que la envía es `btn--danger-solid`. En el propio, «Editar tu perfil».
- Etiqueta «Premium» (`PremiumTag`, `.premium-tag`, en `components/Premium.tsx`): marca las funciones que serán de pago (plazo, con aprobación, solo estos correos, más de 20 personas, nombrar administradores, duplicar, Excel y PDF). Pastilla pequeña con la estrella, en `premium` sobre `premium-soft`, un color que no usa nada más. Dentro de un botón o de un menú va `decorative` (no cambia su nombre accesible). Como en el móvil no hay tooltips, cada pantalla con etiquetas lleva una vez `PremiumNote`: «Lo marcado así será de pago más adelante. Durante el lanzamiento, gratis para todos».
- Clave de acceso (`AccessKeyDialog`): la clave va en `.key-box`, monoespaciada en `brand-strong` sobre `brand-soft` con borde discontinuo de `brand`, para que se vea como algo que hay que guardar. Debajo, «Copiar» y «Compartir»; el diálogo no se cierra hasta marcar «La he guardado».

Los nombres de clase de `src/styles/` (`.btn`, `.chip`, `.cell`, `.cell__opt`, `.summary-row`, `.tiebreak`…) son los que usa la app: es la referencia viva de los componentes, no una copia aparte.

## CSS: convención BEM

Todas las clases siguen BEM: `bloque`, `bloque__elemento` y `--modificador` (`.poll-card`, `.poll-card__title`, `.poll-card--gone`).

- **Un archivo por zona** en `src/styles/` (controles, crear, tableros, chat…), importados en orden desde `index.css`. El bloque vive en un solo archivo; si un bloque se usa en varias pantallas (`.legend`, `.count`), va en el de la zona donde nació, y sus modificadores con él.
- **Modificadores de una sola clase** (`.btn--primary`, nunca `.btn.btn--primary`) y siempre junto a la clase base en el HTML: `class="btn btn--primary"`. Así todo pesa lo mismo (una clase) y manda el orden. Si un estado del control (`:hover`, `:disabled`) le ganaría a un modificador, el modificador lo nombra también: `.chip--on:hover:not(:disabled)`, `.picker__day--locked:disabled`.
- **Un bloque no retoca el interior de otro** (nada de `.chat__form .btn` ni `.btn .icon`):
  - Si un control necesita algo especial dentro de un bloque, lleva también una clase de ese bloque (mezcla): `class="btn chat__send"` y se estila `.chat__send`. La regla de la mezcla va detrás de la del control (mismo peso, gana el orden).
  - Si es el tamaño o el color de algo que va dentro, el bloque de fuera fija una variable y el de dentro la usa: `--icon-size` y `--icon-color` (iconos), `--count-size`, `--count-font`, `--count-bg`, `--count-ink`, `--count-pad` y `--count-flex` (contador de votos).
- **Sin ids ni etiquetas en los estilos**: los títulos y campos llevan su clase de elemento (`.step__title`, `.gate__input`). Se admiten etiquetas solo en texto con formato dentro de un bloque (`strong`, `b`, `em`, `p`, `li`), en las filas y celdas de una tabla (`.people-table th`) y en el reinicio de `base.css`. Los ids se quedan para JavaScript, `aria-*` y los enlaces del formulario.
- **Estados ARIA**: lo que ya refleja un atributo (`[aria-expanded="true"]`, `[aria-selected="true"]`, `:disabled`) se estila con él en vez de duplicarlo con un modificador.
- **Estados de la página**: van en `<body class="page">`: `page--with-sidebar` (hay menú lateral) y `page--drawer-open` (cajón abierto en el móvil).
- **En los componentes**: `bem("picker__day", { on, locked })` da `picker__day picker__day--on…` (`src/lib/util.ts`); con mezclas, `bem("btn", { primary: true }, "chat__send")`. Para listas de clases sueltas, `cls(…)`.
- **Comprobarlo**: `node .claude/skills/limpieza-codigo/scripts/selectores-bem.mjs` (selectores fuera de BEM) y `node .claude/skills/limpieza-codigo/scripts/clases-css.mjs` (clases sin usar o sin estilo).
