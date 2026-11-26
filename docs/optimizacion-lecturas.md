# Plan de optimización de lecturas de Firestore

Plan para cuando haga falta, no para hacerlo ya. Hoy Hilemos gasta muy por debajo del margen gratuito y cada
optimización de aquí complica el modelo de datos. Este documento dice **qué lee la app hoy, cuándo merece la pena
actuar y qué hacer, en orden**, para no tener que reconstruirlo con prisas si un día la factura sube.

Escrito el 26 de noviembre de 2026. Si cambia algo de lo que se describe aquí, se actualiza en el mismo cambio (ver la
skill `publicar`, paso 4).

---

## 1. Cuánto cuesta leer

- **Margen gratuito** (igual en Spark y en Blaze): **50.000 lecturas al día**, 20.000 escrituras y 20.000 borrados.
  Se reinicia cada día (hora del Pacífico).
- **Por encima**: unos **0,06 $ cada 100.000 lecturas** en `nam5`, la ubicación de la base de datos. Hay que
  comprobar el precio actual en la consola antes de decidir nada con él.
- Una **consulta** cobra un documento por cada resultado, y una consulta sin resultados cobra 1. Un recuento
  (`count()`) cobra 1 por cada 1.000 documentos contados.
- Una **escucha en directo** (`onSnapshot`) cobra todos los documentos al empezar y después uno por cada documento que
  cambia, por cada persona que escucha.
- La **caché local** de la app (IndexedDB) hace que volver a una escucha en menos de 30 minutos solo cobre lo que ha
  cambiado.
- Hay una **alerta de presupuesto de 5 €** en Google Cloud (ver `docs/funcionalidades-y-planes.md`, 7.4).

Con 100.000 lecturas más al día, el sobrecoste sería de unos 6 céntimos diarios (menos de 2 € al mes). Por eso este plan
es para cuando la app crezca, no para ahorrar céntimos ahora.

---

## 2. Qué lee la app hoy

`N` = participantes de la votación; `M` = mensajes que se traen del chat (como mucho 200, `CHAT_LIMIT`); `V` =
votaciones de la lista de la persona.

### En el dispositivo

| Cuándo | Qué lee | Lecturas |
| --- | --- | --- |
| Abrir una votación | La votación, todos los votos y los últimos mensajes del chat (si está dentro); si administra, también las denuncias | 1 + N + M (+ denuncias) |
| Mientras está abierta | Cada cambio (un voto, un mensaje, la votación) le llega a cada persona conectada | 1 por cambio y persona conectada |
| Entrar en «Mis votaciones» | Cada votación de su lista, para el icono de sin leer, el candado y el título | V en cada entrada |
| Abrir el perfil de otra persona («Votaciones en común») | Si esa persona está en sus últimas 40 votaciones (`SHARED_LOOKUP`) | Hasta 40 (se recuerda en la sesión) |
| Crear una votación (cuántas abiertas tiene) | Sus votaciones abiertas (`openManaged`) | Las que no estén ya leídas en la sesión |
| Arrancar la app | `config/app` (versión mínima y aviso para todos), el perfil y su lista | 2 + V |

### En el servidor (Cloud Functions)

| Función | Cuándo | Lecturas |
| --- | --- | --- |
| `onChatMessage` | Cada mensaje del chat | 1 (votación) + N (votos, para saber quién está) + N (lista de cada uno, para ver qué ha leído); más 2 por cada persona avisada (perfil y dispositivos) |
| `onVoteWritten` | Cada casilla que se pulsa | 0 casi siempre; en el primer voto de alguien, 1 + N y 2 por persona avisada |
| `onPollUpdated` | Cierre, reapertura o desempate | N + 2 por persona avisada |
| `onDeadline` | Cada 15 minutos | Las votaciones cuyo plazo acaba de pasar, más N y 2 por persona avisada |
| `onAutoClose` | Cada hora | Las votaciones con una cuenta atrás en las próximas 24 horas |
| `onDaily` | Cada día a las 4:00 | Con premium apagado, solo las votaciones con cuenta atrás. Con premium encendido, todas las abiertas, más el plan y las abiertas de cada gestor. Las estadísticas usan recuentos y los votos cambiados ese día. |
| `onReport`, `onPersonReport` | Cada denuncia | 2 y las cuentas de las dos personas |

