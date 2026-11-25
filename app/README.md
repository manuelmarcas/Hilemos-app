# Votaciones 2.0 (React + Vite + TypeScript)

Migración de la web de la carpeta raíz a React, como paso previo a la app móvil con Capacitor.
Hace lo mismo que la primera versión (sin React, ya retirada), con el mismo diseño,
los mismos datos de Firebase y las mismas rutas (`#/`, `#/nueva`, `#/perfil`, `#/v/<id>`), así que los
enlaces ya compartidos siguen funcionando.

Se publica en una sola dirección, <https://hilemos.web.app>, con `npm run deploy` (sitio `hilemos` de Firebase
Hosting). La dirección anterior, <https://votaciones-9bc95.web.app>, es otro sitio del mismo proyecto que solo
redirige a la nueva conservando la ruta y la votación del enlace (`firebase.json`, destino `antigua`; se publica
con `npm run deploy:antigua` y casi nunca hace falta). El proyecto de Firebase sigue llamándose `votaciones-9bc95`:
ese identificador no se puede cambiar.

El diseño (color, tipografía, espaciado, estados…) está documentado en [`design-system/README.md`](design-system/README.md),
con los valores exactos en [`design-system/tokens.json`](design-system/tokens.json).

**`tokens.json` es la única fuente de los valores** (colores en claro y oscuro, sombras, radios, espacios,
opacidades y fuentes). Un plugin de Vite ([`design-system/tokensPlugin.ts`](design-system/tokensPlugin.ts)) lo
convierte en las variables CSS (`virtual:tokens.css`, importado en `main.tsx`); los estilos de [`src/styles/`](src/styles/)
solo las usan con `var(--…)` y la imagen de resultados lee el tema claro del mismo JSON. Para cambiar un color se
edita `tokens.json`: en `npm run dev` se aplica al momento, y un alias roto (`{nombre}` que no existe) o un valor
sin claro/oscuro hace fallar la compilación. No se definen variables de diseño en `src/styles/`.

## Comandos

```bash
cd app
npm install          # la primera vez
npm run dev          # servidor de desarrollo: http://localhost:5173/?demo
npm run typecheck    # comprobar tipos
npm test             # tests de la lógica de src/lib (Vitest); npm run test:watch los repite al guardar
npm run build        # compila a dist/ (comprueba tipos antes)
npm run preview      # sirve dist/ para probar la versión compilada
npm run android      # compila y copia la web al proyecto de Android (ver «App de Android»)
npm run android:open # abre el proyecto en Android Studio
```

Con `?demo` en la URL funciona sin Firebase (datos en `localStorage`; cada pestaña puede ser una persona distinta).

## Estructura

```
index.html                 Contenedor (fuentes y tema antes de pintar)
src/main.tsx               Arranque de React (variables del design system, estilos, tema y avisos de campos)
src/App.tsx                Almacén de datos, sesión y elección entre la entrada y la app
src/styles/                Estilos por zonas; index.css los importa en orden (usan las variables de tokens.json)
src/state/ui.tsx           Avisos, «Deshacer», confirmaciones, compartir y selector de emojis (contexto)
src/state/session.tsx      Usuario, colección (votaciones y grupos) y filtros (contexto)
src/state/listActions.ts   Acciones sobre la lista (archivar, salir de una votación, mover a un grupo, borrar un grupo)
src/state/accessKey.ts     Clave de acceso recién creada (la enseña AccessKeyDialog)
src/state/duplicate.ts     «Duplicar» una votación en «Nueva votación»
src/state/route.ts         Rutas con #
src/hooks/useDismiss.ts    Desplegables y menús que se cierran al pulsar fuera o con Escape
src/components/            Shell (barra y menú), Sidebar, Gate y GateCard (entrada), diálogos, Avatar, Chat, emojis…
src/pages/Home.tsx         «Mis votaciones»
src/pages/Create.tsx       «Nueva votación»
src/pages/Profile.tsx      «Tu perfil»
src/pages/poll/            Una votación: PollPage (estado y acciones) y sus partes (tableros, más votadas,
                           desempate, participantes, acceso, menús y pestañas)
src/lib/types.ts           Tipos del modelo de datos y de la interfaz Store
src/lib/store/             Datos con la misma interfaz: firebase.ts (Firestore y Auth), demo.ts (localStorage)
                           y accessKey.ts (clave de acceso: correo ficticio + contraseña)
src/lib/model.ts           Recuentos, ranking, desempate, permisos y reglas al salir
src/lib/dates.ts           Utilidades de fechas
src/lib/util.ts            Errores, imágenes, enlaces, textos y plataforma
src/lib/fieldErrors.ts     Avisos de campos con el estilo de la app (en vez de las burbujas del navegador)
src/lib/ics.ts             Añadir al calendario (Google, .ics)
src/lib/push.ts            Avisos push (pendiente de las Cloud Functions)
src/lib/resultImage.ts     Tarjeta de resultados en PNG para compartir
src/lib/canvas.ts          Ayudas de dibujo (fuentes, colores de los tokens, texto recortado) para la tarjeta y el PDF
src/lib/exportData.ts      Exportar: la votación como tabla, el CSV y el libro de Excel (puro, con tests)
src/lib/xlsx.ts            .xlsx mínimo sin librerías (XML dentro de un ZIP sin comprimir)
src/lib/pdf.ts             PDF mínimo sin librerías (una imagen JPEG por página A4)
src/lib/resultPdf.ts       Informe de resultados en PDF, dibujado en canvas
src/lib/exportResults.ts   Genera la exportación elegida y la guarda
src/lib/files.ts           Descargar un archivo (o compartirlo, en la app)
src/lib/theme.ts           Tema claro/oscuro
src/lib/native.ts          Integración con Capacitor (Android)
src/lib/config.ts          Configuración de Firebase
```

## Diferencias con la web original

- Firebase, el generador de QR y el selector de emojis se instalan con npm en vez de cargarse de CDNs.
  Los datos de los emojis van incluidos, así que el selector funciona sin conexión (necesario para Capacitor).
- Firebase se carga aparte (import dinámico): el modo demo no lo descarga.
- `base: "./"` en Vite: la compilación usa rutas relativas y funciona en una subcarpeta o dentro de Capacitor.

## Archivar y salir de una votación

Las acciones sobre la lista están en `state/listActions.ts` (`useListActions`), compartidas por «Mis votaciones»,
el menú lateral y la propia votación.

