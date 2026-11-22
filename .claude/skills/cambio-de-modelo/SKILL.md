---
name: cambio-de-modelo
description: Lista de todo lo que hay que tocar en Hilemos cuando cambia el modelo de datos — un campo nuevo en una votación, un voto, un mensaje o el perfil, un tipo de votación nuevo, una colección o un cambio de permisos. Úsala siempre que un cambio añada, quite o cambie algo de lo que se guarda en Firestore o de quién puede leerlo o escribirlo, aunque parezca pequeño: en este proyecto un dato vive en tipos, modelo, reglas, almacén demo, almacén Firebase, funciones, plantillas, documentación y política de privacidad a la vez, y olvidar uno rompe algo en silencio.
---

# Cambiar el modelo de datos

En Hilemos un mismo dato aparece en muchos sitios. Las reglas de Firestore no ven el código de la app, y el modo demo
imita las reglas a mano: si se actualiza uno y no el otro, algo funciona en demo y falla en la web real (o al revés),
y nadie se entera hasta que un usuario lo sufre. Recorre la lista entera cada vez.

## La lista

1. **Tipos** — `app/src/lib/types.ts`: la interfaz (`PollData`, `Vote`, `ChatMessage`, `Profile`, `LibraryEntry`…), con
   un comentario de qué es y cuándo falta. Si es opcional, di qué significa que no esté (las votaciones viejas no lo
   tienen).
2. **Modelo** — `app/src/lib/model.ts`: funciones puras que lo interpretan (recuento, etiquetas, validaciones). Todo lo
   que sea lógica sin pantalla va aquí, no en los componentes, para poder probarlo.
3. **Reglas** — `firestore.rules`: quién lo crea, quién lo cambia y qué forma tiene (tipo y tamaño). Si lo cambian los
   administradores, añádelo a `keys.hasOnly([...])` de `ownerUpdate()` con su validación. Lo que las reglas no pueden
   comprobar (necesitaría leer muchos documentos), dilo en un comentario y compruébalo en la app.
4. **Almacén demo** — `app/src/lib/store/demo.ts`: las mismas comprobaciones que las reglas (lanza `fail("permission-denied")`).
5. **Almacén Firebase** — `app/src/lib/store/firebase.ts` y la interfaz `Store` de `types.ts` si hace falta una
   operación nueva (y entonces también en demo).
6. **Funciones** — `functions/index.js`, si el dato afecta a los avisos (aunque estén sin desplegar).
7. **Plantillas** — `app/src/state/duplicate.ts` (`templateFromPoll`, `CreateTemplate`): duplicar y editar copian la
   votación; un campo nuevo que no se copie se pierde al duplicar.
8. **Editar** — si el dato se puede cambiar después de crear: `Create.tsx` en modo edición, `describeChanges` en
   `app/src/lib/changes.ts` (el aviso en el chat) y que no deje quitar lo que ya tiene votos.
9. **Documentación** — tabla «Modelo de datos (Firestore)» del `README.md` raíz y la sección de la función en
   `app/README.md`.
10. **Privacidad** — si es un dato personal nuevo (o deja de guardarse uno), `app/src/pages/Legal.tsx`, sección
    «Qué datos tratamos», y la fecha de «Última actualización».

## Probar

- `npm test` y `npm run build` en `app/`.
- En el navegador (skill `probar-en-navegador`), en modo demo: crear, cambiar y borrar con el dato nuevo; con dos
  usuarios si afecta a permisos (el que puede y el que no).
- Si cambian las reglas: publicarlas (skill `publicar`) y probar el caso que antes fallaba contra Firestore de verdad
  si se puede; el modo demo no ejecuta `firestore.rules`.

## Compatibilidad

Las votaciones ya creadas no tienen el campo nuevo. La app tiene que funcionar sin él (valor por defecto en el modelo)
y las reglas no deben exigirlo al actualizar algo que no lo toca.