### Lo más caro, en orden

1. **El chat**: abrir una votación con el chat lleno lee hasta 200 mensajes, y cada mensaje cuesta unas 2N lecturas en
   el servidor (unas 41 con 20 personas).
2. **Los avisos**: cada persona avisada cuesta 2 lecturas (perfil y dispositivos), y cada aviso lee también los votos.
3. **«Mis votaciones»**: V lecturas en cada entrada.
4. **Grupos grandes con mucha gente conectada a la vez**: cada cambio se multiplica por las personas conectadas.

---

## 3. Cuándo actuar

Mirar el uso en *Firebase Console › Firestore › Uso* (o *Google Cloud › Facturación*) y, para saber qué crece, las
estadísticas diarias (`stats/{día}`: votaciones, votos y mensajes).

| Señal | Qué hacer |
| --- | --- |
| Menos de 25.000 lecturas al día de media | Nada. |
| Más de 25.000 al día durante una semana (la mitad del margen) | Medir de dónde salen (§5) y hacer la optimización 1 y la 2. |
| Más de 50.000 al día de forma habitual | Las optimizaciones 3 a 5. Con el plan de pago en marcha, valorar si compensa con los ingresos antes de complicar el modelo. |
| La alerta de presupuesto salta sin un pico de uso que lo explique | Puede ser un abuso (bots): primero App Check y el presupuesto (`docs/funcionalidades-y-planes.md`, 7.4), no estas optimizaciones. |

---

## 4. Optimizaciones, en orden

Cada una dice cuánto ahorra, qué cuesta a cambio y qué hay que tocar. Están ordenadas por ahorro frente a
complicación. Todas pasan por la skill `cambio-de-modelo` (tipos, reglas, almacén demo, funciones y documentación).

### 1. «Mis votaciones»: releer solo lo que tenga más de 5 minutos

- **Ahora**: cada entrada en la pantalla relee todas las votaciones de la lista (V lecturas).
- **Cambio**: guardar con cada votación de `pollCache` cuándo se leyó y releer solo las que tengan más de 5 minutos.
  Ir y volver de una votación a la lista deja de releerlo todo.
- **Ahorro**: casi todas las relecturas de quien entra y sale de sus votaciones.
- **A cambio**: el icono de sin leer y el candado pueden tardar hasta 5 minutos en «Mis votaciones». Dentro de la
  votación, todo sigue en directo.
- **Tocar**: `pages/Home.tsx` (el `useEffect` que pide las votaciones) y `state/session` (`pollCache`).

### 2. La lista de participantes dentro de la votación

- **Ahora**: los avisos (`onChatMessage`, `onVoteWritten`, `onPollUpdated`, `onDeadline`) leen todos los votos (N)
  solo para saber quién está dentro.
- **Cambio**: un campo `memberUids` en la votación (como mucho 150 uids, cabe de sobra en el documento), que se
  mantiene en la misma escritura que crea el voto, acepta, rechaza, expulsa o sale. Las reglas comprueban que cada uno
  solo se añade o se quita a sí mismo, y que un administrador solo quita o readmite.
- **Ahorro**: N lecturas por aviso. En el chat, unas 20 de las 41 por mensaje.
- **A cambio**: un dato más que mantener coherente con los votos. Las reglas de `polls` ganan complejidad, y las
  votaciones existentes necesitan un relleno único con una función temporal, como se hizo con `chatAt`.
- **Tocar**: `firestore.rules`, `lib/store/firebase.ts` y `demo.ts` (unirse, salir, expulsar, aceptar),
  `functions/index.js` (`participants`).

### 3. El estado de lectura del chat en un solo documento por votación

- **Ahora**: `onChatMessage` lee la lista de cada participante (N) para ver hasta dónde ha leído
  (`chatSeenAt`) y si ya se le avisó (`chatNotifiedAt`).
- **Cambio**: un documento `polls/{id}/meta/chat` con `{ seen: { uid: hora }, notified: { uid: hora } }`. La app escribe
  su `seen` ahí además de en su lista, y el servidor lee y escribe solo ese documento. Junto con la optimización 2, un
  mensaje pasaría a costar 2 o 3 lecturas.