- Cada usuario puede **archivar** votaciones (campo `archived` en `users/{uid}/polls/{id}`): salen del panel y del
  menú lateral, se ven en la fila «Archivadas» del final de la lista (con fondo lila suave, para no confundirla con
  un grupo) y conservan su grupo. Se pueden desarchivar. Se aplica al momento, con un aviso de **cuenta atrás de 5 s
  y «Deshacer»** (`UndoStack`): así no se pierde nada si se cierra la app durante la cuenta atrás.
- **Salir de la votación** (`leave`) siempre pide confirmación: no se puede deshacer. El aviso (`leaveMessage`) dice
  qué pasará según cómo esté la votación y qué papel tiene en ella: abierta, con desempate abierto, cerrada o con el
  plazo pasado; pendiente de aprobación; creador o administrador; si era la última votación de su grupo; y cómo
  volver. Lo que pasa de verdad lo hace `leavePoll` en el almacén (ver «Administradores y eliminar la cuenta»).
  Una votación que ya no existe solo se quita de la lista (`removeLibraryEntry`). Si era la última votación de un
  grupo (contando las archivadas, `groupToDrop`), el grupo también se borra.
- En el móvil, en «Mis votaciones»: **deslizar →** archiva (o desarchiva en la zona de archivadas) y
  **deslizar ←** sale de la votación. En el ordenador, las mismas acciones están en el botón ⋯ de cada votación.

## Duplicar una votación

- **📋 Duplicar** abre «Nueva votación» con todo copiado y sin votos: nombre con «(copia)», descripción, tipo,
  meses, días o semanas, opciones con sus iconos, configuración de horas, privacidad, acceso, tope de personas y
  grupo. Las fechas ya pasadas se descartan, así que solo hay que elegir las nuevas. Está en el botón ⋯ de cada
  votación de «Mis votaciones» y, para el creador, también en el menú ⋯ de la votación.
- La plantilla viaja en memoria (`src/state/duplicate.ts`) y solo vale para esa navegación: si se recarga la página,
  «Nueva votación» sale en blanco en vez de con una copia vieja.

## Editar una votación

- Menú ⋯ → **Editar votación** (`#/v/<id>/editar`, `src/pages/poll/EditPoll.tsx`): abre la pantalla de «Nueva
  votación» en modo edición (`Create` con `edit`), con la plantilla de `editTemplate` (todo lo que tiene, también lo
  pasado, y los ids de sus opciones para que renombrar una no la convierta en otra).
- Siempre se cambian el nombre y la descripción. Sin desempate, también lo que se vota: se puede añadir, pero no
  quitar nada que tenga votos (`lockedSlots`, `lockedOpts` y `lockedHours`, en rojo suave en el calendario y en las opciones). Antes de
  guardar se comprueba otra vez con los votos de ese momento (`lostVotedUnit` en `model.ts`). Las opciones nuevas
  toman un id que la votación no haya usado nunca.
- No se cambian el tipo (para eso, duplicar), el modo de las horas ni la duración de las franjas; el acceso, el plazo
  y la privacidad tienen su sitio en la propia votación.
- «Cancelar» (a la izquierda de «Guardar cambios») vuelve a la votación sin guardar; si se ha cambiado algo, antes
  pregunta si se descartan los cambios.
- Se guarda solo lo que cambia y cada cambio va al chat como aviso (`sys: true`, frases de `src/lib/changes.ts`),
  que se pinta como una línea centrada con el nombre de quien lo hizo.
- Las reglas dejan cambiar `months`, `slots`, `hours`, `hourStep`, `hoursByDay` y `options` solo a los
  administradores y sin desempate, con la misma forma que al crear (`validShape`). No pueden comprobar los votos
  (habría que leerlos todos), así que «no quitar lo que tiene votos» lo hace la app.

## Votaciones de opciones libres

- Tipo `options`: una lista de 2 a 30 opciones (`MIN_CHOICES`, `MAX_CHOICES`), cada una con nombre (obligatorio,
  sin repetir) y emoji opcional; sin emoji se guarda ⚪ (`DEFAULT_CHOICE_ICON`). Sin meses, días ni horas.
- Se guardan en `options` (`{ id, name, icon }`, ids `c1`, `c2`…) y sus ids son también las casillas (`slots`), con
  la opción única `v`: los votos son `"c1|v"`. Así el recuento, el ranking, el desempate, la imagen del resultado y
  la tabla de participantes funcionan igual que en el resto de tipos. No tienen «Añadir al calendario».
- Se vota en tarjetas (`BoardOptions`), varias a la vez.

## Votaciones de horas

Al crear una votación de horas se alterna entre dos modos:

- **Franjas periódicas**: desde, hasta y cada cuánto (30 min, 1 h o 2 h). Cada casilla es una franja con duración
  (`hours` + `hourStep`).
- **Horas sueltas**: una fila por día elegido, cada una con su propio desplegable (horas de media en media,
  00:00 a 23:30) para añadir las horas de ese día; pueden ser distintas entre días (p. ej. 18:00 y 18:30 un día,
  19:00 otro), hasta 48 por día. Se guardan en `hoursByDay` (día → horas) con `hourList: true` y `hourStep: 0`;
  se votan instantes, sin hora de fin.

En «Opciones de cada día», los nombres sugeridos (Comida, Cena…) son solo un ejemplo en el campo (placeholder):
hay que escribir el nombre. El icono sí se propone, y se puede cambiar.

## Añadir al calendario

Cuando no hay empate en el primer puesto (o ya ha ganado una opción en el desempate), en «Opciones más votadas»
aparece «📅 Añadir al calendario». Hace lo que toca según el dispositivo: en **Android** abre Google Calendar (sin
descargar nada); en **iPhone y iPad** descarga el `.ics`, que abre Calendario; en el **ordenador** es un menú con las
dos opciones («Google Calendar» y «Apple, Outlook y otros (.ics)»). El evento lo monta
`src/lib/ics.ts` sin dependencias: dura lo que la franja (`hourStep`), una hora en las horas sueltas, y ocupa el
día, la semana o el mes completos en los demás tipos. Las horas van sin zona horaria (*flotantes*), igual que las
guarda la app: las 21:00 votadas son las 21:00 de quien abre el evento.

## Quién puede unirse

Al crear una votación se elige el acceso (no se puede cambiar después) y, opcionalmente, un máximo de personas:

