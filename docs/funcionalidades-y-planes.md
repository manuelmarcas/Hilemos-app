# Funcionalidades de Hilemos y planes: gratis y premium

Este documento recoge todo lo que hace Hilemos hoy y lo decidido sobre qué va en el plan premium y qué límites tiene
el plan gratuito (lo que falta por cerrar pone «Pendiente»). Al final hay una lista de funcionalidades que aún no
existen, tres secciones
que detallan cómo funcionarían las decisiones más delicadas: qué pasa cuando una votación cambia de manos (§8), el
límite de votaciones abiertas a la vez (§9) y qué avisos son gratis y cuáles premium (§10); los planes de futuro (§11) y
lo que falta por hacer, en orden (§12).

Cada fila lleva un número (por ejemplo, **2.2.10**) para que puedas responder con tus decisiones de forma sencilla:
«2.2.10 premium, 3.1 sí con 5 votaciones…».

En las tablas:

- **Propuesta**: en qué plan la pondría (Gratis, Premium o Gratis con límite).
  - **Gratis**: lo puede usar cualquiera, sin límite.
  - **Premium**: solo con el plan de pago.
  - **Gratis con límite**: gratis hasta una cifra; por encima, premium.
- **¿Para premium?**: lo bien que creo que encaja en premium, es decir, cuánto anima a pagar sin estropear lo
  básico.
  - **★★★**: de las mejores para premium.
  - **★★**: buena candidata.
  - **★**: posible, pero diferencia poco.
  - **No**: debe ser gratis.
- **Decisión**: lo que has decidido. «Pendiente» cuando falta algo por cerrar.

---

## 1. Criterios para decidir

| N.º | Criterio |
| --- | --- |
| 1.1 | **Quien vota nunca paga.** Los participantes llegan con un enlace y tienen que poder votar sin pagar ni registrarse. Si no, la votación no sale adelante. Además, cada votación trae gente nueva: es la forma en que Hilemos crece. Paga quien organiza. |
| 1.2 | **Lo básico tiene que ser gratis y completo**: crear, compartir, votar, ver resultados, desempatar y hablar en el chat. Si la primera votación sale mal por un límite, no habrá una segunda. |
| 1.3 | **Premium es más volumen** (más votaciones y más gente), **más control** (privacidad y coorganizadores), **automatización** (plazos, recordatorios y avisos) y **mejor acabado** (sin marca, exportar y personalizar). |
| 1.4 | **Lo que cuesta dinero de verdad encaja en premium.** Es lo que necesita servidor: avisos, recordatorios y correos. |
| 1.5 | **Un límite tiene que entenderse en una frase.** Además, conviene poder comprobarlo con las reglas de la base de datos, sin servidor. |
| 1.6 | **Las funciones de pago dependen de quien gestiona la votación en cada momento**: su creador o quien la ha heredado. Lo ya configurado se mantiene siempre para los participantes; lo que cambia es lo que el gestor puede hacer a partir de ahí. Detalle en §8. |

---

## 2. Inventario de funcionalidades

### 2.1 Cuenta y entrada

| N.º | Funcionalidad | Qué hace | Propuesta | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- |
| 2.1.1 | Entrar con Google | Inicio de sesión con la cuenta de Google (en la web y en Android). | Gratis | No | Gratis |
| 2.1.2 | Entrar con el correo | Un enlace al correo, sin contraseña; sirve en cualquier dispositivo. | Gratis | No | Gratis |
| 2.1.3 | Entrar sin cuenta | Solo con un nombre. Hilemos da una **clave de acceso** de 20 caracteres para volver a entrar. | Gratis | No | Gratis |
| 2.1.4 | Volver con la clave | Recupera la cuenta sin registro tras cerrar sesión, desinstalar o cambiar de móvil. | Gratis | No | Gratis |
| 2.1.5 | Crear una clave nueva | Anula la anterior. Sirve si se ha perdido. | Gratis | No | Gratis |
| 2.1.6 | Guardar la cuenta sin registro | La pasa a un correo o a Google sin perder votaciones ni votos. | Gratis | No | Gratis |
| 2.1.7 | Perfil | Nombre visible e imagen (o inicial sobre un color propio). | Gratis | No | Gratis |
| 2.1.8 | Tema | Claro, oscuro o automático. | Gratis | No | Gratis |
| 2.1.9 | Eliminar la cuenta | Sale de todas sus votaciones y borra sus datos. Google Play lo exige. | Gratis (obligatorio) | No | Gratis |
| 2.1.10 | Modo demo | Herramienta interna, no es del producto: solo se activa añadiendo `?demo` a la dirección y ningún botón lleva a ella. Guarda los datos en el navegador, sin Firebase, y sirve para desarrollar y probar (cada pestaña hace de una persona distinta). | No aplica | No | No aplica |

> Para pagar hace falta una cuenta con Google o con correo. Una cuenta sin registro solo se recupera con la clave,
> y no es buena base para una suscripción.

### 2.2 Crear una votación

| N.º | Funcionalidad | Qué hace | Propuesta | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- |
| 2.2.1 | Votación por días | Calendario de días; en cada día, hasta 4 opciones (comida, cena…) con emoji y nombre. | Gratis | No | Gratis |
| 2.2.2 | Votación por horas | Franjas periódicas (cada 30 minutos, 1 hora o 2 horas) u horas sueltas distintas en cada día. | Gratis | No | Gratis |
| 2.2.3 | Votación por semanas | Se vota la semana entera. | Gratis | No | Gratis |
| 2.2.4 | Votación por meses | Se vota el mes entero. | Gratis | No | Gratis |
| 2.2.5 | Votación de opciones libres | Una lista sin fechas (restaurante, regalo, destino…), de 2 a 30 opciones con nombre y emoji opcional. | Gratis | No | Gratis |
| 2.2.6 | Varios meses y atajos | Elegir varios meses; marcar todos, de lunes a viernes o fines de semana. | Gratis | No | Gratis |
| 2.2.7 | Opciones por día | De 1 a 4 opciones por día, con vista previa de la casilla. | Gratis (posible límite: 2 gratis, 4 premium) | ★ | Gratis, las 4 (ver 3.5) |
| 2.2.8 | Título y descripción | Con selector de emojis en el ordenador. | Gratis | No | Gratis |
| 2.2.9 | Votación anónima | Solo se ven los totales, no quién votó qué. | Gratis | No | Gratis |
| 2.2.10 | Plazo para votar | Se cierra sola en el día y la hora elegidos. Ya está hecho. | Premium | ★★ | Premium |
| 2.2.11 | Máximo de personas | De 2 a 150 por votación; se puede cambiar después. | Gratis con límite (p. ej. 25 gratis) | ★★★ | Gratis hasta 20; premium hasta 150 |
| 2.2.12 | Con aprobación | El organizador acepta o rechaza a cada persona que entra. | Premium | ★★★ | Premium |
| 2.2.13 | Solo estos correos | Solo entran los correos de una lista (hasta 150). | Premium | ★★★ | Premium |
| 2.2.14 | Grupo al crearla | Se guarda directamente en uno de sus grupos. | Gratis | No | Gratis |
| 2.2.15 | Duplicar | Crear otra igual, como plantilla (sin el plazo). | Gratis | ★ | Premium. Así no hace falta comprobar qué se copia de una votación premium; quien no paga crea la votación de cero. |
| 2.2.16 | Editar | Nombre y descripción siempre; añadir días, horas u opciones (sin quitar lo que tiene votos). Cada cambio se avisa en el chat. | Gratis | No | Gratis |

### 2.3 Votar

| N.º | Funcionalidad | Qué hace | Propuesta | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- |
| 2.3.1 | Calendario para votar | Pulsar las casillas (día y opción, semana, mes u hora) en las que se puede. | Gratis | No | Gratis |
| 2.3.2 | Cambiar el voto | Hasta que se cierre o se acabe el plazo. | Gratis | No | Gratis |
| 2.3.3 | Votar sin cuenta | En las votaciones abiertas, con solo un nombre. | Gratis | No | Gratis |
| 2.3.4 | Ver qué votó cada uno | Salvo en las anónimas. | Gratis | No | Gratis |

### 2.4 Resultados

