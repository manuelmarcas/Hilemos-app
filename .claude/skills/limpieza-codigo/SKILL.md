---
name: limpieza-codigo
description: Revisa y limpia el código de Hilemos — código muerto, exportaciones sin usar, clases CSS que nadie usa o que no existen, selectores fuera de BEM, duplicados, bucles y cálculos innecesarios o repetidos, lecturas de Firestore de más y mejoras concretas. Úsala cuando el usuario pida limpiar, revisar o mejorar el código, buscar código muerto o CSS sin usar, después de un cambio grande o de un renombrado, y antes de dar por terminada una refactorización.
---

# Limpieza del código

La limpieza se hace con datos, no a ojo: primero los scripts, después la lectura con criterio, y **ningún borrado sin
comprobar** que de verdad no se usa (los scripts trabajan por nombre y pueden equivocarse con lo dinámico).

## 1. Los scripts (desde la raíz del repo)

```bash
node .claude/skills/limpieza-codigo/scripts/clases-css.mjs        # CSS sin usar y clases sin estilo
node .claude/skills/limpieza-codigo/scripts/selectores-bem.mjs    # selectores fuera de la convención BEM
node .claude/skills/limpieza-codigo/scripts/exports-sin-usar.mjs  # exportaciones que nadie importa
cd app && npx tsc --noEmit                                        # variables y parámetros sin usar (noUnusedLocals)
```

- **`clases-css.mjs`**: entiende `cls()`, `bem()` (con modificadores calculados), plantillas y la prop `base` de
  `VoteBtn`. «Usadas sin estilo» incluye cosas legítimas: elementos BEM sin reglas propias, ganchos para JavaScript y
  las clases `dark`/`light` del selector de emojis. Antes de borrar una regla «sin usar», búscala con Grep por partes
  (puede montarse con `${…}`).
- **`exports-sin-usar.mjs`**: «sin usar» se puede borrar; «solo en su archivo» → quitar el `export`, salvo tipos que
  forman parte de la interfaz pública del módulo (props, `Store`, tipos de `types.ts`), que es razonable dejar.
- **`selectores-bem.mjs`**: lo que sale se corrige como dice la skill `estilo-y-css` (mezcla, variable o clase de
  elemento).

## 2. Leer con criterio

Recorre los archivos tocados (o los más grandes si es una revisión general) buscando:

- **Duplicados**: dos funciones o trozos de JSX que hacen lo mismo → uno en su sitio (skill `codigo-limpio`).
- **Bucles y cálculos de más**: recorrer la misma lista varias veces cuando basta una, buscar con `find` dentro de un
  bucle (usa un `Map` o un `Set`), recalcular en cada render algo caro que no cambia (`useMemo` solo si se nota),
  `JSON.stringify` para comparar en caliente.
- **Firestore**: lecturas o suscripciones de más (cada lectura cuesta y el plan es gratuito); escuchar una colección
  entera cuando basta un documento; escrituras que no cambian nada (compara antes de escribir, como hace `PollPage` con
  el nombre del voto).
- **Estado sobrante**: estado que se puede calcular a partir de otro, efectos que copian props a estado.
- **Restos**: comentarios que ya no son verdad, `console.log`, código comentado, ramas imposibles, `TODO` viejos.
- **CSS**: reglas que repiten lo que ya da el bloque base, `!important` que se puede evitar con el orden, valores que
  deberían ser tokens.

## 3. Cambiar sin romper

- Cambios pequeños y separados por tema; cada uno compila (`npm run build`).
- Si tocas CSS o clases sin querer cambiar el aspecto: capturas antes y después con la skill `probar-en-navegador`
  (deben salir iguales) y, si hay estados `:hover`/`:focus`, también `estados.mjs`.
- Si tocas lógica: el recorrido funcional de esa misma skill.
- Cuenta al usuario qué has quitado o cambiado y por qué; lo que dudes, pregúntalo en vez de borrarlo.