- **Cualquiera con el enlace**: como siempre.
- **Con tu aprobación** (`approval: true`): quien abre el enlace entra **pendiente** (`status: "pending"` en su
  voto). Ve el título y un aviso, pero no puede votar ni ver los votos. El creador ve la caja «✋ Solicitudes» y
  acepta (se borra `status`) o rechaza (`status: "rejected"`, se puede readmitir después). Con muchas solicitudes
  (`Requests`, en `pages/poll/Access.tsx`): la caja se pliega en una línea, enseña 5 con «Ver las N», busca por nombre
  desde 10 y acepta o rechaza varias a la vez con casillas («Seleccionar todas» elige las que se ven con la búsqueda;
  rechazar varias pide confirmación). `setPendingStatus` lo guarda en un lote de hasta 450, con el contador de plazas
  ajustado en la misma escritura.
- **Solo estos correos** (`emailsOnly: true`): solo entran las cuentas de Google de la lista. La lista se guarda
  aparte, en `polls/{id}/private/access` (`{ emails }`, en minúsculas), que solo puede leer el creador; así nadie
  ve los correos de los demás. El creador la cambia en ⋯ → «Acceso y plazas».
- **Máximo de personas** (`maxPeople`, contando al creador): si no se indica, el tope es **150** (`MAX_PEOPLE`),
  para que ninguna votación crezca sin límite. `members` cuenta a los que están dentro (aceptados y pendientes;
  los rechazados liberan su plaza). Al entrar por primera vez, el voto y `members + 1` se escriben en el mismo
  lote, y las reglas lo exigen, así que el tope no se puede saltar desde fuera de la app. Quien administra puede subir
  o bajar el máximo en ⋯ → «Acceso y plazas», nunca por debajo de las plazas ocupadas (`minMaxPeople`; también quien
  se fue con sus votos ocupa plaza). Si se escribe menos, el aviso sale bajo el campo al momento, con un enlace a
  «Gestionar participantes» para expulsar antes a alguien; las reglas (`members <= maxPeople`) y el modo demo lo
  rechazan igual, y si entra alguien mientras se edita, el mínimo sube en directo.
- Las votaciones creadas antes de esto no tienen `maxPeople` ni contador y siguen funcionando igual.

En las restringidas (con aprobación o con correos), las reglas solo dejan leer los votos al creador y a los
aceptados; quien está pendiente solo lee su propio documento (`watchVote`). Pendientes y rechazados no cuentan en
recuentos, ranking ni tabla.

**Participantes**: desde 10 (`PEOPLE_FILTER_FROM`) aparecen un buscador (sin tener en cuenta tildes) y los filtros
«Todos · Han votado · Sin votar», y la tabla muestra 10 filas con «Ver los N».

**Avisar a quien falta**: junto al título de «Participantes», el creador tiene «📣 Avisar a quien falta» cuando
queda alguien aceptado sin ningún voto (sin contarse a él). Monta el mensaje («Faltan Ana y Carlos por votar en
«…»» + enlace; en las anónimas, solo cuántos faltan, sin nombres) y lo abre en el menú de compartir del móvil o,
si no existe, en WhatsApp. No hay backend: es un mensaje para pegar en el grupo.
Con un **desempate abierto** el botón sale también en la tarjeta del desempate y cuenta a quien aún no ha elegido en
esa ronda («… por votar en el desempate de «…»»). Con la votación cerrada (o el plazo acabado) y sin desempate abierto
no aparece: ya no queda nada que votar.

En el modo demo, el correo de cada persona es `<nombre>@demo.test` (p. ej. `ana@demo.test`).

## Compartir el resultado

«Compartir resultado» (en las acciones de la votación, solo cuando ya hay votos) dibuja en un `canvas` una tarjeta
cuadrada de 1080×1080 con el título, la línea de datos, las tres opciones más votadas —con la ganadora del desempate
si lo hubo— y el enlace, y la comparte con `navigator.share`; si el navegador no puede compartir ficheros, la
descarga. Los colores salen de los tokens del tema, así que la tarjeta sale en claro o en oscuro según el que esté
puesto, y en las anónimas nunca aparecen nombres. Está en `src/lib/resultImage.ts`, sin dependencias nuevas.

## Exportar resultados

Menú ⋯ → «Exportar resultados» (`pages/poll/ExportDialog.tsx`, administradores). `exportTable` (`lib/exportData.ts`)
convierte la votación en una fila por casilla (también las que no tienen votos, en el orden del calendario) con sus
votos, su puesto, sus votos del desempate y quién la votó, más la lista de participantes con su papel. De ahí salen:

- **CSV** (`toCsv`): con punto y coma y la marca de UTF-8, que es lo que espera Excel en español; una columna por
  persona con «Sí» donde votó. Lo que empieza por `= + - @` lleva un apóstrofo delante para que la hoja de cálculo no
  lo tome por una fórmula (los nombres los escribe cualquiera).
- **Excel** (`toXlsx` con `lib/xlsx.ts`, sin librerías): «Resultados» (clasificación, ganadora resaltada y quién votó),
  «Votos» (matriz con ✓) y «Participantes», con filas y columnas fijas y los colores del tema claro.
- **PDF** (`lib/resultPdf.ts` + `lib/pdf.ts`): se dibuja en `canvas` como la tarjeta del resultado (mismas fuentes y
  emojis, tema claro) y cada página A4 va como JPEG dentro de un PDF escrito a mano. Se carga solo al pedirlo.

En las anónimas solo hay totales, sin nombres. En la web se descarga; en la app se comparte (`saveFile` en
`lib/files.ts`), porque allí las descargas no funcionan. En el plan de pago, el CSV será gratis y el Excel y el PDF,
premium (ver `docs/funcionalidades-y-planes.md`); de momento no hay planes y todo está disponible.

## Plazo para votar

Al crear una votación se puede poner un plazo opcional (paso «¿Hasta cuándo se vota?»): día y, si se quiere, hora.
Se guarda en `deadline` (milisegundos); sin hora, el plazo acaba con ese día (23:59). Mientras queda plazo, la
votación muestra la pastilla «⏳ Se cierra el …»; al pasar, se comporta como cerrada (mismo aviso y mismas casillas
bloqueadas) aunque `closed` siga a false, y el creador puede cerrarla de verdad desde ⋯ o pulsar «Quitar el plazo»
para que se pueda volver a votar (`deadline: 0`). Reabrir una votación cerrada quita también un plazo ya pasado,
para que no quede abierta y sin poder votar.

