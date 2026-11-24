---
name: probar-en-navegador
description: Prueba Hilemos en un navegador de verdad (Chrome con Playwright, en modo demo) — comprobar que un cambio funciona y se ve bien en claro, oscuro y móvil, comparar capturas píxel a píxel antes y después de un cambio de estilos o de un renombrado, y pasar el recorrido funcional de toda la app. Úsala siempre antes de publicar un cambio visible, tras tocar CSS, clases o componentes, cuando el usuario pida «pruébalo», «revisa que no se rompa nada» o «haz pruebas de todas las funcionalidades», y para reproducir un fallo de la interfaz.
---

# Probar en el navegador

Compilar no basta: un cambio de clases puede dejar una pantalla sin estilo y TypeScript no se entera. En este
proyecto se prueba en Chrome de verdad, en **modo demo** (`?demo`: datos en el navegador, sin Firebase), con
Playwright. Hay cuatro herramientas en `scripts/`. Elige según lo que hayas cambiado:

| Cambio | Qué pasar |
| --- | --- |
| Una función nueva o un arreglo | Un script corto que haga ese caso (y el recorrido si toca algo compartido) |
| CSS, clases o componentes (sin querer cambiar el aspecto) | `capturas.mjs` antes y después + `comparar.mjs`, y `estados.mjs` si hay `:hover` o `:focus` |
| Algo grande o «que no se rompa nada» | Todo: capturas, estados y `recorrido.mjs` |
| «Hilemos en tu móvil» (instalar la app) | `instalar.mjs <carpeta>`: simula un iPhone, un Android y un ordenador |
| Solicitudes de entrada (votaciones con aprobación) | `solicitudes.mjs <carpeta>`: mete 100 solicitudes en el modo demo y prueba plegar, «Ver las 100», buscar y aceptar o rechazar en lote |
| Ficha de Google Play | `ficha.mjs <carpeta> <icono-512.png>`: las 7 capturas del móvil (1080×2160, pantalla de 412×824) con datos de ejemplo y la imagen destacada (1024×500). Resultado y textos en `docs/ficha-google-play/` |

## Preparar (una vez por sesión)

Las dependencias van **fuera del proyecto**, en el directorio temporal de la sesión (scratchpad), para no tocar
`app/package.json`:

```bash
cd <scratchpad>/pw && npm init -y && npm i playwright-core@1.49.1 pngjs@7.0.0 pixelmatch@5.3.0
cp <repo>/.claude/skills/probar-en-navegador/scripts/*.mjs .
```

Los scripts se ejecutan **desde esa carpeta** (los `import` buscan `node_modules` junto al script). Usan el Chrome del
sistema (`CHROME` para cambiar la ruta) y el servidor de desarrollo:

```bash
cd <repo>/app && npx vite --port 5199 --strictPort      # en segundo plano
```

Al terminar, cierra **tu** servidor: `TaskStop` a veces deja vivo el proceso hijo, así que comprueba el puerto y usa
`Stop-Process` con los procesos que lanzaste tú.

## Capturas y comparación (regresión visual)

`capturas.mjs` recorre toda la app (entrada, legales, crear cada tipo, votar con dos personas, todas las pestañas,
menús, diálogos, desempate, editar, inicio, perfil, tooltip, oscuro y móvil) y saca 44 capturas a página completa
con **datos y hora fijos** (aleatorio con semilla y `page.clock.setFixedTime`), así que dos pasadas sin cambios
salen idénticas.

```bash
node capturas.mjs antes            # con el código de antes (o en un worktree con la versión anterior)
# … cambio …
node capturas.mjs despues
node comparar.mjs antes despues dif    # «todas iguales» o qué captura cambia y cuántos píxeles
```

Si sale una diferencia, **mira la imagen de `dif/`** (los píxeles distintos en rojo) antes de decidir. Un cambio de
alto de 6 px en todas las votaciones suele ser un margen que ha cambiado de ganador en la cascada.

`estados.mjs <puerto> <carpeta>` captura elementos con el ratón encima (tarjetas seleccionadas, chips, botones,
casillas, menús…). Para compararlo con la versión anterior, sírvela en otro puerto desde un worktree
(`git worktree add --detach <ruta> HEAD` + junction de `app/node_modules`) y compara las dos carpetas.

Para que la comparación sea fiable, los scripts solo usan selectores que no dependen de las clases: textos, roles,
`aria-label`, ids y atributos `data-`. Si cambias textos de la interfaz, actualiza los scripts.

## Recorrido funcional

