---
name: codigo-limpio
description: Cómo escribir código nuevo en Hilemos para que quede limpio — dónde va cada cosa (lib, state, components, pages), cuándo sacar un componente o una función y reutilizar la que ya existe, la lógica fuera de los componentes, sin duplicar. Úsala siempre que vayas a añadir una función, una pantalla, un componente o un bloque de lógica en app/src, o a cambiar uno grande, antes de escribir: primero se busca si ya existe algo que sirva.
---

# Código limpio en Hilemos

El objetivo es que cada cosa esté en un solo sitio, con un nombre que diga lo que hace, y que una función nueva se
construya con las piezas que ya hay. Antes de escribir, **busca**: casi todo lo que se repite en la app ya tiene su
función o su componente.

## Dónde va cada cosa (`app/src`)

| Carpeta | Qué va | Ejemplos |
| --- | --- | --- |
| `lib/` | Lógica pura, sin React ni pantalla. Lo que se puede probar con un test | `model.ts` (recuento, etiquetas, reglas), `dates.ts`, `changes.ts`, `util.ts` (`bem`, `cls`) |
| `lib/store/` | Acceso a datos: la interfaz `Store` con dos versiones, Firebase y demo, que se comportan igual | `firebase.ts`, `demo.ts` |
| `state/` | Estado compartido y acciones con efectos (hooks y contextos) | `session.tsx`, `ui.tsx` (`toast`, `confirm`), `listActions.ts`, `duplicate.ts` |
| `components/` | Piezas de interfaz que usan varias pantallas | `Icon`, `Avatar`, `Dialog`, `ConfirmDialog`, `Tooltip`, `EmojiButton` |
| `pages/` | Pantallas: juntan datos, acciones y componentes | `Create.tsx`, `Home.tsx`, `poll/PollPage.tsx` y sus partes en `poll/` |
| `hooks/` | Hooks genéricos de interfaz | `useDismiss` (menús que se cierran solos) |

## Cuándo sacar algo aparte

- **Un trozo de JSX que se repite** (dos veces o más) → componente. Si solo lo usa una pantalla, va junto a ella
  (`pages/poll/Boards.tsx`); si lo usan varias, a `components/`.
- **Un trozo de pantalla largo con sentido propio** (un panel, una tarjeta, un formulario) → componente aunque se use
  una vez: la pantalla queda legible como un índice (`PollPage` pinta `TiebreakCard`, `Summary`, `PeopleTable`…).
- **Cálculos sobre los datos** (filtrar, contar, decidir si algo se puede hacer) → función en `lib/`, no dentro del
  componente. Así se reutiliza y se puede probar.
- **Una acción con efectos que se usa desde varios sitios** (salir, archivar, duplicar) → hook en `state/`.
- **Un patrón visual repetido** → bloque CSS en BEM (skill `estilo-y-css`), no estilos copiados.

## Reutilizar antes de crear

Antes de escribir, busca con Grep si ya existe:

- Avisos y confirmaciones: `useUi()` → `toast`, `confirm`, `undoable`, `share`. No hagas diálogos propios para eso.
- Fechas: `lib/dates.ts`. Plurales: `plural()` de `model.ts`. Etiquetas de casillas: `slotLabel`, `unitLabel`.
- Permisos: `isAdmin`, `memberStatus`, `isRestricted` de `model.ts`.
- Clases: `bem()` y `cls()`. Iconos: `<Icon>`. Avatares: `<Avatar>`. Menús desplegables: `useDismiss`/`useMenuKeys`.

Si algo parecido existe pero no encaja del todo, **amplíalo** (un parámetro opcional, una prop) en vez de copiarlo.

## Al escribir

- Componentes como funciones, props tipadas en línea o con una interfaz si son muchas. Estado lo más abajo posible.
- Nada de lógica de datos dentro del JSX: calcula antes del `return` con nombres claros.
- Los dos almacenes (`demo.ts` y `firebase.ts`) cambian a la vez y hacen las mismas comprobaciones (skill
  `cambio-de-modelo`).
- Errores visibles para el usuario con `errMsg()`; nunca un `catch` vacío sin un comentario de por qué se ignora.
- Comentarios en castellano que expliquen el porqué (skill `textos`).
- TypeScript estricto: sin `any` ni `as` para tapar un tipo mal puesto.

## Antes de terminar

- `npm run build` en `app/` (tipos y compilación).
- La skill `limpieza-codigo` sobre lo que has tocado: que no quede nada sin usar ni duplicado.
- Probado en el navegador (skill `probar-en-navegador`).