El plazo lo hacen cumplir **la app y las reglas**: con el plazo pasado (hora del servidor), `votingOpen()` en
`firestore.rules` no deja crear ni cambiar `picks`, igual que con la votación cerrada. El voto del desempate va
aparte y se puede dar aunque el plazo haya pasado. Si el reloj del móvil va atrasado, la app puede dejar pulsar y
las reglas rechazar el voto.

## Se cierra sola (premium)

El servidor (`functions/plan.js`, apagado mientras `config/plan.freeForAll` no sea `false`) pone una cuenta atrás a
las votaciones que sobran a quien las gestiona o que usan funciones de pago sin premium: `autoCloseAt` (cuándo) y
`autoCloseWhy` (por qué). La app solo lo enseña (`autoClose`, `closingLabel` y `autoCloseNote` en `model.ts`): una etiqueta ámbar con lo
que le queda, por días del calendario («Se cierra en 5 días», «Se cierra mañana», «Último día»), en la tarjeta de
«Mis votaciones» y en la cabecera de la votación, con el motivo en el tooltip; y, para quien la gestiona, qué puede
hacer. El servidor cierra al acabar el último día (23:59, hora de España). Si hay un
plazo antes, solo sale el plazo. Las reglas no dejan a la app crear ni cambiar esos campos. Todos los casos, en
`docs/funcionalidades-y-planes.md`, §8 y §9.

## App Check (`lib/appCheck.ts`)

Cada petición a Firebase lleva un justificante de que viene de la app de verdad. En Android, Play Integrity con el
plugin nativo `@capacitor-firebase/app-check` (Firestore va por el SDK web dentro del WebView y recibe el token con
un `CustomProvider`). En la web, reCAPTCHA Enterprise, solo si `appCheckSiteKey` de `config.ts` tiene clave. Se
activa antes de Firestore y Auth; si falla, la app sigue sin justificante. Mientras en la consola de Firebase no se
pulse «Exigir», nada se rechaza: solo se mide cuántas peticiones llegan con y sin justificante.

Para activarlo (consola de Firebase → App Check):

1. **Android**: registrar la app con Play Integrity. Pide la huella SHA-256 del certificado de firma de la app, que
   está en Play Console → Integridad de la app → Firma de apps (la de Google, no la de subida). En Play Console,
   vincular el proyecto de Google Cloud en Integridad de la app → API Play Integrity.
2. **Web**: crear una clave de reCAPTCHA Enterprise (tipo web, dominios `hilemos.web.app` y `localhost`), registrarla
   en App Check y ponerla en `appCheckSiteKey`. Se publica solo la web; no hace falta otra versión de Android.
3. Dejarlo unos días en «solo medir» (App Check → APIs → Cloud Firestore: peticiones verificadas y no verificadas).
   Si casi todas están verificadas, «Exigir».
4. **Versiones de depuración** (adb, Android Studio) y `localhost`: no pasan Play Integrity ni reCAPTCHA. Con
   `localStorage["hilemos-appcheck-debug"] = "1"` (en localhost, siempre) se usa el proveedor de depuración: su token
   sale en logcat o en la consola del navegador y se da de alta en App Check → Gestionar tokens de depuración. El
   modo demo no usa Firebase, así que las pruebas automáticas no lo necesitan.

## Estadísticas de uso (`functions/stats.js`)

Totales anónimos por día (`stats/2026-11-24`) y por mes (`stats/2026-11`, el día 1), calculados cada noche por
`onDaily` a partir de lo que ya está guardado: votaciones creadas (por tipo y por función de pago), personas distintas
que organizan y que votan, votos, entradas, mensajes del chat, denuncias y cuentas nuevas (con y sin registro). Lo
que solo pasa en el dispositivo (exportar en CSV, Excel o PDF, compartir la imagen del resultado y duplicar) lo apunta
la app con `store.track()` en `pings/{id}`, sin quién; `onDaily` lo suma y lo borra. Se mira en la consola de
Firebase (Firestore → `stats`). Qué se mide y para qué: `docs/plan-hasta-premium.md`.

## Versión mínima y aviso para todos (`config/app`)

Lo que se cambia desde la consola de Firebase sin publicar otra versión de la app de Android
(`state/appConfig.ts`, `components/AppNotices.tsx`):

- `minBuild`: versionCode mínimo. Si la app de Android es anterior, enseña solo «Actualizar en Google Play» (por
  ejemplo, cuando unas reglas nuevas dejan de aceptar lo que escribe una versión vieja). En la web no aplica.
- `notice`: `{ id, text, url? }`. Un aviso arriba de la página, para todos y también sin sesión. «Entendido» lo cierra
  en ese dispositivo; para volver a avisar, otro `id`. Sirve para el aviso de 30 días antes de premium o para una
  incidencia. En el modo demo se prueba poniendo `config` en el `localStorage`.

En `firestore.rules`, `ownerUpdate()` acepta `deadline` entre sus claves (como un entero ≥ 0), que es lo que
permite «Quitar el plazo» y reabrir una votación con el plazo pasado.

## Administradores y eliminar la cuenta

- `polls/{id}.admins` (uids): los nombra y los quita solo quien gestiona la votación, con un clic, desde
  «Gestionar participantes» (`pages/poll/ManagePeople.tsx`, menú ⋯). `isAdmin(poll, uid)` en `model.ts` decide quién
  gestiona la votación; eliminarla y los administradores son solo del creador (`isOwner`). En las reglas,
  `isAdminOf()`; un administrador solo puede quitarse a sí mismo de la lista (`leaveAdmins`), y nunca cambia el estado
  del creador. `managedPeople` (`model.ts`) decide qué puede hacer cada uno con cada persona del panel, y `roleOf`, su
  etiqueta («Creador», «Delegado» o «Admin»).
- **Expulsar a alguien**: `setMemberStatus(id, uid, "rejected", { removed: true, dropAdmin })` deja su voto como rechazado
  con `removed: true` (y, si era administrador, le quita de `admins` en la misma escritura); con tope, el contador baja
  1. Se borran sus votos (`picks` y `tb`) en la misma escritura; no entra en el chat y no puede borrar su voto para
  volver a entrar. Ve «Te han expulsado de esta votación» (`WaitingView`, también en las abiertas). Volver a admitirle
  quita `status` y `removed`, pone `joinedAt` a ese momento (el chat se le abre desde ahí) y vuelve sin votos: su
  primer voto avisa a los demás. Las reglas solo dejan borrar los votos de otro al expulsarle o al readmitirle. En las reglas (`ownerSetsStatus`), a otro administrador solo le expulsa el creador, y nadie
  puede quitarse `removed` a sí mismo. Las solicitudes (`Requests`) no muestran a los expulsados: se readmiten desde el panel.