`recorrido.mjs <carpeta>` hace como un usuario y **comprueba** cada resultado (no solo que no falle): entrada y avisos
de campos, legales sin sesión, crear y validar, emojis, votar y quitar, compartir y QR, calendario .ics, imagen del
resultado, entrar con el enlace, chat y no leídos, avisar a quien falta, administradores, desempate (anular, sin
ganadora, repetir, definitivo), cerrar y reabrir, anónima, acceso y plazas, duplicar, editar y cancelar, aprobación
(aceptar y rechazar), solo correos, grupos, archivar y deshacer, menú lateral, salir, eliminar, perfil y tema, y en el
móvil el cajón y deslizar para archivar. Imprime ✔/✘ por paso y guarda una captura de cada fallo.

Úsalo con criterio: **un ✘ no siempre es un fallo de la app**. Antes de cambiar código, comprueba si la versión
anterior hace lo mismo (en otro puerto). Hoy salieron así fallos del propio script (navegar a la misma dirección no
recarga, crear un grupo deja el filtro puesto, el Chrome de escritorio tiene menú de compartir) y uno real que ya
existía (el foco del cajón del móvil).

## En la app de Android (móvil de verdad)

`recorrido-android.mjs <carpeta>` pasa el recorrido en la app instalada en un móvil: Playwright se conecta al WebView
por DevTools (`adb forward` a `webview_devtools_remote_<pid>`, solo en compilaciones de depuración) y `adb` hace lo
del sistema: toques y gestos reales, Atrás, teclado, girar, tema del móvil, menú de compartir, Calendar, enlaces
desde fuera y segundo plano. Usa el modo demo y varias personas en el mismo WebView: cambia la sesión
(`sessionStorage`) en `go()`. Lista de casos y estado: `docs/pruebas-app-android.md`.

- Compilar el APK con el JDK 21 (`JAVA_HOME` = Temurin 21; Gradle 8.14 no acepta el JDK 25 de Android Studio):
  `npm run android` y `cd android && ./gradlew assembleDebug`, e instalar con `adb install -r`.
- Móvil por wifi: «Depuración inalámbrica» → `adb pair <ip:puerto> <código>` y `adb connect <ip:puerto>`; con dos
  dispositivos en la lista, `ADB_SERIAL=<ip:puerto>`.
- Que no se bloquee la pantalla a mitad: `adb shell svc power stayon usb`, y al acabar `svc power stayon false`.
- El usuario no debe usar el móvil mientras corre (cinco minutos).
- **Playwright emula el tema claro** (`prefers-color-scheme: light`) en la página a la que se conecta: para comprobar
  el tema del sistema hay que preguntar por DevTools a pelo (`rawEval` en el script). Por eso pareció que el tema
  automático no seguía al móvil, y sí lo sigue.
- Un enlace que abre otra app (`target=_blank`, Calendar) se pulsa con `evaluate(a => a.click())`: el `click()` de
  Playwright se queda esperando una ventana que en el WebView no llega.

## Trucos del modo demo y de Playwright

- **Error 504 «Outdated Optimize Dep»** en el servidor de desarrollo (y fallan el QR, los emojis o las descargas): su
  caché de dependencias está desfasada, a menudo porque sigue vivo un Vite antiguo en el mismo puerto. Para el
  proceso (búscalo por `vite.js` y el puerto en la línea de comando) y arráncalo con `--force`.

- **Cada pestaña es una sesión**: dos páginas del mismo contexto son dos personas que comparten datos (así se prueba
  con «Ana» y «Bea»). Una página nueva empieza sin sesión: hay que entrar.
- **Pestaña en segundo plano**: Chrome no la pinta y la captura se queda esperando. `page.bringToFront()` antes de
  capturar.
- **Volver a la misma dirección** con `goto` no recarga (es un cambio de `#`): usa `reload()`.
- **El panel de emojis** es un componente con su propio DOM aislado; el clic simulado no le llega. Para probar la
  parte de la app, lanza su evento: `picker.dispatchEvent(new CustomEvent("emoji-click", { detail: { unicode: "🍕" } }))`.
- **Gestos táctiles** (deslizar): eventos `PointerEvent` con `pointerType: "touch"` lanzados sobre `.swipe__fg`.
- **En el móvil** el nombre de la barra superior está oculto: espera con `{ state: "attached" }`.
- **Animaciones fuera** para capturar: `*{transition:none!important;animation:none!important}` y `#toast` oculto.
- **Botones por su texto** con `getByRole("button", { name, exact: true })`: sin `exact`, «Horas sueltas» también
  encuentra la tarjeta «Horas».