| N.º | Funcionalidad | Qué hace | Propuesta | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- |
| 2.4.1 | Más votadas | Las 5 mejores (los empates comparten puesto) y quién votó cada una. | Gratis | No | Gratis |
| 2.4.2 | La más votada en el calendario | Un borde verde en la mejor casilla de cada opción. | Gratis | No | Gratis |
| 2.4.3 | Desempate | Cada persona elige una sola de las empatadas; abierto se puede anular; finalizado con ganadora es definitivo (no se reabre); sin ganadora, solo se repite. | Gratis | No | Gratis |
| 2.4.4 | Desempate que se ajusta solo | Si alguien se va y cambia el empate, se ajusta solo al momento y quien entra ve un aviso de lo que ha pasado. | Gratis | No | Gratis |
| 2.4.5 | Imagen del resultado | Una tarjeta PNG para compartir, con la marca Hilemos. Es la misma decisión que 3.7. | Gratis (premium: sin marca o personalizada) | ★★ | Gratis con la marca (3.7); premium, sin ella. Personalizarla iría con 7.18. |
| 2.4.6 | Añadir al calendario | Google Calendar o un archivo .ics para Apple, Outlook y otros. | Gratis | No | Gratis |
| 2.4.7 | Avisar a quien falta | Un mensaje con los nombres de quien falta por votar, para WhatsApp o el menú de compartir. | Gratis | ★ (los recordatorios automáticos, 7.7, sí son ★★★) | Gratis |
| 2.4.8 | Exportar resultados | Menú ⋯ (administradores): CSV para guardar la votación, Excel con formato (Resultados, Votos y Participantes) e informe en PDF. En las anónimas, sin nombres. Ver 7.10. | CSV gratis; Excel y PDF premium | ★★★ (Excel y PDF) | CSV gratis; Excel y PDF premium. Hasta que haya planes, todo disponible. |

### 2.5 Participantes y gestión

| N.º | Funcionalidad | Qué hace | Propuesta | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- |
| 2.5.1 | Tabla de participantes | Lo que ha votado cada uno, desplegable por persona. | Gratis | No | Gratis |
| 2.5.2 | Buscador y filtros | A partir de 10 personas: buscar y filtrar por quién ha votado y quién no. | Gratis | No | Gratis |
| 2.5.3 | «Se fueron» | Quien salió con la votación cerrada, aparte; sus votos siguen contando. Si vuelve con el enlace, recupera su nombre en sus votos y en el chat. | Gratis | No | Gratis |
| 2.5.4 | Cerrar y reabrir | Al reabrir se anula el desempate. | Gratis | No | Gratis (reabrir cuenta en el límite de abiertas, §9) |
| 2.5.5 | Hacerla anónima después | Sin vuelta atrás, para no destapar votos. | Gratis | No | Gratis |
| 2.5.6 | Administradores | El creador nombra coorganizadores con un clic, desde «Gestionar participantes» (menú ⋯); gestionan como él, salvo eliminarla y nombrar a otros. | Premium | ★★★ | Premium |
| 2.5.7 | Delegado | Si el creador se va, la votación pasa a un administrador o a otro participante. | Gratis (es una garantía) | No | Gratis; con preferencia por un administrador con premium (§8) |
| 2.5.8 | Solicitudes | Aceptar, rechazar o volver a admitir (en las de aprobación). Con muchas: se pliega, se busca y se aceptan o rechazan varias a la vez. | Va con 2.2.12 | ★★★ (con 2.2.12) | Va con 2.2.12; aceptar y rechazar sigue funcionando aunque el gestor no tenga premium (§8) |
| 2.5.9 | Acceso y plazas | Cambiar después el máximo de personas y la lista de correos. El máximo no puede bajar de las plazas ocupadas: el aviso sale al momento, con un enlace a «Gestionar participantes» para expulsar antes a alguien. Quitar el correo de alguien que ya está dentro le expulsa, después de avisar y confirmarlo. | Va con 2.2.11 y 2.2.13 | ★★ (con 2.2.11 y 2.2.13) | Va con 2.2.11 y 2.2.13. Hecho: quitar el correo de alguien que ya está dentro le expulsa (o rechaza su solicitud, si estaba pendiente), con un aviso bajo la lista y una confirmación que dice quién es y qué le pasará. |
| 2.5.10 | Quitar el plazo | Con la votación abierta, deja de tener fecha de cierre. Si el plazo ya ha pasado, reabrir la votación quita el plazo y se pueden volver a cambiar los votos. | Va con 2.2.10 | ★★ (con 2.2.10) | Va con 2.2.10. Probado. |
| 2.5.11 | Eliminar la votación | La borra para todos. | Gratis | No | Gratis |
| 2.5.12 | Salir de la votación | Avisa de lo que pasa con los votos según el estado de la votación. | Gratis | No | Gratis |
| 2.5.13 | Gestionar participantes y expulsar | Menú ⋯: nombrar y quitar administradores con un clic y expulsar a alguien (con confirmación). Quien es expulsado pierde sus votos, libera su plaza y no puede volver con el enlace; se le puede volver a admitir. Ver 7.20. | Gratis (expulsar); administradores, premium (2.5.6) | No (es moderación) | Expulsar, gratis para cualquier administrador; a otro administrador solo le expulsa el creador. Nombrar administradores, premium (2.5.6). |

> **Correos y expulsar (2.5.9).** Cada participante de una votación privada apunta con qué correo entró. Solo lo ven
> quienes la administran (no va en el voto, porque los votos los leen todos). Así, al quitar un correo de la lista,
> la app sabe a quién corresponde. Quien entró antes de que existiera esto lo apunta en cuanto vuelve a abrir la
> votación. Si no ha vuelto, no se le puede reconocer por su correo, y se le expulsa desde «Gestionar participantes».

### 2.6 Chat

| N.º | Funcionalidad | Qué hace | Propuesta | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- |
| 2.6.1 | Chat de cada votación | Para rematar el plan; funciona también con la votación cerrada. | Gratis | No | Gratis |
| 2.6.2 | Mensajes sin leer | Contador en la pestaña, sincronizado entre dispositivos, y un bocadillo con un punto en la tarjeta de «Mis votaciones». | Gratis | No | Gratis |
| 2.6.3 | Emojis | Selector propio en el ordenador; en el móvil, el del teclado. | Gratis | No | Gratis |
| 2.6.4 | Botón flotante del chat | Mientras miras el calendario, un botón redondo abajo a la derecha, con los mensajes sin leer, te lleva al chat. | Gratis | No | Gratis |

Se ven los últimos 200 mensajes y cada mensaje tiene como mucho 500 caracteres.

**Mensajes sin leer (2.6.2), caso por caso.** Sin avisos push: se probaron y se quitaron, porque cada mensaje costaba
una lectura por participante. Ahora quien escribe apunta en la votación la hora del último mensaje (`chatAt`), en la
misma escritura, y «Mis votaciones» la compara con lo último que has visto (`chatSeenAt`, en tu lista).

| Caso | Qué pasa |
| --- | --- |
| Ana escribe y Luis no tiene el chat abierto | En «Mis votaciones» de Luis sale el bocadillo junto al título. En la votación, el contador de la pestaña y del botón flotante. |
| Luis tiene «Mis votaciones» abierta mientras Ana escribe | El bocadillo sale al volver a entrar en la pantalla: se leen las votaciones cada vez que se entra, no en directo. |
| Luis abre el chat | Se marca como visto hasta el último mensaje y el bocadillo desaparece, también en sus otros dispositivos. |
| Luis tiene el chat abierto y a la vista mientras Ana escribe | Se da por leído al momento. Con la app en segundo plano, no: se marca al volver. |
| Escribe Luis | Lo suyo nunca le cuenta como sin leer. |
| Un administrador edita la votación y deja un aviso en el chat | Cuenta como mensaje sin leer, igual que en el contador de la pestaña. |
| Luis entró después del último mensaje | No le sale: lo de antes de añadirla a su lista no es para él. |
| Luis está pendiente de aprobación, rechazado o expulsado | No ve el chat: al abrir la votación se marca como visto y el bocadillo no se queda encendido. |
| Alguien escribe con el reloj del móvil adelantado | El bocadillo puede quedarse encendido hasta que Luis abra el chat, que lo marca visto hasta esa hora. |
| Los mensajes de antes de este cambio | No encienden el bocadillo; el primero que llegue después, sí. |

**Coste.** Una escritura más por mensaje (en la votación, junto al mensaje) y, al entrar en «Mis votaciones», una
lectura por votación de la lista. Quien tiene la votación abierta recibe el cambio (una lectura más por mensaje y
persona conectada, que ya recibía el mensaje).

---

## 3. Límites del plan gratuito

