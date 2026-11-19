Votaciones sirve para que un grupo decida cuándo quedar: qué día, semana, mes u hora, y si es para comer o para cenar. La interfaz es la sobremesa donde se decide: una marca color berenjena sobre grises perla que tiran a su mismo tono, y un color propio para cada opción del día, del azafrán del mediodía al azul de la noche.

Los valores de esta guía son los mismos que usa la app: ver [`tokens.json`](tokens.json) y, ya como variables CSS, [`../src/styles.css`](../src/styles.css).

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
- `best` solo significa «la más votada»: el anillo de la casilla, el puesto 1º y la ganadora del desempate. La fila del 1º lleva fondo `best-soft` con borde `best`, y la pastilla «1º» va en `on-best` sobre `best`. No uses `best` para acciones.
- El ámbar es el desempate: borde `tie` en su tarjeta y `tie-ink` sobre `tie-soft` en sus etiquetas. El banner del modo demo usa los mismos tokens.
- `danger` solo para lo que no se puede deshacer o ha quedado bloqueado: «Eliminar», «Anular», «Quitar» y el banner de votación cerrada (`danger` sobre `danger-soft`). El botón relleno (`on-danger` sobre `danger`) solo aparece dentro del diálogo que confirma algo destructivo.
- Cada opción de un día usa `c0`, `c1`, `c2` y `c3` por orden (máximo 4). El texto y el icono sobre el relleno van en `c0-ink`…`c3-ink`; el borde de una casilla rellena, en `c0-edge`…`c3-edge`. `c0` es claro y `c1` es oscuro, así que las dos primeras opciones (normalmente comida y cena) se distinguen también sin ver el color. Semanas, meses y horas tienen una sola opción y usan `c0`. Nunca uses estos colores para otra cosa.
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
- Lo destructivo va como enlace `.link-btn.danger` cuando deshace un bloque entero («Anular», «Quitar desempate», «Eliminar grupo») y como `.btn.danger` cuando es una opción más en una lista de botones («Rechazar», «Eliminar de mi lista», «Quitar imagen»).
- Formularios y paneles en la página (alineados a la izquierda): «Guardar» / «Crear…» primero y «Cancelar» después. Diálogos (alineados a la derecha): «Cancelar» primero y la confirmación al final, pegada al borde. En los dos casos la principal queda en el borde por el que se empieza a mirar, y en los diálogos el foco empieza en «Cancelar».

## Iconografía

- Los iconos son los emojis del sistema. Cada opción lleva el emoji que elija quien crea la votación, desde un selector completo. Los de serie son 🍽️ Comida, 🌙 Cena, ☕ Desayuno, 🌅 Mañana, ☀️ Mediodía y 🌇 Tarde.
- Iconos fijos: 🔗 Compartir, 📣 Avisar a quien falta, 🔒 Cerrar votación, 🔓 Reabrir, 🗑️ Eliminar, ⚖️ Desempate, 🏆 Opciones más votadas, 👁️ Votos visibles, 🕶️ Anónima, 👥 participantes y votos, 💬 Chat. Tipos de votación: ⏰ horas, 📅 días, 🗓️ semanas, 📆 meses.
- El emoji va antes del texto y nunca solo. La única excepción son las casillas del calendario, cuyo significado explica la leyenda.
- Logotipo: un calendario blanco con cara que guiña un ojo y saca la lengua, sobre fondo `brand`. El original (de Recraft) está en `logo/logo-recraft-original.svg`; los que usa la app salen de él:
  - `public/icon.svg`, `icon-192.png`, `icon-512.png` y `apple-touch-icon.png` (180 px): a sangre, sin esquinas; Android, iPhone y la Play Store las recortan por su cuenta.
  - `public/icon-maskable.svg` y sus PNG: el dibujo al 80 % para que quepa en el círculo de los iconos adaptables de Android.
  - `public/logo-rounded.svg`: la pantalla de entrada, con fondo `brand` y las esquinas ya redondeadas.
  - Sin fondo, solo el calendario en `logo` (naranja suave, el mismo tono que `c3` en oscuro), con los ojos y la boca huecos para que sirva en los dos temas: `src/components/LogoMark.tsx` en la barra superior y `public/favicon.svg` en la pestaña del navegador.
  - `logo/play-store-512.png`: el icono para la ficha de la Play Store.
- En la barra superior va el logotipo sin fondo (`LogoMark`, en `logo`) seguido de «hilemos» en `wordmark`, con «hil» (de hilo, hilar) en `brand` y el resto en `ink`. El nombre va siempre en minúsculas en el logotipo y como «Hilemos» en el texto.
- Avatares: la foto de perfil recortada en círculo o, si no hay, la inicial sobre un tono que sale del nombre (fondo `hsl(h 42% 86%)` y letra `hsl(h 45% 26%)`; en oscuro, `hsl(h 28% 30%)` y `hsl(h 60% 88%)`). En grupo se solapan 7px con un aro de 2px en `card`.

## Componentes

Los nombres de clase de `styles.css` (`.btn`, `.chip`, `.cell`, `.opt`, `.summary-row`, `.tiebreak`…) son los que usa la app: es la referencia viva de los componentes, no una copia aparte.