- **Ahorro**: N lecturas por mensaje (de 41 a unas 3 en un grupo de 20, contando la 2).
- **A cambio**: una escritura más cada vez que alguien lee el chat. Todos escriben en el mismo documento: Firestore
  admite una escritura por segundo sostenida en un documento, de sobra para un chat de amigos, pero no para un grupo
  de 150 personas leyendo a la vez. Hace falta una regla para que cada uno solo cambie su `seen`.
- **Tocar**: `firestore.rules`, `PollPage.tsx` (`markChatSeen`), almacenes, `functions/index.js` y `functions/chat.js`.

### 4. Preferencias y dispositivos en un solo documento

- **Ahora**: cada persona avisada cuesta 2 lecturas: el perfil (`users/{uid}`, por `notify`) y la colección de
  dispositivos (`users/{uid}/tokens`, uno por documento).
- **Cambio**: un documento por persona solo para avisos (por ejemplo `push/{uid}`, con `notify` y la lista de tokens),
  que escribe la app al activar o desactivar los avisos.
- **Ahorro**: 1 lectura por persona avisada, y menos si tiene varios dispositivos.
- **A cambio**: mover los tokens. Las versiones viejas de la app de Android siguen guardándolos en el sitio antiguo
  hasta que se actualicen: hay que leer de los dos sitios durante un tiempo, o subir `config/app.minBuild`.
- **Tocar**: `lib/push.ts`, los almacenes, `firestore.rules`, `functions/index.js` (`notify`), «Descargar mis datos» y
  «Eliminar mi cuenta».

### 5. Traer menos mensajes del chat al abrirlo

- **Ahora**: abrir el chat trae hasta 200 mensajes (`CHAT_LIMIT`).
- **Cambio**: traer los últimos 50 y un botón «Ver mensajes anteriores» que pide los siguientes 50.
- **Ahorro**: hasta 150 lecturas cada vez que alguien abre un chat largo sin caché.
- **A cambio**: un botón más en el chat, y el contador de sin leer solo cuenta lo que se ha traído (con más de 50
  sin leer diría «50+»).
- **Tocar**: `components/Chat.tsx`, `lib/model.ts` (`CHAT_LIMIT`) y los dos almacenes (`watchChat`).

### Otras, si algún día hacen falta

- **«Votaciones en común»**: buscar en 20 votaciones en vez de 40, o solo al pulsar «Ver votaciones en común».
- **Copiar en la lista de cada uno lo que enseña «Mis votaciones»** (cerrada, título, último mensaje): ahorra las V
  lecturas por entrada, pero cada cambio de una votación escribe en la lista de todos sus participantes. Solo compensa
  si se entra en la lista mucho más de lo que cambian las votaciones.
- **El barrido diario de premium** (`onDaily`), cuando premium esté encendido: hoy lee todas las abiertas una vez al
  día. Con miles de votaciones abiertas, se puede leer solo las que han cambiado de gestor o de plan ese día.

---

## 5. Cómo medir antes y después

1. **Ver el total**: *Firebase Console › Firestore › Uso* (lecturas por día) y *Google Cloud › Facturación* (coste).
2. **Saber qué crece**: `stats/{día}` y `stats/{mes}` (votaciones creadas, votos, mensajes, denuncias), que calcula
   `onDaily`.
3. **Medir una función**: en el emulador (`firebase emulators:exec`, ver `app/README.md`, «Avisos»), contar lecturas
   con un script que escriba mensajes o votos y mire el uso del emulador (`http://localhost:4000`, pestaña
   *Firestore › Requests*).
4. **Medir la app**: el panel *Network* del navegador no sirve, porque Firestore va por una conexión larga y no se
   ve cada lectura. Lo fiable es el emulador o el uso de la consola, comparando un día antes y uno después.
5. **Después de cada optimización**: anotar aquí la fecha, cuánto se esperaba ahorrar y cuánto bajó de verdad.

| Fecha | Optimización | Esperado | Medido |
| --- | --- | --- | --- |
| — | — | — | — |