| N.º | Límite | Ejemplo | A favor | En contra | ¿Hace falta servidor? | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3.1 | **Votaciones abiertas a la vez** | 3 abiertas; las cerradas no cuentan | No castiga a quien organiza de vez en cuando; se libera cerrando una | Cerrar y reabrir para esquivarlo (se arregla contando también al reabrir) | No: un contador en el perfil y las reglas | ★★★ | Sí, 3 abiertas. Caso por caso en §9. |
| 3.2 | **Votaciones creadas al mes** | 3 al mes | Muy fácil de explicar | Castiga los picos (Navidad, verano); el contador vuelve a cero cada mes | No: un contador con el mes, en las reglas | ★★ (mejor 3.1) | No como límite. Los picos se cubren con la suscripción mensual (4.1). |
| 3.3 | **Personas por votación** | 25 gratis; 150 en premium | Pagan los grupos grandes: asociaciones, clubes, empresas, bodas | Un grupo grande de amigos se topa con él | No: ya existen `maxPeople` y `members` | ★★★ | Sí: 20 gratis; 150 en premium |
| 3.4 | **Funciones de control** | Aprobación, solo correos, administradores y plazo en premium | Lo básico sigue completo; paga quien necesita control | Hay que elegir bien qué es «avanzado» | No: las reglas miran el plan al crear o cambiar | ★★★ | Sí |
| 3.5 | **Opciones por día** | 2 gratis; 4 en premium | Sencillo | Diferencia poco y puede frustrar al crear | No | ★ | No: si la votación pasa a alguien sin premium no se podrían quitar opciones que ya tienen votos |
| 3.6 | **Caducidad** | Las gratuitas se borran N meses después del último movimiento | Ahorra almacenamiento | Molesta a quien quiere recordar; hay que avisar antes | Sí: una tarea programada | ★ | Sí: caducan las gestionadas por alguien sin premium; las de premium, no. 12 meses sin movimiento, con aviso 30 días antes. |
| 3.7 | **Marca en lo compartido** | Imagen del resultado con «Hecho con Hilemos» | Publicidad gratis cada vez que se comparte | Ninguno serio | No | ★★ | Sí |
| 3.8 | **Tope de abiertas a la vez también en premium** | 50 abiertas | Nadie paga un mes para «fabricar» votaciones para otros a gran escala; quien organiza tanto encaja en el plan de organizaciones (4.3) | Casi nadie lo notará | No: el mismo contador de 3.1 | — | Sí, 50 abiertas |

**Decisión: 3.1 + 3.3 + 3.4 + 3.6 + 3.7 + 3.8.**

- 3 votaciones abiertas a la vez (50 en premium).
- Hasta 20 personas por votación (150 en premium).
- Aprobación, solo correos, administradores y plazo, en premium.
- Las votaciones gratuitas caducan; las de premium, no.
- La imagen del resultado lleva la marca; con premium, sin ella (2.4.5).
- Votar, resultados, desempate, chat, grupos y compartir: gratis y sin límite.

**Sobre la caducidad (3.6).** Decidido: 12 meses sin movimiento (un voto, un mensaje o un cambio), estén abiertas
o cerradas, con un aviso 30 días antes en la app y por push. El aviso ofrece descargar la votación en CSV (7.10).

- **12 y no 6:** muchas votaciones se repiten cada año (la cena de Navidad, el viaje de verano). Con 6 meses, la del
  año pasado ya no estaría cuando se quiere consultar o, con premium, duplicar.
- **Sin movimiento y no desde el cierre:** las gratuitas no tienen plazo y muchas nunca se cierran. Contando desde el
  cierre, esas no caducarían nunca.
- **El aviso es el momento de pasarse a premium:** «Esta votación se borrará el 3 de marzo. Con premium se guarda».
  Un mensaje en el chat también la mantiene, y está bien que sea así.
- **El ahorro es pequeño**, porque se guarda poco (6.3). Lo que aporta es incentivo para premium y no guardar datos
  personales sin necesidad, que es lo que pide el RGPD.

---

## 4. Formas de cobrar

| N.º | Modelo | Ejemplo | Para quién | Recomendación | Decisión |
| --- | --- | --- | --- | --- | --- |
| 4.1 | Suscripción de quien organiza | 2,99 €/mes o 24,99 €/año | Quien organiza a menudo: grupos de amigos, familia, deporte | ★★★ (la base) | 1,49 €/mes y 9,99 €/año. El mensual sirve para los picos (un diciembre, un julio); el anual ahorra un 44 % frente a 12 meses sueltos (17,88 €). |
| 4.2 | Pase para una votación | 1,99 € desbloquea premium en una sola votación | Eventos puntuales: una boda, un viaje, una cena de empresa | ★★★ (junto a 4.1) | 0,60 €. Da a esa votación todo lo de premium, para un solo uso: hasta su primer cierre, y si sigue abierta a los 60 días, se cierra sola. Es de la votación, no de la persona: si la hereda alguien sin premium, sigue siendo premium (§8). Cuenta en las «abiertas a la vez» (§9). |
| 4.3 | Plan para organizaciones | Precio por organizador, con facturación | Asociaciones, clubes, academias, empresas | ★★ (más adelante) | Más adelante: más personas aún y funciones propias por definir |
| 4.4 | Primera votación premium gratis | Cada cuenta con Google o correo tiene, una vez, un pase (4.2) regalado | Quien aún no sabe qué da premium: lo prueba en una votación de verdad | ★★★ | Sí: una vez por cuenta, solo con Google o correo, y con las opciones de premium visibles al crear (etiqueta «Premium», ya puesta: al pulsarla explica la función y que ahora es gratis). |
| 4.5 | Condiciones de pago y contacto | Sin devolución una vez usado; un correo de contacto | Obligatorio antes de cobrar | — | Decidido: sin devolución si ya se ha usado. Correo creado: hilemos.app@gmail.com, ya en la política de privacidad y en las condiciones |

**Primera votación premium gratis (4.4).** Decidido. Es un pase de 0,60 € regalado: no pasa por Google Play ni por
ningún cobro. Enseña lo que da premium justo cuando alguien lo usa (más gente, aprobación, plazo, recordatorios,
imagen sin marca, Excel y PDF). Solo para cuentas con Google o correo y una vez por cuenta. Quien borre la cuenta y
vuelva a crearla podría repetirlo, pero solo ganaría otra votación de 0,60 €. Las opciones de premium se ven al crear
una votación, con la etiqueta «Premium», en vez de esconderlas.

**Devoluciones y contacto (4.5).** Lo decidido es no devolver el dinero cuando ya se ha usado. En la UE hay 14
días para desistir de una compra digital, pero se pierden si la persona pide empezar a usarla ya y acepta que
pierde ese derecho. Por eso, al pagar tiene que haber una casilla que lo diga. Google Play tiene además su propia
política de reembolsos en las primeras horas. Conviene que lo revise un gestor. Contacto, mientras no haya
dominio: **hilemos.app@gmail.com** (creado). Sirve igual para la política de
privacidad, la ficha de Google Play y el soporte, y luego se puede redirigir a hola@ del dominio. Una cuenta de Gmail
normal (personal) basta: la «de empresa» es Google Workspace, que cuesta unos 7 € al mes por usuario y necesita un
dominio propio.

### ¿Se sostienen los números?

Lo que cuesta mantener Hilemos es casi nada (§6): cualquier ingreso cubre Firebase. Lo que pesa con precios tan
bajos son las comisiones, el IVA y los gastos de cobrar.

| Precio | Sin IVA (21 %) | Neto en Google Play (−15 %) | Neto en la web con Stripe (aprox. 1,5 % + 0,25 €) |
| --- | --- | --- | --- |
| 0,60 € (pase) | 0,50 € | 0,42 € | 0,24 € |
| 1,49 € (mes) | 1,23 € | 1,05 € | 0,96 € |
| 9,99 € (año) | 8,26 € | 7,02 € | 7,86 € |

- **El pase a 0,60 € se mantiene.** Por 0,89 € más se tiene un mes de todo (y lo configurado se mantiene al acabar
  el mes, §8), así que habrá quien prefiera el mes; el pase queda para quien solo quiere una votación. En la web deja
  poco: unos 0,24 € netos.
- **El anual a 9,99 € ahorra un 44 %** frente a 12 meses a 1,49 € (17,88 €): se paga menos de 7 meses. Empuja hacia
  el anual sin que el mensual deje de servir para un pico.
- **El coste que más pesa no es técnico.** Para cobrar en España hace falta, en principio, estar dado de alta
  como autónomo o tener una empresa. La cuota de autónomo con tarifa plana ronda los 80 € al mes el primer año y
  unos 200 € después. Con unos 7–8 € netos por suscripción anual, harían falta unas 130 suscripciones para cubrir el
  primer año y unas 300 después. Conviene consultarlo con un gestor antes de cobrar.
- **El IVA en la web.** Google Play cobra y declara el IVA por ti. Con Stripe lo tendrías que declarar tú (en
  cada país de la UE, a través del régimen de ventanilla única). Una plataforma que vende en tu nombre (Paddle,
  Lemon Squeezy) lo hace por ti, pero cobra más por venta.

---

## 5. Qué hace falta técnicamente para cobrar

