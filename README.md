# Hilemos

Nombre de la app (antes «Votaciones» y, unos días, «Meetplan»). El repositorio y el proyecto de Firebase
mantienen el nombre antiguo.

App para crear votaciones de fechas y compartirlas con un grupo. Es la evolución de
[votaciones](https://github.com/manuelmarcas/votaciones) (la votación de comida/cena de Navidad),
pero todo es configurable.

**Dirección única: <https://hilemos.web.app>** (Firebase Hosting, sitio `hilemos` del proyecto `votaciones-9bc95`).
Las antiguas, <https://votaciones-9bc95.web.app> y la de GitHub Pages (`manuelmarcas.github.io/votaciones-app`),
solo redirigen allí conservando la votación del enlace, para que los enlaces ya compartidos sigan funcionando.

El código está en [`app/`](app/) (React + Vite + TypeScript, preparado para la app móvil con Capacitor):
ver [`app/README.md`](app/README.md). La primera versión, sin React, sigue en el historial de git.

Inventario de funcionalidades y propuesta de planes (gratis y premium):
[`docs/funcionalidades-y-planes.md`](docs/funcionalidades-y-planes.md).

## Qué se puede hacer

- **Crear votaciones** con:
  1. Nombre (y descripción opcional).
  2. Tipo: **horas**, **días**, **semanas**, **meses** u **opciones** (una lista libre, sin fechas: restaurante,
     regalo, destino…; de 2 a 30, cada una con su nombre y, si se quiere, un emoji; sin emoji se pone ⚪).
  3. Los meses en los que estará la votación (pueden ser de años distintos).
  4. Los días (o semanas) concretos que se podrán votar dentro de esos meses. El resto aparecen bloqueados.
     Hay atajos (todos, ninguno, lunes a viernes, fines de semana) y, en ordenador, Mayús + clic marca un rango.
  5. En las de **días**: de 1 a 4 opciones por día (p. ej. comida y cena), cada una con su nombre y su icono.
     El icono se ve en el calendario y el nombre en la leyenda.
  6. En las de **horas**: franjas periódicas (rango desde/hasta y duración, repetidas en cada día) u horas
     sueltas elegidas día por día, que pueden ser distintas entre un día y otro.
- **Votar** pulsando en el calendario, con el contador en cada casilla, el borde verde en lo más votado,
  el resumen de "opciones más votadas" y la tabla por participante, igual que en el original.
- **Mis votaciones**: cada usuario tiene su colección (las que ha creado y aquellas en las que ha entrado)
  y puede organizarla en **grupos** con el nombre que quiera (crear, renombrar, eliminar, mover votaciones).
- **Menú lateral** dentro de cada votación: todas tus votaciones por grupos para saltar de una a otra sin volver
  a la portada, con buscador. Desde ahí se organizan (menú ⋯ o arrastrando a otro grupo) y se crean, renombran,
  pliegan o eliminan grupos.
  Los grupos sin votaciones no salen en el menú (sí en «Mover a» y mientras se arrastra una votación). En el móvil se abre con el botón ☰.
- **Emojis** en el título, la descripción y las opciones de cada día, con un selector completo
  (todos los emojis de Unicode, como WhatsApp) con categorías, búsqueda en español, tonos de piel y recientes.
- **Perfil**: cada usuario elige el nombre que ven los demás y su imagen (subida desde el dispositivo, la de Google
  o ninguna, y entonces se muestra su inicial). El cambio se aplica a todas las votaciones en las que participa.
- **Modo oscuro**: en «Tu perfil → Preferencias», tema Automático (como el dispositivo), Claro u Oscuro. Se recuerda en cada dispositivo.
- **Compartir** con enlace, **código QR** (también descargable en PNG), WhatsApp, Telegram, correo
  o el menú de compartir del móvil.
- Quien abre el enlace e inicia sesión **queda como participante** (aparece en la tabla aunque aún no haya votado)
  y la votación **se añade a su menú**.
- **Ranking**: "opciones más votadas" muestra las 5 primeras de todas las opciones, con su puesto (los empates
  comparten puesto).
- **Desempate**: si hay varias opciones empatadas en el primer puesto, el creador puede abrir un desempate.
  La votación principal se cierra y cada participante elige **una sola** de las empatadas (puede cambiarla mientras
  esté abierto). Mientras está abierto se puede anular (y reabrir la votación, que también lo anula). **Finalizarlo
  es definitivo**: la confirmación avisa de que la ganadora queda marcada para siempre, y desde entonces no se puede
  reabrir ni la votación ni el desempate (lo impiden también las reglas). Arriba sale «Resultado definitivo: …» y se
  avisa a todos. Si se finaliza sin ganadora (sigue el empate o nadie votó), solo se puede repetir entre esas mismas
  opciones.
- **Editar una votación** (menú ⋯ → «Editar votación», solo administradores): nombre y descripción siempre; sin
  desempate, también se pueden **añadir** días, semanas, meses, horas u opciones, pero **no quitar lo que ya tiene
  algún voto** (un día con un voto, o una opción con un voto en cualquier día, semana, mes u hora). Lo que tiene votos
  sale en rojo suave y no se deja quitar. El tipo de votación no se cambia: para eso está «Duplicar». Cada cambio deja un
  **aviso en el chat** («Ana ha añadido el viernes 18 de diciembre», «… ha cambiado el título…»).
- **Votos visibles o anónimos** (se elige al crearla). Con votos visibles, en la tabla de participantes se pulsa
  un nombre para ver qué ha votado esa persona, y en "opciones más votadas" se puede desplegar quién las votó.
  En las anónimas solo se ven los totales y si cada persona ha votado. El creador puede hacer anónima una votación
  visible, pero no al revés.
  *Ojo*: el anonimato es de la interfaz. Los votos se guardan en documentos que cualquier participante puede leer
  (la app los necesita para el recuento), así que alguien con conocimientos técnicos podría consultarlos.
- El creador puede **cerrar/reabrir** la votación (cerrada ya no admite cambios) y **eliminarla**;
  cerrar y eliminar piden confirmación.
- **Gestionar participantes** (menú ⋯ de la votación): quien la gestiona nombra o quita administradores con un clic
  («Hacer admin» / «Quitar admin»). Gestionan la votación como él (cerrar y reabrir, desempates, solicitudes, acceso y
  plazo), pero no pueden eliminarla ni nombrar a otros administradores. Cualquier administrador puede **expulsar a
  alguien** (con confirmación): sus votos dejan de contar, su plaza queda libre, no puede volver a entrar con el
  enlace ni escribir en el chat (sus mensajes se quedan) y el chat avisa («Ana ha expulsado a Luis de la votación»). A otro
  administrador solo le expulsa el creador, y al creador nadie. Los expulsados aparecen aparte, en «Expulsados», para volver a
  admitirlos. En la tabla de «Participantes» solo quedan las etiquetas: «Creador», «Delegado» y «Admin».
- **Exportar resultados** (menú ⋯, administradores): **CSV** para guardar la votación (una fila por casilla, con sus
  votos, su puesto y una columna por persona), **Excel** con formato (hojas «Resultados», «Votos» y «Participantes») y
  un **informe en PDF** para presentar o imprimir (ganadora, clasificación con quién votó cada opción, desempate y
  participantes). En las anónimas no salen nombres. En la app de Android se comparten con el menú del sistema.
- **Salir de la votación**: al final de cada votación, en su menú ⋯ de «Mis votaciones» y del menú lateral, y
  deslizándola hacia la izquierda en el móvil. Siempre pide confirmación (no se puede deshacer) con un aviso de lo que
  pasará según cómo esté la votación. Quien sale pasa a un nombre sin dueño al azar («Un suspiro», «Una sombra
  lejana»…, uno por votación) y sin foto en sus mensajes del chat y, si la creó, en «Creador». Sus votos: con la
  votación abierta o con un desempate abierto, se borran (y su plaza queda libre); si ya no se puede votar (cerrada o
  con el plazo pasado), se quedan con ese nombre y van aparte, plegados, en **«Se fueron»** de «Participantes» (los
  totales siguen cuadrando; las cabeceras solo cuentan a quien sigue). Si se iba durante un desempate, el desempate se
  ajusta solo al momento para todos: sin empate se quita y queda la ganadora; con empate entre menos opciones, sigue
  solo entre esas; con el mismo empate, no cambia nada. **Quien entra ve un aviso**: «Han cambiado los votos porque una
  persona se ha salido de la votación…» (en la tarjeta del desempate o, si ya no hace falta, en su lugar). Cada
  dispositivo lo calcula con los votos que quedan y lo guarda el primer administrador que abre la votación. Si vuelve a entrar con el enlace, vuelve a ser él: sus votos (si se quedaron) y sus mensajes
  recuperan su nombre, y si la creó vuelve a salir como «Creador», aunque la sigue gestionando el «Delegado». Una
  votación que ya no existe solo se quita de la lista. Si era la última votación de un grupo, el grupo también se
  borra.
- Quien sale de una votación que creó la cede a un administrador al azar o, si no hay, a otro participante (si no
  queda nadie, se borra). Quien la hereda es su **«Delegado»**, con todos los poderes del creador. Quien se fue
  (`gone` en su voto) no hereda, no se le cuenta como «falta por votar» ni aparece en las solicitudes.
- **Política de privacidad y condiciones de uso** en `#/privacidad` y `#/condiciones` (`app/src/pages/Legal.tsx`):
  enlazadas desde la entrada y desde «Tu perfil», y se leen también sin entrar.
- **Eliminar mi cuenta** (al final de «Tu perfil»; Google Play lo exige): sale de cada votación de su lista como con
  «Salir de la votación» y se borran su perfil, su lista, sus grupos y la cuenta. Firebase pide haber entrado hace
  poco: con Google se vuelve a pedir la cuenta; con correo o clave, si hace rato, hay que salir y volver a entrar.

## Publicar

Siempre en la misma dirección (el canal *live* de Firebase Hosting). No se usan canales de vista previa:
caducan y cambian de dirección.

1. **Reglas de Firestore** (solo si cambia [`firestore.rules`](firestore.rules)), antes que la web:
   desde la raíz del repo, `app/node_modules/.bin/firebase deploy --only firestore:rules` (usa `firebase.json`
   y `.firebaserc` de la raíz), o pegarlas en
   *Firebase Console › Firestore Database › Reglas*. Incluyen también la regla de `/votes` de la votación de
   Navidad original.
2. **Web**: `cd app && npm run deploy` (compila y publica en <https://hilemos.web.app>).

Si se publica en otro dominio, hay que añadirlo en *Authentication › Configuración › Dominios autorizados*.

## Skills para Claude Code

En `.claude/skills/` están las normas y herramientas del proyecto para trabajar con Claude Code (se cargan solas
cuando hacen falta, o con `/nombre`):

| Skill | Para qué |
| --- | --- |
| `publicar` | Compilar, reglas, web, comprobar que está en vivo, commit y push, integrando lo de otras sesiones |
| `probar-en-navegador` | Pruebas en Chrome (modo demo): capturas comparadas píxel a píxel, estados con el ratón y recorrido funcional de toda la app |
| `cambio-de-modelo` | Todo lo que hay que tocar cuando cambia un dato de Firestore (tipos, reglas, almacenes, plantillas, privacidad…) |
| `estilo-y-css` | Tokens, convención BEM, tooltips, iconos, tema oscuro y móvil |
| `codigo-limpio` | Dónde va cada cosa, cuándo sacar un componente y qué reutilizar |
| `limpieza-codigo` | Código muerto, CSS sin usar, selectores fuera de BEM, duplicados y cálculos de más (con scripts) |
| `textos` | Cómo se escriben los textos de la interfaz, los comentarios y los commits |

## Estructura

En la rama `main` solo hay código vigente: la primera versión (sin React) no está en los archivos, solo en el
historial de git. Hay **una única aplicación**: la web y la app de Android salen del mismo código (`app/src`).

```
app/                          LA APLICACIÓN (React + Vite + TypeScript). Ver app/README.md
├── src/                      Código fuente, el mismo para la web y para Android
│   ├── main.tsx, App.tsx     Arranque y rutas
│   ├── pages/                Pantallas (portada, votación, creación…); pages/poll/ = piezas de la votación
│   ├── components/           Componentes reutilizables
│   ├── lib/                  Lógica pura (fechas, ranking, desempate…) con sus tests; lib/store/ = acceso a datos
│   ├── state/, hooks/        Estado global y hooks
│   └── styles/               CSS en BEM, solo con variables del design system
├── design-system/            tokens.json (única fuente de colores y medidas), logo y guía de componentes
├── public/                   Iconos, manifest (PWA) y firebase-messaging-sw.js (avisos push en el navegador)
├── assets/                   Iconos y splash de origen para generar los de Android
├── android/                  Proyecto nativo de Android (Capacitor): empaqueta la web compilada en un WebView
├── redirect/                 Página mínima del sitio antiguo de Firebase Hosting (solo redirige)
├── capacitor.config.ts       Configuración de la app de Android
├── firebase.json             Hosting: destinos «app» (la web) y «antigua» (redirección)
└── vite.config.ts            Compilación y tests (Vitest)

firestore.rules               Reglas de seguridad de Firestore
firebase.json, .firebaserc    Firebase de la raíz: reglas y funciones (el hosting está en app/)
functions/                    Cloud Functions de avisos push (escritas, nunca desplegadas: plan Spark)
docs/                         Documentación (funcionalidades y planes)
.claude/skills/               Normas y herramientas del proyecto para Claude Code
index.html                    Redirección de GitHub Pages a hilemos.web.app (no es la app)
```

### Qué se ejecuta dónde

| Dónde | Qué código | Cómo llega |
| --- | --- | --- |
| **Web** <https://hilemos.web.app> | `app/src` compilado a `app/dist` | `cd app && npm run deploy` (Firebase Hosting, destino `app`) |
| **App de Android** | El mismo `app/src`, compilado en modo `android` y empaquetado en `app/android` | `npm run android` (compila y sincroniza) y después se abre en Android Studio |
| Sitio antiguo `votaciones-9bc95.web.app` | `app/redirect/` | `npm run deploy:antigua`; solo redirige |
| GitHub Pages | `index.html` de la raíz | Solo redirige a la dirección única |
| Reglas de Firestore | `firestore.rules` | `firebase deploy --only firestore:rules` desde la raíz |

## Modelo de datos (Firestore)

| Ruta | Contenido |
| --- | --- |
| `polls/{pollId}` | `title`, `description`, `type`, `anonymous`, `tiebreak` (`id`, `candidates`, `done`, `round`), `tbNote` (aviso para todos de que el desempate cambió porque alguien dejó de participar: `at`, `solved` y, si sigue, `tb` y `n`), `months`, `slots` (días, lunes de cada semana, meses votables o, en las de opciones, los ids de las opciones), `hours` y `hourStep` (solo horas), `options` (opciones de cada día en las de días; las opciones libres en las de `type: "options"`), `ownerUid`, `ownerName`, `admins` (administradores nombrados por el creador), `founder` y `founderName` (si el creador se fue: su uid y su nombre sin dueño), `createdAt`, `closed`, y quién puede unirse: `maxPeople`, `members`, `approval`, `emailsOnly` |
| `polls/{pollId}/private/access` | Correos permitidos de una votación privada (`emails`). Solo lo lee el creador |
| `polls/{pollId}/chat/{msgId}` | Mensajes del chat: `uid`, `name`, `text`, `at` y `sys` (aviso automático de un cambio al editar la votación; solo lo escriben los administradores) |
| `polls/{pollId}/votes/{uid}` | Un documento por participante: `name`, `photo`, `picks` (`"<casilla>\|<opción>"`), `tb` (voto del desempate: `{ id, pick }`), `status` (`pending`/`rejected`: pendiente de aprobación, rechazado o expulsado), `removed` (lo expulsó un administrador ya estando dentro), `gone` (se fue y sus votos se quedaron con un nombre sin dueño), `seenAt`, `updatedAt` |
| `users/{uid}` | Perfil: `name` (nombre visible), `photo`, `thumb`, `notify` (avisos), `updatedAt` |
| `users/{uid}/polls/{pollId}` | Colección privada del usuario: `title`, `type`, `role` (`owner`/`participant`), `ownerName`, `groupId`, `addedAt`, `archived` |
| `users/{uid}/groups/{groupId}` | Grupos privados del usuario: `name`, `createdAt` |

Cualquier usuario con sesión puede abrir una votación si tiene el enlace; solo el creador puede cerrarla o
borrarla; cada uno solo puede modificar su propio voto; y la colección/grupos de cada usuario es privada.
En las votaciones con aprobación o solo con correos, los votos solo los ven el creador y los aceptados.
