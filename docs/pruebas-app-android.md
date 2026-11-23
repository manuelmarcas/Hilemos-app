# Pruebas de la app de Android

Qué hay que comprobar en la app de Android antes de publicarla en Google Play. Hay casos que se prueban solos y otros
que hay que hacer a mano.

- **[x]** comprobado en un móvil de verdad: OPPO CPH2307, Android 15, WebView Chrome 157, el 22 de noviembre de 2026.
  Casi todo se comprobó con el recorrido automático y el resto a mano con capturas.
- **[ ]** pendiente. Al lado se dice por qué: necesita una segunda cuenta, un correo real, otro móvil, o ha fallado.

Resultado de la última pasada del recorrido automático: **50 de 52 bien**. Los dos que no eran fallos del script,
no de la app:
- **Imagen del resultado:** el script pierde un momento la conexión con la app al volver de Google Calendar. En la
  pasada anterior salió bien.
- **Tema automático:** Playwright forzaba el tema claro al medir (apartado 7).

## Cómo pasar el recorrido automático

El recorrido controla la app instalada desde el ordenador, con DevTools por `adb`, lo que solo funciona en las
compilaciones de depuración. Toca la pantalla como lo haría una persona, pulsa Atrás, gira el móvil, abre el menú de
compartir y lo cierra.

Usa el **modo demo**, así que no toca datos reales, y al terminar borra lo que ha creado.

1. Instala la versión de depuración, ábrela y deja el móvil desbloqueado. Con `adb shell svc power stayon usb` no se
   apaga la pantalla mientras está conectado; al terminar, vuelve a dejarlo con `adb shell svc power stayon false`.
2. Conecta el móvil por cable o por depuración inalámbrica (`adb pair` y `adb connect`).
3. Desde la carpeta de Playwright de la skill `probar-en-navegador`:
   `ADB_SERIAL=<ip:puerto> node recorrido-android.mjs <carpeta para capturas>`
4. No uses el móvil mientras corre, unos 5 minutos.

El script está en `.claude/skills/probar-en-navegador/scripts/recorrido-android.mjs`.

## 1. Instalación, iconos y arranque

- [x] La app abre la web empaquetada como app nativa (Capacitor).
- [x] Pantalla de arranque: icono morado con el calendario sobre el fondo de la app.
- [x] Nitidez del arranque: la imagen que sigue a la del sistema ya es vectorial (antes, un PNG estirado).
- [x] El logotipo de carga (el del ojo que gira) en el centro de la pantalla (a 3 dp del centro exacto).
- [x] Selector de cuentas de Google: muestra el logo lila, el de la pantalla de entrada.
- [ ] Icono del lanzador (morado) nítido en la pantalla de inicio. *Hay que mirarlo; el sistema solo confirma que
      está declarado.*
- [ ] Icono en Ajustes → Aplicaciones: sale el lila y debería ser el morado. *Es el mismo icono que el del selector
      de cuentas de Google (los dos salen del icono de la aplicación): hay que elegir uno para los dos.*
- [ ] Pantalla de arranque en Android 11 o anterior (imagen `splash.png`). *Hace falta otro móvil.*
- [ ] Pantalla de arranque con el móvil en modo oscuro (fondo oscuro). *Ver el apartado 7.*

## 2. Bordes de la pantalla

- [x] La página respeta la barra de estado (38 px) y los botones de navegación (44 px).
- [x] Franja del color de la app bajo la barra de estado: lo que se desplaza no se ve por debajo.
- [x] La barra superior (logo, «Hilemos», perfil) se queda pegada al desplazarse y gana sombra.
- [x] En horizontal (800×360) la página no se sale de la pantalla y respeta los márgenes laterales.
- [x] Un campo que recibe el foco no queda tapado por la barra pegada (corregido hoy con `scroll-padding-top`).
- [ ] Móvil con muesca en un lateral o navegación por gestos. *Hace falta otro móvil o cambiar el ajuste.*

## 3. Sesión

- [x] «Entrar con Google» abre el selector de cuentas del móvil.
- [x] Al elegir la cuenta se entra con su nombre y su foto.
- [x] Entrar sin cuenta con un nombre (modo demo) y el aviso propio si falta el nombre.
- [x] Salir de la cuenta vuelve a la pantalla de entrada.
- [x] Entrar con el correo: el enlace del correo abre la app (App Link con `oobCode`) y entra con esa cuenta.
      *Comprobado a mano.*
- [ ] Entrar sin cuenta de verdad y guardar o compartir la clave de acceso. *Crea una cuenta real.*
- [x] Entrar con una clave de acceso de una cuenta ya creada. *Comprobado a mano.*
- [x] Eliminar una cuenta de clave: vuelve a la entrada y la clave deja de valer. *Comprobado a mano.*
- [ ] Eliminar una cuenta de Google: vuelve a pedir Google con el selector del móvil. *Es destructivo; con una
      cuenta de prueba.*

## 4. Funciones de la app (modo demo, con varias personas)