| N.º | Qué | Detalle |
| --- | --- | --- |
| 5.1 | **Cobro en Android** | En contenido digital dentro de la app, Google Play obliga a usar su sistema de pagos (Google Play Billing), con comisión (15 % en suscripciones). En la web se puede cobrar con Stripe u otro. |
| 5.2 | **Saber quién es premium** | Hace falta un dato que la app no pueda falsificar: `plans/{uid}.premiumUntil` (hasta cuándo tiene premium; no en `users/{uid}`, que lo escribe la propia persona). Ya existe y las reglas no dejan escribirlo desde la app. Solo puede escribirlo un servidor después de comprobar el pago (con el aviso de Stripe, con la API de Google Play o con un servicio como RevenueCat). El proyecto ya está en el plan **Blaze** y ya tiene Cloud Functions. |
| 5.3 | **Comprobar los límites** | 3.1, 3.3, 3.4, 3.7 y 3.8 se pueden comprobar con las reglas de Firestore y contadores, sin servidor, como ya se hace con `members` y `maxPeople`. Las reglas leen el plan del gestor actual en cada cambio de pago; como el dato es una fecha, el premium caduca solo, sin que haga falta escribir nada (§8). 3.6 necesita una tarea programada. |
| 5.4 | **Los límites van en las reglas, no solo en la pantalla** | Si solo los comprueba la app, alguien con conocimientos técnicos se los salta. |

---

## 6. Qué cuesta dinero (para fijar los límites)

| N.º | Qué | Detalle |
| --- | --- | --- |
| 6.1 | **Lecturas de la base de datos** | Abrir una votación lee la votación, todos sus votos y el chat (hasta 200 mensajes). Mientras está abierta en pantalla, cada cambio se lee una vez por cada persona conectada. Lo más caro es una votación grande con el chat muy activo: por eso el límite 3.3 es el que más protege. |
| 6.2 | **Escrituras** | Cada voto, mensaje o persona que entra. |
| 6.3 | **Almacenamiento** | Poco: las imágenes de perfil son pequeñas (128 px, y 64 px en los votos). |
| 6.4 | **Avisos push** | El envío (Firebase Cloud Messaging) es gratis y sin límite. Las Cloud Functions que los mandan tienen en Blaze 2 millones de ejecuciones gratis al mes: prácticamente gratis a esta escala. |
| 6.5 | **Correos** | El enlace de entrada lo manda Firebase sin coste. Unos recordatorios por correo necesitarían un servicio de envío (Brevo u otro). |
| 6.6 | **Margen gratuito de Firebase** | Cada día, 50.000 lecturas y 20.000 escrituras; en total, 1 GiB guardado. Es el mismo en Spark y en Blaze. Hoy sobra mucho. |

---

## 7. Funcionalidades que echo en falta

| N.º | Funcionalidad | Por qué | Estado | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- |
| **Imprescindibles antes de publicar en la tienda o de cobrar** | | | | | |
| 7.1 | Política de privacidad y condiciones de uso | La Play Store y el RGPD las exigen. Al cobrar, faltarán las condiciones de pago y de devolución. | Hecha, con el contacto hilemos.app@gmail.com | No | Sin devolución si ya se ha usado (ver 4.5). |
| 7.2 | Editar una votación ya creada | No se puede quitar lo que tiene votos y los cambios se avisan en el chat. | Hecho | No | |
| 7.3 | Que el organizador elija la ganadora a mano | Elegir la ganadora sin contar los votos. Se descartó: la ganadora la deciden siempre los votos (y el desempate, si hace falta). | Descartado | No | Descartado |
| 7.4 | Protección contra abusos | App Check (que solo la app use la base de datos), límite de cuentas sin registro por dispositivo (bots) y denunciar o moderar mensajes del chat (las tiendas lo piden en apps con contenido de los usuarios). | En marcha | No | Imprescindible. Se mantiene entrar sin cuenta. Denunciar mensajes y personas, ocultar y el aviso a quien modera, hechos (pasos 3 a 5); el resto, en §12. |
| 7.5 | Activar los avisos push | Hechos también en la app de Android. Blaze y las funciones, desde el 22 de noviembre de 2026; falta probar un aviso real. | Casi hecho | ★ (los recordatorios, 7.7, ★★★) | |
| **Muy útiles** | | | | | |
| 7.6 | «Si hace falta» | Además de «sí», una respuesta tibia: ayuda a encontrar fechas cuando nada encaja. | Pendiente | No | No |
| 7.7 | Recordatorios automáticos | A quien falta por votar y antes de que acabe el plazo. | Pendiente | ★★★ | Sí, premium (§10) |
| 7.8 | Votaciones de opciones libres | Restaurante, regalo, destino… | Hecho | No | |
| 7.9 | Ocultar los resultados hasta votar o hasta el cierre | Para que nadie vote lo que ya va ganando. Lo elige el creador al crear la votación. | Pendiente | ★★ | Sí, premium; opción del creador al crearla |
| 7.10 | Exportar los resultados | CSV para guardar la votación (gratis); PDF como informe para presentar y Excel con formato (premium). Lo exporta quien la gestiona; en las anónimas, solo los totales. | Hecho | ★★★ (PDF y Excel) | CSV gratis; PDF y Excel premium (el Excel, con varias hojas y formato). De momento, sin planes, todo está disponible. |
| 7.11 | Una nota con el voto | «Llego a las 22:00», «solo por la tarde». | Pendiente | ★ | No |
| 7.12 | Zona horaria | En las votaciones por horas, para grupos en varios países. Propuesta: la votación guarda la zona de quien la crea; quien la abre desde otra zona ve «hora de Madrid» y, al lado, su hora local. | Pendiente | ★ | Sí: la zona del creador |
| 7.13 | Límite de elecciones por persona | «Elige como mucho 3». | Pendiente | ★ | No: libertad para elegir |
| 7.20 | Expulsar a alguien de la votación | Un administrador expulsa a un participante: se borran sus votos (si se le readmite, vuelve a votar), se libera su plaza y no puede volver a entrar con el enlace. Sirve si el enlace llega a quien no debía o si alguien molesta en el chat. Está en «Gestionar participantes» (menú ⋯), con «Hacer admin» y «Quitar admin»; los expulsados van aparte para volver a admitirlos y el chat avisa. «Acceso y plazas» queda para las reglas de entrada (plazas y correos). | Hecho | No: es moderación, y las tiendas la piden (7.4) | Gratis. Lo puede hacer cualquier administrador (también sin premium y también si la heredó); a otro administrador solo lo expulsa el creador; al creador, nadie. |
| **Más adelante** | | | | | |
| 7.14 | Entrar con Apple | Obligatorio para publicar en la App Store si se ofrece entrar con Google. | Pendiente | No | |
| 7.15 | Otros idiomas | Inglés y catalán, por ejemplo. | Pendiente | No | |
| 7.16 | Descargar mis datos | El RGPD reconoce el derecho de acceso y portabilidad: todo lo de la cuenta (perfil, votos, mensajes) en JSON. | Hecho: «Tu perfil» → «Descargar mis datos» | No | Gratis (obligatorio) |
| 7.17 | Limpieza automática de datos viejos | Cuentas sin registro que nadie usa y votaciones abandonadas. | Pendiente | No | |
| 7.18 | Personalizar una votación | Un color o una imagen de portada. | Pendiente | ★★★ | Más adelante (§11) |
| 7.19 | Estadísticas para quien organiza | Participación y quién suele faltar. | Pendiente | ★★★ (plan de organizaciones, 4.3) | Más adelante, con el plan de organizaciones (§11) |

> **Sobre 7.4 y los bots.** Sí, alguien podría crear miles de cuentas desde muchas direcciones IP distintas: Firebase
> limita las altas por IP, pero una red de bots tiene miles de IP. Lo que esas cuentas pueden hacer es poco:
>
> - No ven las votaciones de nadie, porque solo se entra con el enlace y los enlaces no se pueden adivinar.
> - Sin registro no entran en las votaciones con aprobación ni en las de solo correos.
> - Cada cuenta gratuita podrá tener como mucho 3 votaciones abiertas (3.1).
>
> El riesgo real es la factura: millones de lecturas y escrituras. Crear 50.000 cuentas con 3 votaciones cada una son
> unas 150.000 escrituras, menos de 1 €. Lo que de verdad protege es **App Check**, que hace que la base de datos solo
> acepte peticiones de la app de verdad (reCAPTCHA en la web y Play Integrity en Android), y no un script. Además, hay
> que poner una **alerta de presupuesto** en Google Cloud. Quitar la entrada sin cuenta no lo resolvería, porque un
> bot también puede crear cuentas de correo, y rompería el criterio 1.1.

### 7.4 en detalle: protección contra abusos

Decidido: se mantiene entrar sin cuenta. Estas son las piezas, en el orden en que las haría:

