# Votaciones 2.0 (React + Vite + TypeScript)

Migración de la web de la carpeta raíz a React, como paso previo a la app móvil con Capacitor.
Hace lo mismo que la primera versión (sin React, ya retirada), con el mismo diseño,
los mismos datos de Firebase y las mismas rutas (`#/`, `#/nueva`, `#/perfil`, `#/v/<id>`), así que los
enlaces ya compartidos siguen funcionando.

Se publica en una sola dirección, <https://votaciones-9bc95.web.app>, con `npm run deploy`.

El diseño (color, tipografía, espaciado, estados…) está documentado en [`design-system/README.md`](design-system/README.md),
con los valores exactos en [`design-system/tokens.json`](design-system/tokens.json); la fuente real de verdad
del código es [`src/styles.css`](src/styles.css).

## Comandos

```bash
cd app
npm install          # la primera vez
npm run dev          # servidor de desarrollo: http://localhost:5173/?demo
npm run typecheck    # comprobar tipos
npm run build        # compila a dist/ (comprueba tipos antes)
npm run preview      # sirve dist/ para probar la versión compilada
npm run android      # compila y copia la web al proyecto de Android (ver «App de Android»)
npm run android:open # abre el proyecto en Android Studio
```

Con `?demo` en la URL funciona sin Firebase (datos en `localStorage`; cada pestaña puede ser una persona distinta).

## Estructura

```
index.html                 Contenedor (fuentes y tema antes de pintar)
src/main.tsx               Arranque de React
src/App.tsx                Almacén de datos, sesión y elección entre login y app
src/styles.css             Estilos
src/state/ui.tsx           Avisos, confirmaciones, compartir y selector de emojis (contexto)
src/state/session.tsx      Usuario, colección (votaciones y grupos) y filtros (contexto)
src/state/route.ts         Rutas con #
src/components/            Shell (barra y menú), Sidebar, Gate (login), diálogos, Avatar, Chat, EmojiPanel…
src/pages/                 Home, Create, Poll, Profile
src/lib/types.ts           Tipos del modelo de datos y de la interfaz Store
src/lib/store.ts           Datos: Firebase o modo demo (misma interfaz)
src/lib/model.ts           Recuentos, ranking y desempate
src/lib/dates.ts           Utilidades de fechas
src/lib/util.ts            Errores, imágenes, grupos y enlaces
src/lib/resultImage.ts     Tarjeta de resultados en PNG para compartir
src/lib/theme.ts           Tema claro/oscuro
src/lib/config.ts          Configuración de Firebase
```

## Diferencias con la web original

- Firebase, el generador de QR y el selector de emojis se instalan con npm en vez de cargarse de CDNs.
  Los datos de los emojis van incluidos, así que el selector funciona sin conexión (necesario para Capacitor).
- Firebase se carga aparte (import dinámico): el modo demo no lo descarga.
- `base: "./"` en Vite: la compilación usa rutas relativas y funciona en una subcarpeta o dentro de Capacitor.

## Archivar y eliminar de la lista

- Cada usuario puede **archivar** votaciones (campo `archived` en `users/{uid}/polls/{id}`): salen del panel y del
  menú lateral, se ven en el filtro «📦 Archivadas» y conservan su grupo. Se pueden desarchivar.
- **Eliminar de la lista** quita la votación del menú del usuario (no la borra para los demás; se puede volver con
  el enlace). La primera vez sale un aviso con la casilla «No volver a mostrar», que se guarda en el perfil
  (`hideRemoveWarning`). Si era la última votación de un grupo (contando las archivadas), el grupo también se borra.
- En el móvil, en «Mis votaciones»: **deslizar →** archiva (o desarchiva en la zona de archivadas) y
  **deslizar ←** elimina de la lista. En el ordenador, las mismas acciones están en el botón ⋯ de cada votación.
- Las acciones se aplican al momento y muestran un aviso con **cuenta atrás de 5 s y «Deshacer»**, que las revierte
  (incluido el grupo borrado). Así no se pierden si se cierra la app durante la cuenta atrás.

## Duplicar una votación

- **📋 Duplicar** abre «Nueva votación» con todo copiado y sin votos: nombre con «(copia)», descripción, tipo,
  meses, días o semanas, opciones con sus iconos, configuración de horas, privacidad, acceso, tope de personas y
  grupo. Las fechas ya pasadas se descartan, así que solo hay que elegir las nuevas. Está en el botón ⋯ de cada
  votación de «Mis votaciones» y, para el creador, también en el menú ⋯ de la votación.
- La plantilla viaja en memoria (`src/state/duplicate.ts`) y solo vale para esa navegación: si se recarga la página,
  «Nueva votación» sale en blanco en vez de con una copia vieja.

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
  acepta (se borra `status`) o rechaza (`status: "rejected"`, se puede readmitir después).
- **Solo estos correos** (`emailsOnly: true`): solo entran las cuentas de Google de la lista. La lista se guarda
  aparte, en `polls/{id}/private/access` (`{ emails }`, en minúsculas), que solo puede leer el creador; así nadie
  ve los correos de los demás. El creador la cambia en ⋯ → «Acceso y plazas».
- **Máximo de personas** (`maxPeople`, contando al creador): si no se indica, el tope es **150** (`MAX_PEOPLE`),
  para que ninguna votación crezca sin límite. `members` cuenta a los que están dentro (aceptados y pendientes;
  los rechazados liberan su plaza). Al entrar por primera vez, el voto y `members + 1` se escriben en el mismo
  lote, y las reglas lo exigen, así que el tope no se puede saltar desde fuera de la app. El creador puede subir o
  bajar el máximo (nunca por debajo de los que ya están) en ⋯ → «Acceso y plazas».
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