- **Quitar un correo de una privada expulsa a quien lo usó**: cada participante apunta con qué correo entró en
  `polls/{id}/emails/{uid}` (`saveMemberEmail`, una vez por visita en `PollPage`, así que también quien entró antes de
  que existiera al volver a abrirla). Solo lo leen quienes la administran (no va en el voto, que leen todos). En
  «Acceso y plazas», `losingAccess` (`model.ts`) compara la lista guardada con la nueva: quien está dentro con un correo
  que se quita sale avisado bajo el campo y, al guardar, con una confirmación; después se le expulsa (o se rechaza su
  solicitud, si estaba pendiente) con `removeByEmail`. Un administrador que no es el creador no puede quitar el correo de
  otro administrador. Quien entró antes y no ha vuelto a abrirla no se reconoce: se expulsa desde «Gestionar participantes».
- **Moderación del chat**: «Denunciar» en cada mensaje ajeno (`ReportDialog`) guarda `polls/{id}/reports/{msgId}_{uid}`
  con una copia del mensaje; las reglas comprueban que el texto y el autor son los del mensaje de verdad, que no es un
  aviso ni propio, y que no se repite. Quien administra la votación ve la marca «Denunciado» (`watchReports`,
  `reportsByMessage`) y puede ocultar los mensajes denunciados (`setMessageHidden`, campo `hidden`; el botón solo sale en
  lo denunciado y en lo ya oculto, para volver a mostrarlo): los demás ven «Mensaje ocultado por quien administra la
  votación». Con ratón se denuncia con la bandera de cada mensaje; en el móvil (sin ratón, `hasMouse`), manteniendo
  pulsado el mensaje (550 ms, se cancela si el dedo se mueve) y la bandera solo sale, en rojo, en lo que ya has
  denunciado (`watchMyReports`, también en el perfil de una persona: «Ya le has denunciado»). La Cloud Function `onReport` avisa a quien modera Hilemos según
  `config/moderation` (solo la lee el servidor): `uids` para avisos push y `email` + `brevoKey` para un correo con
  la denuncia. Sin configurar, la denuncia se queda guardada y se ve en la consola de Firebase. Los correos llevan el
  asunto «[Hilemos] Denuncia en «…»», para filtrarlos en Gmail.
- **Perfil de un participante y denunciar a una persona**: en «Participantes», el nombre abre `PersonDialog` (foto,
  papel, desde cuándo está, si ha votado y las «Votaciones en común»: de las 40 más recientes de tu lista, en cuáles
  está también, con `sharedPolls`, una lectura por votación y guardado mientras dura la pantalla) y el resto de la
  fila (la flecha, los números o el hueco) despliega sus votos. Desde el perfil se denuncia
  a la persona (`ReportDialog`, el mismo que el de mensajes) en `polls/{id}/personReports/{targetUid}_{uid}`, con una
  copia de su nombre y su foto; las reglas comprueban que son los de su voto, que sigue en la votación (sin `gone`) y
  que no es uno mismo. Quien administra ve la bandera junto al nombre y las denuncias en su perfil
  (`watchPersonReports`, `reportsByPerson`); la Cloud Function `onPersonReport` avisa a quien modera como `onReport`.
- **Descargar mis datos** («Tu perfil», RGPD): `exportMyData` junta en un JSON (`MyData`) la cuenta, el perfil, los
  grupos, los dispositivos con avisos (sin el token) y, por cada votación de su lista, lo que la describe
  (`pollForExport`, sin uids de los demás), su voto, el correo con el que entró, sus mensajes (pedidos «desde» que
  entró, como al salir) y las denuncias que hizo (las reglas dejan leer a cada uno las suyas con `where by == uid`).
  Se guarda con `saveFile`: en la app, con el menú de compartir.
- `leave()` en `store/firebase.ts` (usada por `leavePoll` y `deleteAccount`; `demo.ts` hace lo mismo), sin servidor:
  saca un nombre sin dueño (`ghostName()`, uno por votación) y renombra con él sus mensajes del chat (las reglas dejan
  cambiar solo el nombre de los mensajes propios, y solo a quien sigue dentro: por eso va lo primero). Si era el
  creador, pasa `ownerUid` a un administrador o participante aceptado al azar (`pickHeir`; las reglas exigen que
  tenga voto, sin estado y sin `gone`) y apunta el creador original en `founder`/`founderName` (una sola vez), o
  borra la votación si no queda nadie (su chat no se puede borrar desde la app y se queda); si era administrador, se
  quita de `admins`. Sus votos: `keepsVotesOnLeave` (`model.ts`) decide si se quedan (cerrada o plazo pasado, sin
  desempate abierto: con el nombre sin dueño, sin foto y `gone`) o se borran (con tope, junto con `members - 1`).
- `TiebreakGuard` (`pages/poll/Tiebreak.tsx`) ajusta el desempate al abrir la votación un administrador
  (`tiebreakShift` en `model.ts` dice si el empate ya no es el del desempate) y, en la misma escritura, deja
  `tbNote` para que todos sepan qué ha pasado: `TiebreakSolvedNote` (se quitó el desempate) o el aviso de
  `TiebreakCard` (sigue entre menos opciones).
  Antes de que se guarde, cada dispositivo ya lo muestra ajustado (`withTiebreakAdjusted` en `model.ts`, con el
  mismo aviso): los votos del desempate a las opciones que siguen valen igual, porque ya estaban en él. Las acciones de los
  administradores que cambian el desempate (reabrir, abrir otro, repetir, anular) quitan `tbNote`; en las reglas,
  `tbNote` solo lo escriben administradores y con esa forma.
- En «Participantes», quien tiene `gone` va aparte en «Se fueron» (`GonePeople`, plegado y en gris): sus votos cuentan
  en los totales, pero la cabecera, la pestaña y la imagen de resultados solo cuentan a quien sigue.
- Volver: al abrir otra vez la votación, `joinPoll` le quita `gone` y pone su nombre y su foto en el voto. El chat
  muestra a quien sigue en la votación (`isPresent`) con el nombre de su voto, y a quien se fue, con el nombre
  guardado en el mensaje (el sin dueño): así sus mensajes recuperan su nombre al volver, sin reescribirlos. «Creada
  por» hace lo mismo con `founder`.