| Paso | Qué | Cómo | Quién |
| --- | --- | --- | --- |
| 1 | **Alerta de presupuesto** ✔ | Puesta a 5 €. En Google Cloud, un presupuesto (por ejemplo, 5 € al mes) que avisa por correo al 50 %, 90 % y 100 %. No corta el servicio, pero avisa a tiempo. | Tú, en la consola (5 minutos) |
| 2 | **App Check** | Firebase solo acepta peticiones de la app de verdad. En la web, con reCAPTCHA Enterprise (invisible para quien usa la app); en Android, con Play Integrity. Primero se activa en modo «solo medir» unos días para ver que no rechaza a nadie legítimo, y después se exige. | Android y web registrados y midiendo ✔ (25 de noviembre de 2026); falta exigirlo tras una semana (pasos en `docs/publicar-en-google-play.md`, apartados 10, 14 y 15) |
| 3 | **Denunciar un mensaje** ✔ | En el chat, «Denunciar» en cada mensaje ajeno, con el motivo y un comentario opcional. Queda guardado para revisarlo (quién, qué mensaje, motivo) y quien administra la votación lo ve marcado «Denunciado». | Hecho |
| 3b | **Denunciar a una persona** ✔ | En «Participantes», el nombre abre su perfil y desde ahí se le denuncia por su nombre, su foto o su comportamiento. Se guarda una copia de su nombre y su foto. Quien administra la votación la ve marcada en la tabla y en su perfil. | Hecho |
| 4 | **Ocultar un mensaje** ✔ | Quien administra la votación oculta un mensaje del chat y puede volver a mostrarlo; los demás ven «Mensaje ocultado por quien administra la votación». Junto con expulsar (2.5.13), cubre lo que piden las tiendas: denunciar, retirar el contenido y apartar a quien molesta. | Hecho |
| 5 | **Aviso de cada denuncia** ✔ | La Cloud Function `onReport` avisa a quien modera con un push y con un correo (Brevo), según lo que haya en `config/moderation`. Mientras no esté configurado, las denuncias se guardan y se ven en la consola de Firebase. | Hecho; falta configurarlo (§12) |
| 6 | **Límite de cuentas sin registro** | Firebase ya limita las altas por IP (100 por hora). Con App Check, un programa ya no puede crearlas en masa. Un límite por dispositivo no es fiable en la web (se borra con el navegador), así que no lo haría. | Nada que hacer |

Lo que pide Google Play a las apps con contenido de los usuarios: poder denunciar contenido y usuarios, poder
bloquear o apartar a quien molesta, y que el desarrollador modere. Con los pasos 3, 4 y 5, más expulsar, se cumple.

---

## 8. Cuando la votación cambia de manos

### La regla

Las funciones de pago de una votación dependen del plan de **quien la gestiona en cada momento**: su creador o quien
la ha heredado. Los administradores actúan con el plan del gestor; el suyo propio no cuenta en esa votación.

La misma regla sirve cuando el gestor se da de baja de premium: la votación queda igual que si la hubiera heredado
alguien sin premium. Y si después vuelve a pagar, todo se desbloquea otra vez.

### Quién hereda

Cuando el gestor sale, la votación pasa, en este orden, a:

1. un administrador con premium;
2. un administrador **con sitio** (menos de 3 votaciones abiertas, §9);
3. un participante aceptado con premium o con sitio;
4. si nadie tiene sitio, cualquier administrador y, si no hay, cualquier participante aceptado.

Dentro de cada grupo se elige al azar. Quien también se fue (con sus votos) nunca hereda, y si no queda nadie, la
votación se borra, como ahora.

La votación nunca se queda sin gestor: si nadie tiene sitio, la hereda igualmente alguien del grupo 4, pero con la
cuenta atrás de 7 días (ver «Heredar por encima del límite»).

**Cómo se hace (hecho, apagado durante el lanzamiento).** La app de quien sale elige como siempre: un administrador
al azar o, si no hay, un participante. Después, el servidor (`onPollPlan`) mira si el elegido tiene sitio. Si no lo
tiene, se la pasa a otro siguiendo el orden de arriba; si nadie lo tiene, se la deja con la cuenta atrás. Así la app
no tiene que leer el plan ni las votaciones de otras personas, y elegir a propósito a alguien lleno no sirve de nada.
El primer elegido, si era administrador, lo sigue siendo. Esa persona tiene la votación unos segundos.

### Heredar por encima del límite

**El problema.** Si la herencia no tuviera freno, se podría gestionar cualquier número de votaciones abiertas sin
premium: una segunda cuenta (las cuentas sin registro son gratis) crea 3 votaciones, te une, sale y las heredas tú.
Vuelve a tener 0 abiertas, crea otras 3, y así sin fin.

**La regla.** Si el heredero, con la votación heredada, pasa de 3 abiertas y no tiene premium, **la votación se
cierra sola a los 7 días** con el resultado que tenga en ese momento.

**Cómo se ve.** Desde que empieza la cuenta atrás, la votación lleva una etiqueta ámbar en «Mis votaciones» y en su
cabecera que cambia cada día: «Se cierra en 7 días», «Se cierra en 6 días»… «Se cierra mañana» y, el último,
«Último día». Todas las cuentas atrás (también las de 30 días) acaban **al final de un día** (23:59, hora de España),
como un plazo sin hora: el día de «Último día» se puede seguir votando y al día siguiente ya está cerrada, salvo que
antes cambie algo (cierra otra, consigue premium o la hereda alguien con sitio). Si la votación tiene un plazo que
llega antes, solo se ve el plazo. Sin el freno, quien no paga podría juntar en su
cuenta todas las que quisiera; con él, cada votación heredada de más dura como mucho una semana, así que el truco deja
de compensar. A quien vota no se le corta de golpe: tiene una semana para terminar (1.1).

| Caso | Qué pasa |
| --- | --- |
| El heredero tiene premium o, con la heredada, se queda en 3 o menos | Nada: la hereda sin cuenta atrás. |
| El heredero, sin premium, pasa de 3 con la heredada | Cuenta atrás de 7 días. Todos ven la etiqueta ámbar con lo que le queda, en «Mis votaciones» y en la votación (el motivo, en el tooltip). El heredero ve en la votación qué puede hacer y recibe un aviso al heredarla («La has heredado y ya tienes más de 3 votaciones abiertas: se cerrará sola el …. Cierra otra para mantenerla abierta») y otro cuando queda menos de un día. |
| Durante la cuenta atrás, el heredero cierra o elimina otras y baja a 3 o menos | Se cancela la cuenta atrás (en el barrido diario: como mucho, un día después). |
| Tiene varias que le sobran (por ejemplo, 5 abiertas) y cierra una (queda en 4) | **Sobran siempre las últimas en llegar a sus manos** (§9): con 5 sobran 2; al cerrar una, sobra 1 y a la otra se le quita la cuenta atrás. Así elige él cuáles se quedan, cerrando las que no necesita. |
| Durante la cuenta atrás, el heredero consigue premium | Se cancela. Si después lo pierde, las que le sobren tendrán la cuenta atrás de 30 días (ver «De premium a gratis»). |
| Durante la cuenta atrás, el heredero sale y la hereda otra persona sin sitio | **La fecha no cambia**: la cuenta atrás no vuelve a empezar. Si no, se alargaría para siempre pasándola entre dos cuentas llenas. |
| Durante la cuenta atrás, el heredero sale y la hereda alguien con premium o con sitio | Se cancela. |
| La votación tiene además ajustes de pago (cuenta atrás de 30 días) | Cuenta la fecha que llegue antes. Cada cuenta atrás se cancela por su propio motivo: la de 7 días al tener sitio o premium; la de 30, al tener premium. |
| La votación tiene pase (4.2) | También tiene la cuenta atrás de 7 días: el pase da funciones, no más votaciones abiertas. Si además lleva 60 días con el pase, cuenta la fecha que llegue antes. |
| Se acaba el plazo durante la cuenta atrás | Se cierra por el plazo, como siempre (deja de contar en las abiertas). La cuenta atrás se quita sin avisar. Si tiene un plazo anterior a la cuenta atrás, la votación solo enseña el plazo. |
| La cierra a mano durante la cuenta atrás | Se quita la cuenta atrás, para que al reabrirla no se cierre sola al momento. |
| Se cierra por la cuenta atrás | Queda cerrada como si la hubiera cerrado el gestor: deja de contar en sus abiertas y todos, también quien la gestiona, reciben «Se ha cerrado sola: mira el resultado». Si hay empate, se puede desempatar. Reabrirla cuenta como abrir (§9): solo con sitio. |
| Las votaciones que el heredero creó él mismo | Nunca tienen la cuenta atrás de 7 días. La de 30 días, solo si le sobran al perder premium. |
| Durante el lanzamiento gratis (sin límite) | No se aplica nada de esto. Si se encendiera premium y después se volviera al «todo gratis», el barrido diario quita todas las cuentas atrás. |

**Lo que no se cierra del todo.** Alguien puede usar varias cuentas y entrar en cada una por separado: es el límite
de cualquier app con cuentas gratis. Lo que este freno evita es juntarlas todas en una sola cuenta.

### Ejemplo

A creó la votación y tiene premium. Nombró administradores a B (con premium) y a C (sin premium). A sale.

| Caso | Quién hereda | Qué pasa |
| --- | --- | --- |
| B sigue en la votación y tiene premium | **B**, siempre (no al azar) | Todo sigue igual: B puede hacer los mismos ajustes que A. C sigue de administrador y gestiona con el plan de B. |
| B ya no está o ya no tiene premium | **C** | Funciones básicas: lo de la tabla de abajo. |

