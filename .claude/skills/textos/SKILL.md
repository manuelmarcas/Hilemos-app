---
name: textos
description: Cómo se escriben los textos de Hilemos — interfaz (botones, avisos, confirmaciones, errores, ayudas, avisos del chat), comentarios del código, mensajes de commit y documentación: en castellano, claros, con «comillas latinas», explicando qué va a pasar. Úsala siempre que escribas o cambies un texto que verá el usuario, un diálogo de confirmación, un mensaje de error, un comentario o la documentación del proyecto.
---

# Textos de Hilemos

La app la usa gente que no es técnica para quedar con su grupo. Los textos tienen que entenderse a la primera y no
asustar. Todo va en **castellano de España**: la interfaz, los comentarios del código, los commits y la documentación.

**El tono es desenfadado y cercano**: Hilemos es sobre todo para quedar con los amigos y la familia (la cena de
Navidad, el cumple, la escapada), no una herramienta de empresa. Se nota sobre todo en lo que se lee fuera de la app
(la ficha de Google Play en `docs/ficha-google-play/`, la imagen destacada, los avisos para todos de `config/app`):
ejemplos de planes de verdad, frases cortas, algún guiño. Los grupos grandes, las asociaciones y lo «profesional»
van en segundo plano.

## En la interfaz

- **Frases normales y cortas**, con su punto. Tuteo («Pulsa en los días que te vengan bien»).
- **Lo que habla de quien lee, en segunda persona**, aunque el mismo texto vaya en tercera para los demás: «aún no
  has votado», «Has elegido 3 opciones», «Entraste el…», «Te han denunciado», y en el chat «Has cambiado el título» (sin «Tú» ni tu nombre)
  o «te ha vuelto a admitir» (`sysTextFor` en `lib/model.ts`).
- **Comillas latinas** para nombrar algo de la interfaz o un valor: «Guardar cambios», «Cena de Navidad».
- **Botones con la acción concreta**, en infinitivo o como acción: «Descartar cambios», «Salir de la votación»,
  «Finalizar: es definitivo». Nunca «Aceptar» o «Sí» si se puede decir qué hace.
- **Confirmaciones**: el título pregunta («¿Descartar los cambios?»), el texto cuenta **qué va a pasar** y si tiene
  vuelta atrás, y los dos botones dicen las dos salidas («Seguir editando» / «Descartar cambios»). Lo destructivo va
  marcado como peligroso (`danger: true`) y la opción segura es la que tiene el foco.
- **Errores**: qué ha pasado y qué puede hacer la persona («No se pudieron guardar los cambios. Comprueba tu
  conexión»), sin códigos ni jerga («permission-denied», «Firestore»).
- **Avisos flotantes**: confirman lo que acaba de pasar en pocas palabras («Cambios guardados»).
- **Avisos del chat** al editar (`app/src/lib/changes.ts`): frases sin sujeto que se leen detrás del nombre
  («ha añadido el viernes 18 de diciembre»).
- **Nada de mayúsculas para énfasis** ni signos de exclamación salvo saludo o celebración puntual.
- **Fechas y horas** con las funciones de `app/src/lib/dates.ts` («viernes 4 de diciembre», «vie 4 dic», «18:00»).

## En el código y la documentación

- **Comentarios en castellano** que explican el porqué y lo que no se ve en el código (una regla, un límite, un caso
  raro), no lo que ya dice la línea. Las funciones exportadas llevan un comentario `/** … */` de una o dos líneas.
- **Nombres** de variables y funciones en inglés corto o castellano según el archivo (sigue el estilo del que tocas);
  las clases CSS en castellano o inglés según el bloque, siempre en BEM.
- **Commits**: primera línea en castellano que diga qué cambia para el usuario; debajo, el porqué y lo importante.
- **README y design system**: se actualizan en el mismo cambio que el código que describen.