- `deleteAccount` (`store/firebase.ts`): `leave()` en cada votación de su lista y después borra su lista, grupos,
  dispositivos de avisos y perfil, y la cuenta.
- `prepareDeleteAccount`: Firebase solo deja borrar una cuenta si se entró hace poco. Con Google se vuelve a pedir
  (ventana de Google); sin registro se intenta igual; con correo o clave, si hace más de 4 minutos, se pide salir y
  volver a entrar.

## Entrar con un enlace al correo

En la pantalla de entrada, «Entrar con tu correo» manda un enlace (Firebase, `sendSignInLinkToEmail`, sin servidor ni
contraseña; el correo lo envía Firebase con su plantilla y en castellano). Requiere activar en Firebase
**Correo electrónico/contraseña › Vínculo de correo electrónico (acceso sin contraseña)**.

- El enlace vuelve a la misma pantalla con `?correo=1` y `EmailLinkFinish` (montado en `App.tsx`) completa la entrada.
  Si se abre en otro dispositivo, pide confirmar el correo. El nombre de las cuentas nuevas lo pide `NameDialog`
  (en `Shell`) ya dentro de la app, y vuelve a salir hasta que se ponga aunque se cierre la página a medias.
- Con una cuenta sin registro abierta (también desde «Tu perfil → Tu cuenta»), el enlace **guarda esa cuenta en el
  correo** (`linkWithCredential`, mismo uid) y quita la clave de acceso. Hay que abrirlo en el mismo dispositivo.
  Si el correo ya tiene su propia cuenta, se avisa y, si se había quitado la clave, se le da una nueva.
- La cuenta queda con el correo verificado, así que también puede entrar en las votaciones «solo estos correos».
- En la app de Android, si el enlace la abre, `appUrlOpen` lo pasa a `EmailLinkFinish` (evento `hilemos-email-link`).

## Entrar sin cuenta y clave de acceso

Cualquiera puede usar la app sin registrarse, llegue desde un enlace o desde la portada: en la pantalla de entrada
escribe su nombre, lee que se le dará una **clave de acceso** y pulsa «Continuar sin cuenta» (sesión anónima de
Firebase, `signInAnonymously`). Requiere los métodos **Anónimo** y **Correo electrónico/contraseña** activados en
Firebase Authentication.

- Internamente se le identifica por su uid (el nombre es solo lo que ven los demás y lo puede cambiar en «Tu perfil»).
  Firebase guarda la sesión en el navegador o en la app, así que al volver a abrir sigue dentro con el mismo uid:
  sus votaciones están en `users/{uid}/polls` y sus votos en `polls/{id}/votes/{uid}`, igual que con Google.
- **Clave de acceso** (`createAccessKey` / `signInWithKey` en `src/lib/store/firebase.ts`, con la clave de `accessKey.ts`; sin servidor): al entrar se genera
  una clave aleatoria de 20 caracteres (`7KQ2-M9XF-4TBD-HR8P-W3NC`, sin 0/O ni 1/I/L) y se vincula al uid como una
  cuenta interna de correo y contraseña: los 8 primeros caracteres forman un correo ficticio
  (`7kq2m9xf@clave.hilemos.web.app`, que no recibe nada) y los 12 últimos son la contraseña, que Firebase guarda
  cifrada. El diálogo `AccessKeyDialog` la enseña una sola vez (copiar o compartir) y no se cierra hasta marcar
  «La he guardado». Con «¿Ya tienes una clave de acceso?» se vuelve a la misma cuenta en cualquier dispositivo
  (mayúsculas, minúsculas y guiones dan igual). Firebase bloquea un rato a quien falla muchas veces.
- En «Tu perfil → Tu cuenta» puede **crear una clave nueva** (se quita la cuenta interna anterior, así que la clave
  vieja deja de valer) o **guardar la cuenta en Google** (`linkWithPopup`): conserva el uid y se quita la clave,
  que ya no hace falta. Si esa cuenta de Google ya se usó en la app, Firebase lo rechaza y la app lo explica.
- Sin la clave (o Google), si borra los datos, desinstala o cambia de dispositivo, pierde su lista de votaciones y
  ya no puede cambiar su voto (seguirá contado, con su nombre). «Salir» lo recuerda antes de cerrar la sesión.
- Las votaciones **con aprobación** y **solo estos correos** siguen necesitando Google: el creador tiene que poder
  identificar a cada persona. Las reglas lo impiden (`anon()`, que reconoce la sesión anónima y los correos de
  `@clave.hilemos.web.app`) y la app lo explica en vez de dar un error.
- Quien entra sin cuenta **también puede crear** votaciones. «Nueva votación» le avisa de que solo podrá
  gestionarlas desde esa cuenta.
- Si una votación restringida le pide Google, primero se intenta guardar la sesión en esa cuenta (conserva todo) y,
  si la cuenta ya existía, se entra con ella.
- Contra el abuso con bots: Firebase limita las altas por IP (Authentication › Configuración › Cuota de registro).
  La protección de verdad es **App Check** (reCAPTCHA Enterprise en la web y Play Integrity en Android) aplicado a
  Authentication y Firestore; está pendiente de configurar en la consola.

## Pestañas bajo el calendario

Para que la pantalla de una votación no se haga eterna, el calendario queda siempre arriba y debajo hay tres
pestañas: «Más votadas» (la que sale al entrar), «Participantes» (con su número) y «Chat» (con los
mensajes sin leer). Las tres
siguen montadas aunque no se vean, así que el chat no pierde lo que estabas escribiendo al cambiar de pestaña. Se
puede cambiar con las flechas ← → del teclado.

## Chat de la votación

En la pestaña «💬 Chat» se habla con el grupo en vivo, sin irse a WhatsApp. Cada mensaje es
un documento de `polls/{id}/chat/{msgId}` con `{ uid, name, text, at }`; la foto no se guarda, sale del voto del
autor. Se traen solo los últimos 200 (`CHAT_LIMIT`) y cada mensaje admite 500 caracteres (`MAX_CHAT`).

- Escriben y leen el creador y los participantes aceptados, también quien entró sin cuenta en una votación
  abierta; pendientes y rechazados no. Lo exigen las reglas (`chatMember()`).