## Plazo para votar

Al crear una votación se puede poner un plazo opcional (paso «¿Hasta cuándo se vota?»): día y, si se quiere, hora.
Se guarda en `deadline` (milisegundos); sin hora, el plazo acaba con ese día (23:59). Mientras queda plazo, la
votación muestra la pastilla «⏳ Se cierra el …»; al pasar, se comporta como cerrada (mismo aviso y mismas casillas
bloqueadas) aunque `closed` siga a false, y el creador puede cerrarla de verdad desde ⋯ o pulsar «Quitar el plazo»
para que se pueda volver a votar (`deadline: 0`). Reabrir una votación cerrada quita también un plazo ya pasado,
para que no quede abierta y sin poder votar.

*Ojo*: igual que el anonimato, el plazo lo hace cumplir **la app, no el servidor**. No hay Cloud Functions y las
reglas de Firestore no comprueban `deadline`, así que solo las reglas de `closed` impiden escribir votos desde
fuera de la app.

En `firestore.rules`, `ownerUpdate()` acepta `deadline` entre sus claves (como un entero ≥ 0), que es lo que
permite «Quitar el plazo» y reabrir una votación con el plazo pasado.

## Entrar sin cuenta

Cualquiera puede usar la app sin registrarse, llegue desde un enlace o desde la portada: en la pantalla de entrada
escribe su nombre y pulsa «Entrar sin cuenta» (sesión anónima de Firebase, `signInAnonymously`). El nombre se guarda en la
sesión y en su perfil, así que aguanta una recarga. Requiere activar el método **Anónimo** en Firebase
Authentication; si no está activado, la pantalla lo dice.

- Internamente se le identifica por el uid de la sesión anónima (el nombre es solo lo que ven los demás y lo puede
  cambiar en «Tu perfil», como cualquiera). Firebase guarda la sesión en el navegador (o en la app), así que al volver
  a abrir sigue dentro con el mismo uid: sus votaciones están en `users/{uid}/polls` y sus votos en
  `polls/{id}/votes/{uid}`, igual que con Google.
- La sesión anónima vive en ese navegador: si borra los datos o cambia de dispositivo, pierde su lista de
  votaciones y ya no puede cambiar su voto (seguirá contado, con su nombre). Si la votación tiene tope, su plaza
  sigue ocupada.
- En «Tu perfil → Tu cuenta» puede pasar la sesión a su cuenta de Google (`linkWithPopup`): conserva el uid, así
  que no pierde votos ni votaciones. Si esa cuenta ya se usó en la app, Firebase lo rechaza y la app lo explica.
- Las votaciones **con aprobación** y **solo estos correos** siguen necesitando Google: el creador tiene que poder
  identificar a cada persona. Las reglas lo impiden (`anon()`) y la app lo explica en vez de dar un error.
- Quien entra sin cuenta **también puede crear** votaciones. La pantalla «Nueva votación» le avisa de que solo podrá
  gestionarlas desde ese dispositivo y le sugiere guardar la cuenta en Google.
- «Salir» sin cuenta pide confirmación: después no se puede volver a entrar como ese usuario.
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

- **Al creador**: alguien vota por primera vez (no en cada cambio, que sería un aviso por clic) y alguien pide entrar
  en una votación con aprobación.
- **A quien pidió entrar**: le han aceptado.
- **A los participantes**: la votación se cierra o se reabre, se abre un desempate, el desempate ya tiene ganadora y
  se acaba el plazo para votar.

Piezas: `public/firebase-messaging-sw.js` (pinta el aviso; no carga el SDK porque las functions mandan mensajes solo
de datos), `src/lib/push.ts` (permiso y token), los tokens en `users/{uid}/tokens/{token}` y las preferencias en
`users/{uid}.notify`. Las reglas actuales de `users/{uid}/{document=**}` ya cubren las dos cosas: **no hay que tocar
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
   La del plazo (`onDeadline`) es programada: usa Cloud Scheduler, que se activa solo al desplegarla (gratis hasta
   3 tareas por cuenta de facturación). Si no la quieres, bórrala de `functions/index.js` antes de desplegar.
4. Cada persona los activa en su dispositivo desde «Tu perfil → Preferencias → Avisos».

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
    del resultado, el `.ics`) usan la web pública, `https://votaciones-9bc95.web.app`.
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
- **Iconos y pantalla de arranque**: salen de `assets/` (generados a partir de `public/icon.svg`) con
  `npm run android:assets`.

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
4. Con la firma de apps de Google Play, Google vuelve a firmar la app con su propia clave: añadir en Firebase las
   huellas SHA-1 de la clave de subida y de la de Google Play (*Play Console > Prueba y publica > Integridad de
   la app*); si no, el login con Google falla en la app descargada de la tienda.
5. Enlaces que abren la app: publicar `public/.well-known/assetlinks.json` con la huella SHA-256 de la clave de
   Google Play (la Play Console da el archivo hecho). El filtro ya está en `android/app/src/main/AndroidManifest.xml`;
   mientras no exista el archivo, los enlaces se abren en el navegador.
6. Ficha de la tienda: icono de 512 px (`design-system/logo/play-store-512.png`), imagen destacada de 1024×500,
   capturas, política de privacidad y la forma de pedir que se borre la cuenta.