- [x] Enlaces a condiciones y privacidad, ida y vuelta.
- [x] Crear: aviso si falta el nombre.
- [x] Crear una votación de días con dos opciones por día.
- [x] Votar y quitar el voto con toques reales en la pantalla.
- [x] Otra persona entra con el enlace y vota.
- [x] Chat: escribir con el teclado del móvil, enviar y contador de no leídos.
- [x] «Avisar a quien falta».
- [x] Gestionar participantes: hacer admin, expulsar y volver a admitir.
- [x] Ver qué ha votado alguien (tabla desplegable).
- [x] Desempate: abrir, votar y anular.
- [x] Reabrir la votación.
- [x] Desempate sin ganadora: solo deja repetir.
- [x] Repetir y finalizar con ganadora: resultado definitivo, sin reabrir.
- [x] Votación de opciones: cerrar (no se puede votar) y reabrir.
- [x] Hacer anónima.
- [x] Acceso y plazas: cambiar el máximo.
- [x] Duplicar (título con «(copia)» y mismas opciones).
- [x] Editar: renombrar una opción y aviso en el chat.
- [x] Con aprobación: queda pendiente, se acepta y ya puede votar.
- [x] Con aprobación: rechazo.
- [x] Solo estos correos: otra persona no puede entrar.
- [x] Inicio: crear un grupo y mover una votación a él.
- [x] Salir de una votación.
- [x] Eliminar una votación.
- [x] Perfil: cambiar el nombre (se ve arriba).
- [x] Perfil: tema oscuro, claro y automático desde la app.
- [x] Chat: quien entra después no ve los mensajes de antes; quien creó la votación lo ve todo. *En Chrome (modo
      demo), con dos personas, y las reglas de Firestore en el emulador (11 casos, también intentando saltárselo).*
- [x] «Solo estos correos» con burbujas: Intro, coma, espacio, pegar una lista, un texto que no es correo (se marca),
      borrar y quitar. *En Chrome (modo demo).*
- [ ] Votación de horas, de semanas y de meses. *El recorrido solo crea días y opciones.*
- [ ] Recordatorios y plazo de cierre. *Funciones premium; sin probar.*

## 5. Integración con Android

- [x] Copiar el enlace (aviso «Enlace copiado»).
- [x] Compartir el enlace: abre el menú de compartir del sistema.
- [x] Compartir el QR como imagen: menú del sistema.
- [x] Compartir la imagen del resultado: menú del sistema.
- [x] Exportar resultados en CSV, Excel y PDF: menú del sistema.
- [x] Añadir al calendario: abre Google Calendar (o el navegador) con el evento.
- [x] Botón Atrás con un diálogo abierto: lo cierra sin salir de la votación.
- [x] Botón Atrás con el cajón abierto: no saca de la app.
- [x] Botón Atrás en «Editar» sale del formulario. *Hacían falta dos porque el teclado se abría solo; ya no se
      abre (ver «Hallazgos»).*
- [x] Teclado: al tocar un campo se abre y el campo queda a la vista.
- [x] Deslizar una votación con el dedo para archivarla, y deshacer.
- [x] Cajón del menú lateral: se abre con el botón y el buscador filtra.
- [x] Segundo plano: al volver sigue en la misma pantalla y con la sesión.
- [x] Un enlace `https://hilemos.web.app/#/v/…` abierto desde fuera abre la app en esa votación.
- [x] Dominio verificado para App Links (`hilemos.web.app: verified`).
- [x] Abrir un enlace desde el correo con la app cerrada del todo. *Comprobado a mano.*
- [ ] Sin conexión: avisos y qué pasa al recuperarla. *Desde aquí cortaría la conexión con el móvil.*

## 6. Avisos push

- [x] La primera vez que se entra en la app, activa los avisos (con el permiso ya dado, sin preguntar) y recuerda que
      ya lo hizo.
- [ ] Con la app recién instalada, sale el diálogo de permiso de Android; si se dice que no, no vuelve a preguntar.
      *ColorOS no deja quitar el permiso por adb: hay que probarlo desinstalando e instalando.*
- [ ] Activar los avisos en «Tu perfil → Preferencias → Avisos»: Android 13+ pide permiso.
- [x] Llega un aviso con la app cerrada cuando otra persona vota. *Comprobado a mano.*
- [ ] El aviso de voto llega a todos los que están en la votación, no solo al creador. *Hecho; falta probarlo.*
- [ ] El icono pequeño del aviso es el logotipo de trazo (calendario con cara). *Hecho; falta verlo en el móvil.*
- [ ] Llega con la app abierta (aviso dentro de la app).
- [ ] Al tocar el aviso se abre esa votación.
- [ ] Avisos de cierre, desempate y fin del plazo.
- [ ] Desactivarlos: dejan de llegar.

*Todos pendientes: hace falta una segunda cuenta que vote en una votación tuya. Las funciones están desplegadas y la
app ya registra el dispositivo (se arregló el fallo que lo impedía).*

## 7. Tema

- [x] Tema claro y oscuro elegidos en la app.
- [x] Con «Automático», la app sigue el modo oscuro del móvil (comprobado también a mano), al abrirla y también al cambiarlo con la app abierta.
      *Parecía que no: era la herramienta de pruebas. Playwright fuerza el tema claro en la página a la que se
      conecta, y ahora el recorrido lo mide con DevTools a pelo.*

## Hallazgos

- **Corregido:** al ir a un campo (por ejemplo, al abrir «Editar»), el campo quedaba medio tapado por la barra
  superior pegada. Ahora el navegador le deja hueco (`scroll-padding-top` en `src/styles/layout.css`).
- **Corregido: el teclado se abría solo** al entrar en «Nueva votación» y en «Editar», porque el título recibía el
  foco. En el móvil tapaba media pantalla, y el primer Atrás solo cerraba el teclado. Ahora el título solo recibe el
  foco con ratón (`hasMouse()` en `src/lib/util.ts`).
- **Descartado: el tema automático** sí sigue al sistema (apartado 7).
- **Hecho: pantallas de carga.** Hay indicadores en el arranque (el ojo del logo gira), en «Entrar con Google» y las demás formas de entrar,
  en la lista de votaciones (tarjetas de esqueleto), en la votación, en «Editar», en el menú lateral, en el chat y en
  «Crear votación».
