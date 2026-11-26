---
name: publicar
description: Publica un cambio de Hilemos de principio a fin — comprobar tipos y compilar, revisar y desplegar las reglas de Firestore, desplegar la web en hilemos.web.app, comprobar que la versión en vivo es la nueva, hacer commit y push (integrando antes lo que hayan subido otras sesiones). Úsala siempre que se termine un cambio en la app (app/), en firestore.rules o en la documentación que acompaña a un cambio, o cuando el usuario diga «publica», «súbelo», «despliega», «ponlo en la web» o similar, aunque no nombre los pasos.
---

# Publicar Hilemos

El usuario quiere que cada cambio terminado y probado quede publicado sin que tenga que pedirlo: commit, push, reglas
de Firestore y la web en **https://hilemos.web.app** (la única URL; el sitio antiguo `votaciones-9bc95.web.app` solo
redirige). Esta skill es el orden seguro para hacerlo y los tropiezos que ya han pasado en esta máquina.

## Antes de publicar

1. **Probado de verdad.** Si el cambio se ve en pantalla, pasa antes por la skill `probar-en-navegador`. Si toca datos
   o reglas, por `cambio-de-modelo`. No publiques algo que no has visto funcionar.
2. **Tests, tipos y compilación**, desde `app/`:
   ```bash
   npm test             # Vitest: la lógica de lib/ (recuento, desempate, editar, avisos del chat…)
   npm run build        # tsc --noEmit + vite build
   ```
   Si un test falla, no se publica: o el cambio ha roto algo, o el comportamiento ha cambiado a propósito y hay que
   cambiar el test (dilo al usuario).
3. **Comprobadores del proyecto** (si has tocado CSS o clases):
   ```bash
   node .claude/skills/limpieza-codigo/scripts/selectores-bem.mjs
   node .claude/skills/limpieza-codigo/scripts/clases-css.mjs
   ```
4. **Documentación al día (obligatorio, sin que lo pidan).** Cada cambio sale con su documentación en el mismo commit.
   Busca (grep) en todos estos sitios lo que el cambio deja viejo (textos, clases, nombres de funciones, pantallas) y
   añade lo nuevo:
   - `README.md` (raíz): «Qué se puede hacer», «Publicar» y la tabla «Modelo de datos (Firestore)».
   - `app/README.md`: la sección de esa parte de la app («Mis votaciones», «Pantalla de una votación», «Chat»,
     «Avisos»…).
   - `app/design-system/README.md` y `app/design-system/components/*.md` (una ficha por componente; si nace uno,
     ficha nueva y fila en su `README.md`); valores nuevos, en `tokens.json`.
   - `docs/funcionalidades-y-planes.md`: la fila del inventario (§2) y, si es una regla, su casuística caso por caso.
   - `docs/optimizacion-lecturas.md` si cambia lo que se lee (una escucha, una consulta, una función que lee).
   - `docs/plan-hasta-premium.md`, `docs/pruebas-app-android.md`, `docs/publicar-en-google-play.md` (si cambia, vuelve
     a generar su `.pdf`) y `docs/ficha-google-play/textos.md` si el cambio se ve en la ficha.
   - Las skills de `.claude/skills/` y sus scripts de prueba (`recorrido.mjs`, `recorrido-android.mjs`…) si buscan
     textos o clases que han cambiado.
   - `app/src/pages/Legal.tsx` si cambia qué datos se guardan.
   - La memoria del proyecto (`~/.claude/projects/c--Users-Marcas-repos-HILEMOS/memory/`) si queda vieja.
   Al reescribir un trozo con un script, comprueba después que no se ha llevado nada más: compara los títulos (`grep
   "^#"`) con la versión de antes. Una vez un recorte «hasta el siguiente `---`» borró tres secciones enteras.

## ¿Hay otra sesión trabajando?

Mira `git status`, `git log origin/main..` y `ListAgents`. Si otra sesión tiene cambios en el mismo repo:

