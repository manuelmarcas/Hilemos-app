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
src/components/            Shell (barra y menú), Sidebar, Gate (login), diálogos, Avatar, EmojiPanel…
src/pages/                 Home, Create, Poll, Profile
src/lib/types.ts           Tipos del modelo de datos y de la interfaz Store
src/lib/store.ts           Datos: Firebase o modo demo (misma interfaz)
src/lib/model.ts           Recuentos, ranking y desempate
src/lib/dates.ts           Utilidades de fechas
src/lib/util.ts            Errores, imágenes, grupos y enlaces
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
aparecen «Añadir al calendario», que descarga un `.ics`, y un enlace a Google Calendar. El evento lo monta
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

En el modo demo, el correo de cada persona es `<nombre>@demo.test` (p. ej. `ana@demo.test`).

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

## Pendiente para Capacitor

- Login con Google nativo (`signInWithPopup` no funciona dentro del WebView): `@capacitor-firebase/authentication`.
- Enlaces de las votaciones que abran la app (App Links / Universal Links) y `pollUrl` apuntando al dominio público.
