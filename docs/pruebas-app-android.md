# Pruebas de la app de Android

Qué hay que comprobar en la app de Android antes de publicarla en Google Play. Hay casos que se prueban solos y otros
que hay que hacer a mano.

- **[x]** comprobado en un móvil de verdad: OPPO CPH2307, Android 15, WebView Chrome 157, el 22 de noviembre de 2026.
  Casi todo se comprobó con el recorrido automático y el resto a mano con capturas.
- **[ ]** pendiente. Al lado se dice por qué: necesita una segunda cuenta, un correo real, otro móvil, o ha fallado.

Resultado de la última pasada del recorrido automático: **50 de 52 bien**. Los dos que no:
- **Imagen del resultado:** el fallo es del script, que pierde un momento la conexión con la app al volver de Google
  Calendar. En la pasada anterior salió bien.
- **Tema automático:** es un fallo de la app (apartado 7).

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
- [x] Pantalla de arranque: icono morado con el calendario, nítido, sobre el fondo de la app.
- [x] Selector de cuentas de Google: muestra el logo lila, el de la pantalla de entrada.
- [ ] Icono del lanzador (morado) nítido en la pantalla de inicio. *Hay que mirarlo; el sistema solo confirma que
      está declarado.*
- [ ] Icono en Ajustes → Aplicaciones (lila). *Hay que mirarlo.*
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
- [ ] Entrar con el correo: el enlace del correo abre la app (App Link con `oobCode`) y completa la entrada. *Hace
      falta un correo real.*
- [ ] Entrar sin cuenta de verdad y guardar o compartir la clave de acceso. *Crea una cuenta real.*
- [ ] Entrar con la clave de acceso en otro móvil. *Hace falta otro móvil.*
- [ ] Eliminar la cuenta: vuelve a pedir Google con el selector del móvil. *Es destructivo; con una cuenta de prueba.*

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
- [x] Botón Atrás en «Editar» sale del formulario. *Ojo: el teclado se abre solo al entrar, así que el primer Atrás
      lo cierra y hace falta un segundo. Ver «Hallazgos».*
- [x] Teclado: al tocar un campo se abre y el campo queda a la vista.
- [x] Deslizar una votación con el dedo para archivarla, y deshacer.
- [x] Cajón del menú lateral: se abre con el botón y el buscador filtra.
- [x] Segundo plano: al volver sigue en la misma pantalla y con la sesión.
- [x] Un enlace `https://hilemos.web.app/#/v/…` abierto desde fuera abre la app en esa votación.
- [x] Dominio verificado para App Links (`hilemos.web.app: verified`).
- [ ] Abrir un enlace desde WhatsApp o el correo con la app cerrada del todo. *A mano; se ha probado con la app
      abierta.*
- [ ] Sin conexión: avisos y qué pasa al recuperarla. *Desde aquí cortaría la conexión con el móvil.*

## 6. Avisos push

- [ ] Activar los avisos en «Tu perfil → Preferencias → Avisos»: Android 13+ pide permiso.
- [ ] Llega un aviso con la app cerrada cuando otra persona vota.
- [ ] Llega con la app abierta (aviso dentro de la app).
- [ ] Al tocar el aviso se abre esa votación.
- [ ] Avisos de cierre, desempate y fin del plazo.
- [ ] Desactivarlos: dejan de llegar.

*Todos pendientes: hace falta una segunda cuenta que vote en una votación tuya. Las funciones están desplegadas y la
app ya registra el dispositivo (se arregló el fallo que lo impedía).*

## 7. Tema

- [x] Tema claro y oscuro elegidos en la app.
- [ ] **Falla:** con «Automático», la app no sigue el modo oscuro del móvil. Con el modo noche activado
      (`cmd uimode night yes`), Android aplica el modo noche a la app, pero el WebView sigue diciendo
      `prefers-color-scheme: light`, también al volver a abrir la app. *Pendiente de investigar; conviene probarlo
      también activándolo desde los ajustes del móvil.*

## Hallazgos

- **Corregido:** al ir a un campo (por ejemplo, al abrir «Editar»), el campo quedaba medio tapado por la barra
  superior pegada. Ahora el navegador le deja hueco (`scroll-padding-top` en `src/styles/layout.css`).
- **El teclado se abre solo** al entrar en «Nueva votación» y en «Editar», porque el título recibe el foco. En el
  móvil tapa media pantalla, y el primer Atrás solo cierra el teclado. Propuesta: dar el foco al título solo con
  ratón (`pointer: fine`).
- **El tema automático no sigue al sistema** en la app (apartado 7).
- **Pantallas de carga** (propuesta del usuario): mientras se espera a Google al entrar, mientras cargan las
  votaciones y donde haga falta.