### Votación gestionada por alguien sin premium

**Para los participantes no cambia nada.** Se mantiene lo que ya estaba configurado: máximo de personas,
aprobación, lista de correos, plazo, administradores y resultados ocultos. Si no, castigaríamos a quien vota, que
nunca paga (1.1).

| Lo puede hacer | No lo puede hacer |
| --- | --- |
| Cerrar, desempatar y eliminar | Subir el máximo de personas por encima del límite gratuito |
| Editar título, descripción, días u opciones (durante los 30 días de la cuenta atrás) | Nombrar administradores nuevos (los que ya había siguen) |
| — | Reabrirla una vez cerrada (ver «Reutilizar una votación con funciones de pago») |
| Aceptar y rechazar solicitudes, para no dejar a nadie fuera, y expulsar a alguien (7.20) | Poner un plazo nuevo o alargarlo |
| Añadir correos a la lista: no aumenta las plazas, que es lo que se paga | Activar la aprobación, la lista de correos o los resultados ocultos si no estaban |
| Quitar el plazo, bajar el máximo o quitar administradores | — |

Además:

- **Los recordatorios automáticos dejan de enviarse.** Los avisos esenciales siguen (§10).
- **Si tiene ajustes de pago, se cierra sola a los 30 días**, salvo que antes vuelva a gestionarla alguien con
  premium (ver «Reutilizar una votación con funciones de pago»).
- **La votación caduca** como las gratuitas (3.6).
- **Cuenta en sus «abiertas a la vez»** (§9). La herencia no se puede rechazar; si con ella pasa del límite, la
  votación se cierra sola a los 7 días (ver «Heredar por encima del límite»). Mientras esté por encima, no podrá
  crear ni reabrir votaciones.

### Fisuras que cierra

| Truco | Por qué no funciona |
| --- | --- |
| Pagar un mes, crear muchas votaciones grandes y pasárselas a amigos sin premium | Los amigos no pueden ampliarlas ni nombrar administradores, y cada una cuenta en sus abiertas, así que no pueden crear más. Las que les hagan pasar de 3 se cierran solas a los 7 días. Además, el tope de 50 abiertas en premium (3.8) limita cuántas se pueden fabricar. |
| Crear votaciones con otra cuenta, salir y heredarlas todas en la propia | Las heredadas que hacen pasar de 3 se cierran solas a los 7 días, y la cuenta atrás no vuelve a empezar al pasarlas a otra cuenta llena (ver «Heredar por encima del límite»). |
| Pagar un mes, abrir 50 votaciones y quedárselas abiertas para siempre | Al acabar premium, las que pasan de 3 se cierran solas a los 30 días (ver «De premium a gratis»). |
| Darse de baja y seguir gestionando con funciones de pago | Las reglas miran el plan en cada cambio: sin premium, lo de pago queda congelado, y la votación se cierra sola a los 30 días. |
| Escribirse premium a sí mismo | El plan está en `plans/{uid}`, que solo escribe el servidor. No va en `users/{uid}`, que lo escribe la propia persona. |
| Crear una votación con `ownerSince` antiguo, para que nunca sea de las que sobran, o con la cuenta atrás ya quitada | Las reglas no dejan crear ni cambiar los campos del servidor (`ownerSince`, `autoClose…`). |
| Votar fuera de plazo desde fuera de la app, o cambiando la hora del móvil | Las reglas comprueban el plazo con la hora del servidor. |
| Usar una versión vieja de la app que no conoce un límite nuevo | Los límites van en las reglas y el servidor, no en la app. Si una versión vieja deja de funcionar con unas reglas nuevas, `config/app.minBuild` le pide actualizarse. |
| Ser administrador de alguien con premium para usar sus funciones | Solo sirve en las votaciones de esa persona, no en las propias. |
| Cerrar y reabrir para esquivar el límite de abiertas | Reabrir cuenta como abrir (§9). |

Lo que queda, que alguien con premium organice votaciones para otros, es un uso legítimo.

### Reutilizar una votación con funciones de pago

**El problema.** Lo configurado con premium se mantiene (el máximo de 150, la aprobación, la lista de correos…). Si una
votación se pudiera editar sin límite, se podría reutilizar siempre: pagar un pase de 0,60 € o un mes, y después
cambiarle el título y los días para cada evento nuevo, sin cerrarla nunca.

**El cortafuegos**, para todas las votaciones con ajustes de pago (más de 20 personas, aprobación, lista de correos,
administradores, plazo o resultados ocultos):

1. **Si quien la gestiona deja de tener premium, la votación se cierra sola a los 30 días** con el resultado que
   tenga en ese momento. Pasa igual si se da de baja, si se le acaba la suscripción o si la hereda alguien sin
   premium. Durante esos 30 días todo sigue funcionando como siempre. Todos ven la etiqueta con lo que le queda («Se cierra en 30 días»… «Último día»), y quien la
   gestiona recibe un aviso al empezar la cuenta atrás y otro cuando queda menos de un día (el mismo que en las
   demás cuentas atrás). Si al cerrarse hay empate, queda cerrada con el empate y se puede desempatar, porque
   desempatar es gratis.
2. **Si vuelve a tener premium antes del final, la cuenta atrás se cancela.** Pasa igual si la hereda alguien con
   premium. Si vuelve a perderlo, empieza otra vez desde 30.
3. **Con pase, si sigue abierta a los 60 días de comprarlo, se cierra sola.** El pase cubre un solo uso: hasta que
   la votación se cierra por primera vez, al cerrarla, al acabar el plazo o con un desempate definitivo.
4. **Para reabrir una votación con ajustes de pago hace falta premium.** Esto es lo que quería decir con «reabrir no
   devuelve el pase». Cuando una votación con pase se cierra, el pase ya está gastado. Si después se reabre, no vuelve
   a tener premium gratis, y quien no paga no puede reabrirla, porque si pudiera, reabrir y editar sería la forma de
   reutilizarla sin pagar. Con premium o con un pase nuevo, sí.

Con la cuenta atrás ya no hace falta limitar la edición: durante esos 30 días se puede seguir editando, como ahora, y
después la votación queda cerrada. Con suscripción no hace falta nada más: mientras se paga, reutilizarla es un uso
legítimo.

**Cómo se comprueba (hecho, apagado durante el lanzamiento).** El barrido diario (`onDaily`, a las 4:00) mira
todas las votaciones abiertas. A las que tienen ajustes de pago y cuyo gestor no tiene premium les apunta
`autoCloseWhy.premium` (dentro de 30 días); si lo recupera, se lo quita. `onAutoClose`, cada hora, avisa cuando queda
menos de un día y la cierra al llegar la fecha. Las reglas no dejan escribir esos campos desde la app. Falta (con el
pase y el cobro): que las reglas no dejen reabrir una votación con ajustes de pago sin premium, y no contar como de
pago las que tienen pase vigente.

### Votaciones con pase (4.2)

El pase es de la votación, no de quien la gestiona: ya está pagada, así que sigue siendo premium la herede quien la
herede, también alguien sin premium. No abre ninguna fisura, porque cada pase sirve para una sola votación y un solo
uso: acaba en su primer cierre, y si sigue abierta a los 60 días, se cierra sola.

### De premium a gratis: todos los casos

Lo que pasa cuando quien gestiona deja de tener premium, por la razón que sea: se da de baja, se le acaba el mes o el
año, le devuelven el dinero, se acaba el regalo de fundador o hereda la votación alguien sin premium. Para el servidor
es lo mismo: `plans/{uid}.premiumUntil` queda en el pasado.