- Se puede seguir hablando con la votación cerrada o con el plazo pasado: es cuando se remata el plan.
- En las votaciones anónimas el chat sí lleva nombres (el anonimato es de los votos) y la sección lo avisa.
- Los mensajes no se editan ni se borran: las reglas no tienen `update` ni `delete`.
- **No leídos**: el icono 💬 de la pestaña lleva un globo con los mensajes de los demás que aún no has visto, y
  desaparece al abrir la pestaña. «Visto hasta» se guarda como `chatSeenAt` en tu biblioteca
  (`users/{uid}/polls/{id}`), así que lo que leas en el móvil también cuenta como leído en el ordenador.
- Al eliminar una votación, sus mensajes quedan huérfanos e inaccesibles, igual que ya pasa con los votos.

## Avisos (notificaciones)

Están programados pero **apagados**: la app no los ofrece mientras `fcmVapidKey` (en `src/lib/config.ts`) esté
vacía, y nada los manda hasta desplegar las Cloud Functions de `functions/`.

Qué avisa y a quién (cada persona puede apagar cada tipo en «Tu perfil → Preferencias → Avisos»):

- **A todos los que están en la votación (y al creador), menos a quien vota**: alguien vota por primera vez (no en
  cada cambio, que sería un aviso por clic). Si le expulsaron y le readmitieron, cuenta otra vez su primer voto
  desde que volvió.
- **Al creador**: alguien pide entrar en una votación con aprobación.
- **A quien pidió entrar**: le han aceptado.
- **A los participantes**: la votación se cierra o se reabre, se abre un desempate, el desempate termina («Ya hay
  resultado definitivo» si tiene ganadora) y se acaba el plazo para votar.

Piezas: `public/firebase-messaging-sw.js` (pinta el aviso en el navegador; no carga el SDK porque las functions le
mandan mensajes solo de datos), `src/lib/push.ts` (permiso y token, en la web y en Android), los tokens en
`users/{uid}/tokens/{token}` (con `platform: "android"` los de la app) y las preferencias en `users/{uid}.notify`.

**App de Android**: usa el plugin `@capacitor/push-notifications` (el WebView no tiene avisos web). Ya está
instalado y configurado: `google-services.json`, el icono pequeño `res/drawable/ic_stat_hilemos.xml`, el color y el
canal «avisos» en el `AndroidManifest.xml` (la app crea el canal al activarlos). A los tokens de Android las functions
les mandan el aviso con bloque `notification`, para que Android lo pinte aunque la app esté cerrada; al pulsarlo se
abre la votación (`initNativePushTaps`). Android 13+ pide permiso al activarlos. Se encienden a la vez que en la web,
con `fcmVapidKey`, así que hay que generar una versión nueva de la app (`npm run android`) después de rellenarla. Las reglas actuales de `users/{uid}/{document=**}` ya cubren las dos cosas: **no hay que tocar
`firestore.rules`**.

Para activarlos:

1. **Plan Blaze** en Firebase (consola → ⚙️ → Uso y facturación). Cloud Functions lo exige aunque el consumo de esta
   app quede dentro del tramo gratuito (2 millones de invocaciones al mes). Pon una alerta de presupuesto.
2. **Clave VAPID**: consola → ⚙️ Configuración del proyecto → Cloud Messaging → *Certificados push web* →
   «Generar par de claves». Copia la clave pública en `fcmVapidKey` de `src/lib/config.ts` y publica la app
   (`npm run deploy`).
3. **Desplegar las functions**, desde la raíz del repo:
   ```bash
   cd functions && npm install && cd ..
   app/node_modules/.bin/firebase deploy --only functions --project votaciones-9bc95
   ```
   Hay tres programadas, que usan Cloud Scheduler (se activa solo al desplegarlas; gratis hasta 3 tareas por cuenta
   de facturación, así que no caben más sin pagar unos céntimos al mes): `onDeadline` (aviso de fin del plazo, cada
   15 minutos), `onAutoClose` (cierra las votaciones con la cuenta atrás cumplida, cada hora) y `onDaily` (cada día a
   las 4:00: pone o quita las cuentas atrás y calcula las estadísticas del día anterior, `functions/stats.js`). Con
   `config/plan.freeForAll` sin poner a `false`, las de premium solo quitan cuentas atrás.
   Las estadísticas usan consultas de grupo de colecciones (`votes`, `chat`, `reports`, `personReports` por fecha):
   sus índices están en `firestore.indexes.json` y se publican con `firebase deploy --only firestore:indexes`.
   Para probar las functions y las reglas en local: `firebase emulators:exec --only auth,firestore,functions
   --project demo-hilemos "<script>"` (el emulador necesita Java 11 o más; vale el de Android Studio) y
   `cd functions && npm test` para la lógica de `plan.js`, `stats.js` y `time.js`.
4. **App de Android**: con la clave ya en `config.ts`, `npm run android` y subir la versión nueva.
5. Cada persona los activa en su dispositivo desde «Tu perfil → Preferencias → Avisos».

Qué es gratis con Blaze (cuotas de cada mes): los envíos de Firebase Cloud Messaging, sin límite; Cloud Functions,
2 millones de invocaciones y su tiempo de cálculo; Cloud Scheduler, 3 tareas; Artifact Registry (donde se guardan las
functions desplegadas), 0,5 GB. Las lecturas que hacen las functions cuentan en el margen diario de Firestore (50.000
lecturas). `onVoteWritten` no lee nada salvo cuando hay que avisar, porque salta con cada casilla que se pulsa.

