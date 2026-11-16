# Votaciones 2.0 (React + Vite + TypeScript)

Migración de la web de la carpeta raíz a React, como paso previo a la app móvil con Capacitor.
Hace lo mismo que la web original, con el mismo diseño (`src/styles.css` es una copia de `css/styles.css`),
los mismos datos de Firebase y las mismas rutas (`#/`, `#/nueva`, `#/perfil`, `#/v/<id>`), así que los
enlaces ya compartidos siguen funcionando.

La web original (raíz del repo) no se ha tocado y sigue siendo la publicada hasta que se sustituya.

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
src/styles.css             Estilos (copia de css/styles.css)
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

## Pendiente para Capacitor

- Login con Google nativo (`signInWithPopup` no funciona dentro del WebView): `@capacitor-firebase/authentication`.
- Enlaces de las votaciones que abran la app (App Links / Universal Links) y `pollUrl` apuntando al dominio público.