| Caso | Qué pasa |
| --- | --- |
| Tiene abiertas votaciones con ajustes de pago | Siguen funcionando igual para todos. Cada una se cierra sola a los 30 días (aviso al empezar y cuando queda menos de un día), salvo que antes vuelva a tener premium. |
| Tiene más de 3 abiertas (con o sin ajustes de pago) | Se quedan abiertas las 3 primeras en llegar a sus manos; **las que sobran se cierran solas a los 30 días**. Si cierra las que no necesita, las demás se salvan (sobran siempre las últimas). Si son varias a la vez, recibe un solo aviso que lleva a «Mis votaciones». Mientras tenga más de 3, no puede crear ni reabrir. |
| Las dos cosas a la vez | Cada motivo tiene su fecha y se cancela por su cuenta; la votación se cierra en la primera. |
| Vuelve a tener premium durante la cuenta atrás | Se cancelan las dos en el barrido del día siguiente. Si lo vuelve a perder, empiezan otra vez desde 30. |
| Quita los ajustes de pago durante la cuenta atrás | Si la votación deja de tener ajustes de pago (quita el plazo y los administradores y no pasa de 20 personas), queda como una gratuita y se cancela esa cuenta atrás. La aprobación y la lista de correos no se pueden quitar después de crearla, así que esas votaciones se cierran siempre. |
| Sigue editando durante la cuenta atrás | Puede (título, descripción, añadir días u opciones), como en cualquier votación. Al final queda cerrada igual: por eso no hace falta limitar la edición. |
| Un administrador suyo tiene premium | No cuenta: manda el plan de quien la gestiona (§8, «La regla»). |
| La votación tiene pase (4.2) o es su primera votación premium gratis (4.4) | El pase es de la votación: no le afecta que el gestor pierda premium. Acaba en su primer cierre o a los 60 días. Pendiente de hacer con el pase. |
| Fundadores (premium de regalo al estrenar premium, fase 5) | Al acabar el regalo, como cualquier suscripción que acaba. |
| Al encender premium (se apaga el «todo gratis») | El primer barrido aplica todo lo anterior a todas las votaciones abiertas: las que sobran y las de pago sin premium, a 30 días. Como el estreno se avisa 30 días antes (`config/app.notice` y las condiciones de uso, que ya lo dicen), hay tiempo de sobra para cerrar lo que no se use o pagar. |
| Tiene apagados los avisos de cambios de estado | No le llegan los push de la cuenta atrás, pero lo ve en «Mis votaciones» y en la votación (la etiqueta con lo que le queda y qué puede hacer). |
| Cambia la hora del móvil | No sirve: las fechas las pone y las compara el servidor. |
| Elimina su cuenta con premium | Sale de todas, como siempre. **Ojo, al cobrar:** eliminar la cuenta no cancela una suscripción de Google Play; hay que decirlo al eliminarla y en las condiciones de pago. |
| Pagó con otra cuenta de Hilemos | Premium es de la cuenta (el uid) que hizo la compra. Al cobrar hará falta «Restaurar compras» para pasarla a la cuenta en la que se entra. |

### Cómo se comprueba

El plan se guarda en `plans/{uid}.premiumUntil` (hasta cuándo tiene premium). Solo lo escribe el servidor al
comprobar el pago y solo lo lee su dueño. No puede ir en `users/{uid}`, porque las reglas dejan que cada persona
escriba ahí lo que quiera. Las reglas y el servidor lo comparan con su hora, así que el premium caduca solo, sin que
haga falta escribir nada al acabar la suscripción.

**El interruptor.** Mientras `config/plan.freeForAll` no sea `false` (y si el documento no existe), todo es gratis:
el servidor solo apunta `ownerSince` al heredar y quita cualquier cuenta atrás. Encender premium es escribir
`freeForAll: false` en la consola; volver atrás, ponerlo a `true`.

**Lo que hace el servidor** (`functions/plan.js`, con sus pruebas):

| Función | Cuándo | Qué hace |
| --- | --- | --- |
| `onPollPlan` | La votación cambia de manos o se cierra a mano | Apunta `ownerSince`. Con premium encendido, busca heredero con sitio y, si no hay, pone la cuenta atrás de 7 días (sin volver a empezar la que ya corría). Al cerrarla a mano, quita la cuenta atrás. |
| `onDaily` | Cada día a las 4:00 | El barrido de premium y las estadísticas del día anterior (en la misma tarea, porque Cloud Scheduler solo da 3 gratis). El barrido recorre las abiertas por gestor: las que sobran (30 días) y las de pago sin premium (30 días). Pone las nuevas, quita las que ya no tocan y avisa de las nuevas. |
| `onAutoClose` | Cada hora | Avisa cuando queda menos de un día y cierra las que han llegado a la fecha (`autoClosedAt`). |

Las abiertas de cada persona se cuentan con una consulta (`ownerUid` y `closed == false`, sin las de plazo pasado),
no con un contador: no se puede descuadrar. Para que las reglas impidan **crear** la cuarta hace falta, además, un
contador (§9).

---

## 9. El límite de votaciones abiertas a la vez (3.1), caso por caso

Cuentan las votaciones abiertas que cada persona **gestiona** (las que ha creado o heredado), sin las cerradas ni las
de plazo pasado. Las votaciones en las que solo participa, o de las que es administrador, no cuentan. El límite es 3
sin premium (y 50 con premium, 3.8).

**Las que sobran.** Si alguien tiene más de su límite, sobran **las últimas en llegar a sus manos**: por fecha de
creación o, si la heredó, por la fecha en que la heredó (`ownerSince`). Así, quien cierra las que no necesita elige
cuáles se quedan, y si no hace nada se quedan las primeras. Las que sobran se cierran solas: a los 7 días si sobran
por una herencia y a los 30 en los demás casos (se acabó premium o se estrenó el límite).

**Dos formas de contar.** El servidor las cuenta con una consulta cada vez que hace falta (al heredar y en el barrido
diario): es exacto y ya está hecho. Para que **las reglas** impidan crear o reabrir la cuarta (pendiente, §12) hace
falta además un contador, porque las reglas no pueden hacer consultas. Ese contador no puede ir en `users/{uid}`
(la persona lo pondría a 0): irá en un documento que la app solo puede subir o bajar de uno en uno en la misma
escritura que crea, cierra o reabre la votación (las reglas lo comprueban con `getAfter`), y que el servidor ajusta
en lo que no hace la persona (fin del plazo, herencia, cierre automático). La tabla de abajo es la de ese contador.

| Qué pasa | Contador | Si ya está en el límite |
| --- | --- | --- |
| Crea una votación | +1 | No puede crearla. Mensaje: «Tienes 3 votaciones abiertas. Cierra una para crear otra o pásate a premium». |
| Duplica una votación | +1 (es crear) | Igual que crear. |
| Cierra una votación | −1 | — |
| Reabre una votación | +1 | No puede reabrirla. Así no se puede esquivar el límite cerrando y reabriendo. |
| Se acaba el plazo | −1 (lo hace la función que ya avisa del fin del plazo) | — |
| Se cierra sola (30 días sin premium, o 60 con pase) | −1 (lo hace la tarea programada que la cierra) | — |
| Cierra una votación con el plazo ya pasado | Nada: ya se descontó al acabar el plazo | — |
| Elimina una votación abierta | −1 | — |
| Archiva una votación | Nada: archivar solo la quita de su panel | — |
| Sale de una votación abierta que gestiona | −1 para quien sale y +1 para quien la hereda | Se prefiere un heredero con premium o con sitio. Si nadie tiene sitio, la herencia no se bloquea, pero la votación se cierra sola a los 7 días salvo que el heredero baje a 3 o consiga premium (§8, «Heredar por encima del límite»). |
| Se cierra sola por heredarla por encima del límite | −1 (lo hace la tarea programada que la cierra) | — |
| Elimina su cuenta | Como salir de cada una | — |
| Se le acaba el premium con 10 abiertas | Nada cambia al momento: siguen abiertas y funcionando | Las 7 que sobran (las últimas en llegar a sus manos) se cierran solas a los 30 días, salvo que cierre otras o renueve. No puede crear ni reabrir hasta bajar de 3. |
| Crea una votación con pase (4.2) | +1, como cualquier otra | El pase da funciones, no más votaciones: con 3 abiertas tampoco puede crearla. |
| Al estrenar el límite, alguien ya tiene más de 3 | Se cuentan las que tiene | Las que sobran se cierran solas a los 30 días (el estreno se avisa 30 días antes). No puede crear más hasta bajar de 3. |

Crear, cerrar y reabrir suben o bajan el contador en la misma escritura que la votación, como ya se hace con
`members`, para que nadie pueda crear cinco de golpe antes de que se actualice. Lo que no hace el propio gestor (el
fin del plazo, recibir una herencia o el cierre automático) lo apunta una Cloud Function. Si alguna vez se
descuadrara, el barrido diario puede volver a calcularlo con la consulta.

---

## 10. Avisos esenciales y recordatorios

La regla en una frase: **un aviso esencial lo provoca algo que acaba de pasar; un recordatorio lo manda Hilemos por su
cuenta, porque pasa el tiempo.**

| Aviso | Quién lo recibe | Tipo |
| --- | --- | --- |
| «Ana quiere entrar en la votación» | Gestor y administradores | Esencial (gratis) |
| «Te han aceptado: ya puedes votar» | Quien pidió entrar | Esencial (gratis) |
| «Te han vuelto a admitir: ya puedes votar» | Quien estaba rechazado o expulsado | Esencial (gratis) |
| «Ana ha votado» (solo la primera vez) | Gestor | Esencial (gratis) |
| Se ha cerrado o se ha vuelto a abrir | Participantes | Esencial (gratis) |
| Hay un desempate; resultado definitivo o desempate sin ganadora | Participantes | Esencial (gratis) |
| Se ha acabado el plazo | Participantes | Esencial (gratis; el plazo ya es premium) |
| «Se cerrará sola el …» al empezar una cuenta atrás (heredada por encima del límite, le sobra o usa funciones de pago sin premium, §8) y otro cuando queda menos de un día | Quien la gestiona | Esencial (gratis) |
| «Se ha cerrado sola: mira el resultado» | Participantes y quien la gestiona | Esencial (gratis) |
| «Te falta votar» (por ejemplo, 2 días después de entrar sin votar) | Quien no ha votado | Recordatorio (premium) |
| «Quedan 24 horas para votar» | Quien no ha votado | Recordatorio (premium) |
| «Faltan 4 personas por votar» | Gestor | Recordatorio (premium) |