- Trabaja en un worktree aparte **fuera** del repo (`git worktree add -b <rama> c:/Users/Marcas/repos/votaciones-wt/<nombre> main`)
  y enlaza `app/node_modules` con un junction al del árbol principal. `isolation: "worktree"` del tool Agent no funciona
  en esta máquina.
- Antes de publicar, **integra lo suyo**: `git fetch origin && git rebase origin/main` (o `git pull --rebase origin main`).
  Si desplegaras sin integrar, la web perdería lo que ellos ya publicaron.

## Publicar (en este orden)

1. **Commit** con un mensaje en castellano que explique el qué y el porqué, y la línea de coautoría que indique el
   sistema. Commits pequeños y con sentido, no «cambios varios».
2. **Integrar**: `git pull --rebase origin main`. Si hay conflictos, resuélvelos respetando los cambios de los demás.
   Vuelve a compilar después del rebase.
3. **Reglas de Firestore**, solo si `firestore.rules` ha cambiado. Revisa antes el diff: que no abra lecturas o
   escrituras de más. Desde la raíz del repo:
   ```bash
   ./app/node_modules/.bin/firebase deploy --only firestore:rules --project votaciones-9bc95
   ```
   Van **antes** que la web: si la web nueva escribe un campo que las reglas viejas rechazan, fallaría.
4. **Web**, desde `app/`: `npm run deploy` (compila y despliega `hosting:app`). No uses canales de vista previa: caducan
   y cambian de URL.
5. **Comprobar que está en vivo**: busca en el JavaScript publicado un texto que solo exista en la versión nueva.
   ```bash
   js=$(curl -s https://hilemos.web.app/ | grep -o 'assets/index-[^"]*\.js' | head -1)
   curl -s "https://hilemos.web.app/$js" | grep -c "<texto nuevo>"
   ```
6. **Push**: `git push origin main`.

Las Cloud Functions (`functions/`) solo se despliegan si has cambiado `functions/` (el proyecto está en Blaze desde
el 2026-11-22): `app/node_modules/.bin/firebase deploy --only functions --project votaciones-9bc95`. Si quitas una
función del código, bórrala también del servidor (`firebase functions:delete <nombre> --region europe-west1 --force`):
el despliegue sin preguntas no la borra.

**La app de Android no se entera de nada de esto**: lleva la web empaquetada. Para que tenga los cambios hace falta una
versión nueva (`versionCode` + `npm run android` + `.aab`, ver `docs/publicar-en-google-play.md`). Dilo al terminar si
el cambio se ve en la app; una captura sin barra de direcciones suele ser de la app.

## Tropiezos conocidos

- **`npm ci` / `npm install` con un `vite` abierto** (de esta u otra sesión, p. ej. un `vite preview` en el puerto
  4173) falla con `EPERM` en `@rolldown/binding-win32-x64-msvc/*.node` y deja `node_modules` a medias. Antes de
  reinstalar, mira los procesos: `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Select ProcessId, CommandLine`.
  No cierres procesos que no son tuyos sin preguntar. Mientras tanto se puede publicar desde un worktree que tenga su
  propio `node_modules`.
- **Una dependencia nueva instalada en un worktree** no llega al `node_modules` principal: después del merge, instálala
  también en `app/` del árbol principal antes de `npm run deploy`.
- **`TaskStop` no siempre mata el proceso hijo de `npx vite`**: comprueba el puerto y cierra con `Stop-Process` los
  procesos tuyos (los que lanzaste en esta sesión).
- **Android** (`npm run android`) solo hace falta cuando cambia algo nativo (plugins, `AndroidManifest.xml`, recursos)
  o para generar una versión para la tienda; la web no lo necesita.

## Al terminar

Cuenta al usuario qué se ha publicado y dónde, en pocas líneas, y si algo no se ha podido (con el motivo).
