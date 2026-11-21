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

## Qué se puede hacer

- **Crear votaciones** con:
  1. Nombre (y descripción opcional).
  2. Tipo: **horas**, **días**, **semanas** o **meses**.
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
  esté abierto). El creador lo finaliza, puede repetirlo entre las que sigan empatadas o anularlo; la ganadora se
  marca en el ranking. Reabrir la votación principal anula el desempate.
- **Votos visibles o anónimos** (se elige al crearla). Con votos visibles, en la tabla de participantes se pulsa
  un nombre para ver qué ha votado esa persona, y en "opciones más votadas" se puede desplegar quién las votó.
  En las anónimas solo se ven los totales y si cada persona ha votado. El creador puede hacer anónima una votación
  visible, pero no al revés.
  *Ojo*: el anonimato es de la interfaz. Los votos se guardan en documentos que cualquier participante puede leer
  (la app los necesita para el recuento), así que alguien con conocimientos técnicos podría consultarlos.
- El creador puede **cerrar/reabrir** la votación (cerrada ya no admite cambios) y **eliminarla**;
  cerrar y eliminar piden confirmación.
- **Administradores**: en «Participantes», el creador puede nombrar administradores («Hacer admin») y quitarlos.
  Gestionan la votación como él (cerrar y reabrir, desempates, solicitudes, acceso y plazo), pero no pueden
  eliminarla ni nombrar a otros administradores. Llevan la etiqueta «Admin» (y el creador, «Creador»).
- **Salir de la votación** (al final de cada una) y **eliminar la cuenta** siguen la misma regla con sus votos: si la
  votación está abierta o con un desempate abierto, se borran y su plaza queda libre; si ya está cerrada (o con el
  plazo pasado), se quedan con un nombre sin dueño. Si se iba durante un desempate, el primer administrador que abre
  la votación lo recalcula: sin empate se quita y queda la ganadora; con empate entre menos opciones, sigue solo
  entre esas; con el mismo empate, no cambia nada. Quien sale de una votación que creó la cede como al eliminar la
  cuenta.
- **Eliminar mi cuenta** (al final de «Tu perfil»; Google Play lo exige): sus mensajes (y sus votos, si se quedan)
  pasan a un nombre sin dueño al azar («Un suspiro», «Una sombra lejana»…) y sin foto; las votaciones que creó pasan a un
  administrador al azar o, si no hay, a otro participante (si no queda nadie, se borran); y se borran su perfil, su
  lista, sus grupos y la cuenta. Quien hereda una votación es su **«Delegado»**, con todos los poderes del creador, y
  «Creador» se queda en el nombre sin dueño. Quien se fue (`gone` en su voto) no hereda, no se le cuenta como
  «falta por votar» ni aparece en las solicitudes. Firebase pide haber entrado hace poco: con Google se vuelve a pedir la cuenta; con
  correo o clave, si hace rato, hay que salir y volver a entrar.

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

## Estructura

```
app/              La aplicación (ver app/README.md)
firestore.rules   Reglas de seguridad de Firestore
firebase.json     Configuración de Firebase para publicar las reglas (la del hosting está en app/)
index.html        Redirección de GitHub Pages a la dirección única
```

## Modelo de datos (Firestore)

| Ruta | Contenido |
| --- | --- |
| `polls/{pollId}` | `title`, `description`, `type`, `anonymous`, `tiebreak` (`id`, `candidates`, `done`, `round`), `months`, `slots` (días, lunes de cada semana o meses votables), `hours` y `hourStep` (solo horas), `options` (solo días), `ownerUid`, `ownerName`, `admins` (administradores nombrados por el creador), `founder` y `founderName` (si el creador eliminó su cuenta: su uid y su nombre sin dueño), `createdAt`, `closed`, y quién puede unirse: `maxPeople`, `members`, `approval`, `emailsOnly` |
| `polls/{pollId}/private/access` | Correos permitidos de una votación privada (`emails`). Solo lo lee el creador |
| `polls/{pollId}/votes/{uid}` | Un documento por participante: `name`, `photo`, `picks` (`"<casilla>\|<opción>"`), `tb` (voto del desempate: `{ id, pick }`), `status` (`pending`/`rejected` en las votaciones con aprobación), `seenAt`, `updatedAt` |
| `users/{uid}` | Perfil: `name` (nombre visible), `photo`, `thumb`, `hideRemoveWarning`, `updatedAt` |
| `users/{uid}/polls/{pollId}` | Colección privada del usuario: `title`, `type`, `role` (`owner`/`participant`), `ownerName`, `groupId`, `addedAt`, `archived` |
| `users/{uid}/groups/{groupId}` | Grupos privados del usuario: `name`, `createdAt` |

Cualquier usuario con sesión puede abrir una votación si tiene el enlace; solo el creador puede cerrarla o
borrarla; cada uno solo puede modificar su propio voto; y la colección/grupos de cada usuario es privada.
En las votaciones con aprobación o solo con correos, los votos solo los ven el creador y los aceptados.