Los recordatorios van **solo por push** de momento; por correo (6.5) quedan para más adelante (§11). Se mandan
solo si el **gestor actual** tiene premium o la votación tiene pase. Si el gestor con premium sale y la hereda
alguien sin premium, se dejan de enviar (§8). Todos los esenciales están hechos; los recordatorios son 7.7.

---

## 11. Planes de futuro

Ideas para después de cobrar, sin decidir del todo.

### Personalizar una votación (7.18, premium)

No es lo mismo que editar: **editar** cambia lo que se vota (título, días, opciones). **Personalizar** cambia cómo
se ve la votación, para que un evento se reconozca y quede bonito al compartirlo:

- **Color** de la votación: el de la cabecera, los botones y la casilla elegida (de una paleta cerrada, para que se
  siga leyendo bien en claro y en oscuro).
- **Imagen de portada**: una foto arriba del todo (el sitio de la boda, el equipo, la casa rural).
- **Icono o emoji** de la votación, en vez del del tipo (📅), en «Mis votaciones» y en el menú lateral.
- **Imagen del resultado y PDF personalizados**: con ese color y esa portada, además de sin marca (2.4.5).
- **Vista previa del enlace**: que, al compartirlo por WhatsApp, salga la portada y el título de la votación.

### Votación por intervalos de fechas (premium)

Un tipo de votación nuevo: cada opción es un intervalo entre dos fechas («del 27 de febrero al 7 de abril», «del 10
al 25 de abril») y se vota cuál viene mejor. Pensado para viajes, vacaciones, bodas o turnos: quien organiza eso es
también quien suele comprar el pase (4.2). Es premium porque añade algo nuevo sin quitar nada de lo gratis: los
cuatro tipos de fechas (días, horas, semanas y meses) y las opciones libres siguen gratis.

Hoy se puede imitar escribiendo «27 feb – 7 abr» como opción libre. Para que merezca pagar, tiene que dar lo que eso
no da:

- **Elegir las fechas en el calendario**, con la duración al lado («40 días, 39 noches») y un aviso si el final es
  anterior al inicio.
- **Un nombre opcional** para cada intervalo («Semana Santa», «Puente de mayo»).
- **Ordenados por fecha** y dibujados en una línea de tiempo o un calendario, para ver de un vistazo cuáles se solapan.
- **Al cerrar, «Añadir al calendario»** con el intervalo ganador como un evento de varios días, y las fechas bien
  escritas en la imagen del resultado, en Excel y en PDF.

**Decidido:**

- De 2 a 20 intervalos.
- Se pueden solapar: es normal comparar «del 1 al 15» con «del 10 al 25».
- Solo fechas, sin horas.
- Se vota el intervalo entero, como ahora la semana entera. Votar solo una parte («me vale del 1 al 5») queda fuera,
  al menos al principio, porque complica mucho el recuento.
- Premium o con pase, con la etiqueta «Premium» visible al crear, como el resto.

**Trabajo:** parecido a lo que costaron las opciones libres. Hay que tocar el modelo y las reglas, crear y editar (sin
dejar quitar un intervalo con votos), los avisos del chat, los tableros, el calendario `.ics`, las exportaciones y
duplicar.

### Otras ideas

| Idea | Qué sería | Para quién |
| --- | --- | --- |
| Panel de moderación | Una pantalla en la app, solo para quien modera Hilemos, con todas las denuncias: ver el mensaje o la persona, ocultar, descartar la denuncia y bloquear una cuenta. Hoy las denuncias llegan por correo (Brevo) y se gestionan desde la consola de Firebase; hará falta cuando haya tantas que el correo no baste | Quien modera |
| Estadísticas para quien organiza (7.19) | Participación por votación, quién suele faltar, cuánto tardan en votar | Plan de organizaciones (4.3) |
| Plan de organizaciones (4.3) | Más personas aún, varios organizadores con una factura, estadísticas | Asociaciones, clubes, empresas |
| Recordatorios por correo | Además de push, para quien no tiene la app (necesita un servicio de envío, 6.5) | Premium |
| Entrar con Apple y app de iPhone (7.14) | Obligatorio para la App Store si se ofrece entrar con Google | Todos |
| Otros idiomas (7.15) | Inglés y catalán, por ejemplo | Todos |
| Dominio propio | Correo de contacto y dirección de la web propios (hola@…) | — |

---

## 12. Lo que falta, en orden

El camino por fases, con objetivos y cuándo pasar de una a otra (prueba cerrada, lanzamiento gratis, medir y
cobrar), está en [plan-hasta-premium.md](plan-hasta-premium.md). Aquí queda la lista de tareas.

### Antes de publicar en Google Play

| # | Qué | Quién |
| --- | --- | --- |
| 1 | Crear el correo **hilemos.app@gmail.com** (Gmail personal). ✔ | Hecho |
| 2 | Poner ese correo de contacto en la política de privacidad y en las condiciones (7.1). ✔ | Hecho |
| 3 | **Alerta de presupuesto** en Google Cloud (7.4, paso 1), de 5 €. ✔ | Hecho |
| 4 | **Moderación configurada** (7.4, paso 5) ✔: cada denuncia llega por correo a hilemos.app@gmail.com (Brevo, con la clave de API en `config/moderation`), con el mensaje, las dos personas, sus correos y sus uid. Los avisos push (`uids`) quedan descartados por ahora y el panel de moderación, en planes de futuro (§11). | Hecho |
| 5 | **App Check** (7.4, paso 2): Android (Play Integrity) y web (reCAPTCHA Enterprise) registrados y midiendo ✔. Falta, tras una semana en «solo medir», exigirlo. | Los dos |
| 6 | Probar un **aviso push real** en el móvil (7.5). | Los dos |
| 7 | **Cuenta de desarrollador de Google Play** (25 $, una vez). Las cuentas personales nuevas tienen que hacer una prueba cerrada con al menos 12 personas durante 14 días antes de publicar. | Hecho: verificada ✔ |
| 7b | **Versión mínima y aviso para todos** (`config/app`) ✔: retirar una versión vieja de Android o avisar de algo sin publicar otra. Tiene que ir en el primer `.aab`. | Hecho |
| 7c | **El plazo en las reglas** ✔: con el plazo pasado ya no se aceptan votos tampoco desde fuera de la app. | Hecho |

### Antes de cobrar

| # | Qué | Quién |
| --- | --- | --- |
| 8 | Hablar con un gestor: alta de autónomo, IVA de las ventas digitales y condiciones de devolución (4.5). | Tú |
| 9 | **Saber quién es premium**: `premiumUntil` que escribe el servidor tras comprobar el pago (Google Play Billing en Android, Stripe u otra pasarela en la web; RevenueCat puede juntar las dos). | Yo, con tus cuentas de pago |
| 9b | **Base de premium en el servidor, apagada** ✔: `plans/{uid}`, interruptor `config/plan.freeForAll`, campos del servidor protegidos en las reglas, herencia con preferencia por quien tiene sitio, cuentas atrás (7 y 30 días), cierre automático y avisos (§8). Probado en el emulador. | Hecho |
| 10 | **Los límites en las reglas**: 3 abiertas a la vez y 50 en premium (§9, con su contador), 20 personas (3.3), funciones de control (3.4), duplicar (2.2.15), imagen sin marca, Excel y PDF. Va con una versión nueva de la app (la del cobro), y `config/app.minBuild` retira las anteriores. | Yo |
| 11 | **Pase de 0,60 € y primera votación gratis** (4.2 y 4.4), con las opciones de premium visibles al crear. | Yo |
| 12 | **El cortafuegos**: la cuenta atrás de 30 días ya está ✔; falta el cierre a los 60 días con pase y que las reglas no dejen reabrir sin premium (§8). | Yo |
| 13 | **Herencia con preferencia por premium y por quien tiene sitio** ✔ (§8); falta la **caducidad** a los 12 meses sin movimiento (3.6). | Yo |
| 14 | La casilla de pago para renunciar al desistimiento y las condiciones de pago (4.5). | Yo, con lo que diga el gestor |

### Funciones ya decididas que faltan

| # | Qué | Plan |
| --- | --- | --- |
| 15 | Recordatorios automáticos, solo por push (7.7). | Premium |
| 16 | Ocultar los resultados hasta votar o hasta el cierre (7.9). | Premium |
| 17 | Zona horaria del creador en las votaciones por horas (7.12). | Gratis |
| 18 | Descargar mis datos, en JSON (7.16). ✔ | Hecho |
| 19 | Limpieza automática de datos viejos (7.17). | — |

Después, los planes de futuro (§11).