**iPhone y iPad**: los avisos web solo existen si la web está **añadida a la pantalla de inicio** (Safari →
Compartir → «Añadir a pantalla de inicio», iOS 16.4 o posterior) y se abre desde ese icono. Desde una pestaña de
Safari no se pueden activar; la pantalla de perfil lo explica. Para eso existe `public/manifest.webmanifest`. Los
iconos (SVG y PNG, normales y adaptables, más el `apple-touch-icon` de 180×180) están descritos en
[`design-system/README.md`](design-system/README.md#iconografía).

Con la app abierta, el navegador no pinta el aviso: llega como aviso flotante dentro de la app.

## Eficiencia en Firestore

Firestore cobra por documento leído y no puede unir colecciones en una consulta, así que el modelo está pensado
para leer lo mínimo:

- **Nombre y miniatura copiados en cada voto** (`polls/{id}/votes/{uid}`): abrir una votación no lee el perfil de
  cada participante. Al cambiar el perfil se actualiza la copia en las votaciones del menú del usuario (pocas
  escrituras, y es algo raro). En el voto va una miniatura de 64 px (`thumb`), no la imagen de perfil completa.
- **Caché local (IndexedDB)**: al volver a una votación en menos de 30 min solo se cobran los documentos cambiados.
- **"Mis votaciones"** lee cada votación una vez por sesión (`pollCache`); la pantalla de la votación la mantiene al día.
- **Abrir una votación no escribe nada** en el menú del usuario, salvo la primera vez o si cambia su título.
- **Borrar una votación** se hace en lotes (`writeBatch`).

Límite conocido: si alguien quita una votación de su menú y luego cambia su nombre, en esa votación seguirá el anterior.

## App de Android (Capacitor)

La carpeta `android/` es el proyecto de Android Studio que genera Capacitor. La app es esta misma web
compilada (`dist/`) dentro de un WebView, así que cualquier cambio en `src/` llega a la app al volver a
compilarla con `npm run android` y subir una versión nueva a Google Play.

- **Identificador**: `app.hilemos` (en [`capacitor.config.ts`](capacitor.config.ts)). No se puede cambiar
  una vez publicada en Google Play.
- **Qué cambia dentro de la app** (todo en [`src/lib/native.ts`](src/lib/native.ts); en el navegador no hace nada):
  - Login con Google nativo con `@capacitor-firebase/authentication` (en el WebView no hay ventanas emergentes):
    se elige la cuenta del móvil y la sesión la lleva el SDK web de Firebase, como en la web (`skipNativeAuth`).
  - La página se sirve desde `https://localhost`, así que los enlaces que se comparten (`pollUrl`, la tarjeta
    del resultado, el `.ics`) usan la web pública, `https://hilemos.web.app`.
  - Compartir abre el menú del sistema (`@capacitor/share`); el QR y la tarjeta del resultado se comparten en
    vez de descargarse, porque el WebView no descarga archivos.
  - El botón Atrás de Android cierra primero el diálogo abierto.
  - Los avisos web no existen en el WebView: el perfil los muestra como no disponibles.
- **Firebase**: la app está dada de alta como «Hilemos» (Android). Su configuración es
  `android/app/google-services.json`, pública como la de la web. El login con Google solo funciona con las
  claves de firma cuya huella SHA-1 esté en *Configuración del proyecto > Tus apps > Hilemos*; ahora está la
  clave de pruebas de este ordenador (`~/.android/debug.keystore`). Para añadir otra:
  `npx firebase apps:android:sha:create 1:1092387940683:android:5b56f82b080e66f632a0ce <SHA-1>` y volver a
  descargar el `google-services.json` (`npx firebase apps:sdkconfig ANDROID <ese id> -o android/app/google-services.json`).
- **Iconos y pantalla de arranque**: `npm run android:assets` (`scripts/android-icons.mjs`) los genera a partir de
  `design-system/logo/logo-recraft-original.svg`: las imágenes de `assets/`, los PNG de cada densidad (con
  capacitor-assets) y el icono adaptativo con el calendario en vectorial (`drawable/ic_launcher_logo.xml`), que es
  también el de la pantalla de arranque de Android 12+ (`styles.xml`).
- **Bordes de la pantalla**: la app se dibuja de borde a borde. La página respeta la barra de estado y los botones de
  Android con `--safe-top`/`--safe-bottom` (`src/styles/base.css`), y en el móvil la barra superior se queda pegada
  bajo una franja del fondo de la página. Abajo hay otra franja igual tras la barra de botones (`--nav-bar`); con la
  navegación por gestos mide 0 y la página llega al borde.
- **Plugins de Capacitor**: nunca devolver un plugin desde una función `async` ni resolver una promesa con él (al
  mirar si tiene `.then()` lo toma por un método nativo y falla en silencio). Se importa el módulo y se usa
  `(await import("…")).Plugin.metodo()`.

### Recomendar la app desde la web

«Hilemos en tu móvil» (`components/InstallDialog.tsx`, lógica en `lib/install.ts`) explica las dos formas de tenerla
como app: en Android, Google Play (con `PLAY_PUBLISHED = true` cuando esté publicada; hasta entonces, instalar la web
desde Chrome, con su botón propio si el navegador lanza `beforeinstallprompt`), y en iPhone, «Añadir a pantalla de
inicio» desde Safari (no hay app de la App Store). La del móvil que se usa va primero y resaltada. Se abre sola al
entrar desde el navegador de un móvil, si no hay otra ventana abierta; «Ahora no» la aplaza 30 días. Nunca dentro de la
app ni en la web ya instalada, y en el ordenador solo desde «Tu perfil» → «Cómo instalarla».

### Probarla en un móvil

1. Instalar [Android Studio](https://developer.android.com/studio) (trae el JDK y el SDK de Android).
2. `npm run android` y `npm run android:open`.
3. En el móvil, activar las *Opciones de desarrollador* y la *Depuración USB*, conectarlo y pulsar ▶ en Android Studio.

### Publicarla en Google Play

1. Cuenta de [Google Play Console](https://play.google.com/console) (25 $, pago único). Si es una cuenta
   personal nueva, Google exige una prueba cerrada con al menos 12 personas durante 14 días antes de publicar.
2. Subir `versionCode` (y `versionName`) en `android/app/build.gradle` en cada versión nueva.
3. Android Studio: *Build > Generate Signed App Bundle* crea la clave de subida (`.jks`, **guardarla con su
   contraseña fuera del repositorio**: sin ella no se pueden subir actualizaciones) y el `.aab`.
4. Con la firma de apps de Google Play, Google vuelve a firmar la app con sus claves: añadir en Firebase las huellas
   SHA-1 y SHA-256 de **todas** (clásica, poscuántica y la tercera que sale en «Copiar todas las huellas») y las de la
   clave de subida (*Play Console > escudo «Protegida con Play» > Protección de Play Store > Firma de apps*); si no, el
   login con Google falla en la app descargada de la tienda. Añadidas el 25 de noviembre de 2026.
5. Enlaces que abren la app: `public/.well-known/assetlinks.json`, con las SHA-256 de las claves de Google Play, la de
   subida y la de depuración. El que genera Firebase Hosting solo no se actualizaba al añadir huellas; por eso
   `firebase.json` ya no ignora las carpetas que empiezan por punto. Si cambia una clave, hay que añadirla ahí y
   publicar. Si falta la huella, los enlaces se abren en el navegador.
6. Ficha de la tienda: icono de 512 px (`design-system/logo/play-store-512.png`), imagen destacada de 1024×500,
   capturas, política de privacidad y la forma de pedir que se borre la cuenta.
