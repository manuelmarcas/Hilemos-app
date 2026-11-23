# Funcionalidades de Hilemos y planes: gratis y premium

Este documento recoge todo lo que hace Hilemos hoy y lo decidido sobre qué va en el plan premium y qué límites tiene
el plan gratuito (lo que falta por cerrar pone «Pendiente»). Al final hay una lista de funcionalidades que aún no
existen, tres secciones
que detallan cómo funcionarían las decisiones más delicadas: qué pasa cuando una votación cambia de manos (§8), el
límite de votaciones abiertas a la vez (§9) y qué avisos son gratis y cuáles premium (§10), y los planes de futuro (§11).

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
| 2.5.8 | Solicitudes | Aceptar, rechazar o volver a admitir (en las de aprobación). | Va con 2.2.12 | ★★★ (con 2.2.12) | Va con 2.2.12; aceptar y rechazar sigue funcionando aunque el gestor no tenga premium (§8) |
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
| 2.6.2 | Mensajes sin leer | Contador en la pestaña, sincronizado entre dispositivos. | Gratis | No | Gratis |
| 2.6.3 | Emojis | Selector propio en el ordenador; en el móvil, el del teclado. | Gratis | No | Gratis |

Se ven los últimos 200 mensajes y cada mensaje tiene como mucho 500 caracteres.

### 2.7 Organizar «Mis votaciones»

| N.º | Funcionalidad | Qué hace | Propuesta | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- |
| 2.7.1 | Grupos | Crear, renombrar, eliminar y plegar grupos (Familia, Trabajo…). | Gratis | No | Gratis |
| 2.7.2 | Mover de grupo | Con el menú ⋯ o arrastrando en el menú lateral. | Gratis | No | Gratis |
| 2.7.3 | Archivar | Saca la votación del panel y del menú sin salir de ella; se puede deshacer. | Gratis | No | Gratis (archivar no es cerrar: no libera hueco en §9) |
| 2.7.4 | Menú lateral | Todas las votaciones a mano, con buscador. | Gratis | No | Gratis |
| 2.7.5 | Deslizar en el móvil | → archivar, ← salir. | Gratis | No | Gratis |

### 2.8 Compartir

| N.º | Funcionalidad | Qué hace | Propuesta | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- |
| 2.8.1 | Enlace | Copiar o compartir con el menú del sistema. | Gratis | No | Gratis |
| 2.8.2 | Código QR | Para enseñarlo en persona o descargarlo. | Gratis | No | Gratis |

### 2.9 Plataformas y avisos

| N.º | Funcionalidad | Qué hace | Propuesta | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- |
| 2.9.1 | Web y Android | La misma app, también instalable. | Gratis | No | Gratis |
| 2.9.2 | Mala conexión | Guarda una copia local: abre más rápido y aguanta cortes. | Gratis | No | Gratis |
| 2.9.3 | Avisos push | Alguien vota; cierre, desempate o fin del plazo; solicitudes. Cada uno se activa o desactiva en el perfil. En la web y en la app de Android. Las funciones que los envían están desplegadas desde el 22 de noviembre de 2026 (plan Blaze); falta probar un aviso real. | Gratis los esenciales; premium los recordatorios (ver 6.4 y 7.7) | ★ (los recordatorios, ★★★) | Esenciales gratis; recordatorios premium, solo si el gestor actual tiene premium (§10) |
| 2.9.4 | Privacidad y condiciones | Política de privacidad y condiciones de uso, enlazadas desde la entrada y el perfil. | Gratis (obligatorio) | No | Gratis |

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
| 4.2 | Pase para una votación | 1,99 € desbloquea premium en una sola votación | Eventos puntuales: una boda, un viaje, una cena de empresa | ★★★ (junto a 4.1) | 0,60 €. Da a esa votación todo lo de premium. Es de la votación, no de la persona: si la hereda alguien sin premium, sigue siendo premium (§8). Cuenta en las «abiertas a la vez» (§9). |
| 4.3 | Plan para organizaciones | Precio por organizador, con facturación | Asociaciones, clubes, academias, empresas | ★★ (más adelante) | Más adelante: más personas aún y funciones propias por definir |
| 4.4 | Primera votación premium gratis | Cada cuenta con Google o correo tiene, una vez, un pase (4.2) regalado | Quien aún no sabe qué da premium: lo prueba en una votación de verdad | ★★★ | Sí: una vez por cuenta, solo con Google o correo, y con las opciones de premium visibles al crear (etiqueta «Premium»). |
| 4.5 | Condiciones de pago y contacto | Sin devolución una vez usado; un correo de contacto | Obligatorio antes de cobrar | — | Decidido: sin devolución si ya se ha usado. Pendiente: crear el correo |

**Primera votación premium gratis (4.4).** Decidido. Es un pase de 0,60 € regalado: no pasa por Google Play ni por
ningún cobro. Enseña lo que da premium justo cuando alguien lo usa (más gente, aprobación, plazo, recordatorios,
imagen sin marca, Excel y PDF). Solo para cuentas con Google o correo y una vez por cuenta. Quien borre la cuenta y
vuelva a crearla podría repetirlo, pero solo ganaría otra votación de 0,60 €. Las opciones de premium se ven al crear
una votación, con la etiqueta «Premium», en vez de esconderlas.

**Devoluciones y contacto (4.5).** Lo decidido es no devolver el dinero cuando ya se ha usado. En la UE hay 14
días para desistir de una compra digital, pero se pierden si la persona pide empezar a usarla ya y acepta que
pierde ese derecho. Por eso, al pagar tiene que haber una casilla que lo diga. Google Play tiene además su propia
política de reembolsos en las primeras horas. Conviene que lo revise un gestor. Contacto, mientras no haya
dominio: **hilemos.app@gmail.com** (o hilemos.soporte@gmail.com si ese ya existe). Sirve igual para la política de
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
| 5.2 | **Saber quién es premium** | Hace falta un dato que la app no pueda falsificar, por ejemplo `users/{uid}.premiumUntil` (hasta cuándo tiene premium). Solo puede escribirlo un servidor después de comprobar el pago (con el aviso de Stripe, con la API de Google Play o con un servicio como RevenueCat). El proyecto ya está en el plan **Blaze** y ya tiene Cloud Functions. |
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
| 7.1 | Política de privacidad y condiciones de uso | La Play Store y el RGPD las exigen. Falta una **dirección de contacto** en la política y, al cobrar, las condiciones de pago y de devolución. | Hecha (falta el contacto) | No | Sin devolución si ya se ha usado (ver 4.5). Contacto: un correo de Gmail mientras no haya dominio (ver 4.5). |
| 7.2 | Editar una votación ya creada | No se puede quitar lo que tiene votos y los cambios se avisan en el chat. | Hecho | No | |
| 7.3 | Que el organizador elija la ganadora a mano | Elegir la ganadora sin contar los votos. Se descartó: la ganadora la deciden siempre los votos (y el desempate, si hace falta). | Descartado | No | Descartado |
| 7.4 | Protección contra abusos | App Check (que solo la app use la base de datos), límite de cuentas sin registro por dispositivo (bots) y denunciar o moderar mensajes del chat (las tiendas lo piden en apps con contenido de los usuarios). | Pendiente | No | Imprescindible. Se mantiene entrar sin cuenta. Cómo, en la nota de debajo. |
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
| 7.16 | Descargar mis datos | El RGPD reconoce el derecho de acceso y portabilidad: todo lo de la cuenta (perfil, votos, mensajes) en JSON. | Pendiente | No | Gratis (obligatorio) |
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
| 1 | **Alerta de presupuesto** | En Google Cloud, un presupuesto (por ejemplo, 5 € al mes) que avisa por correo al 50 %, 90 % y 100 %. No corta el servicio, pero avisa a tiempo. | Tú, en la consola (5 minutos) |
| 2 | **App Check** | Firebase solo acepta peticiones de la app de verdad. En la web, con reCAPTCHA Enterprise (invisible para quien usa la app); en Android, con Play Integrity. Primero se activa en modo «solo medir» unos días para ver que no rechaza a nadie legítimo, y después se exige. | Yo, el código; tú, crear las claves en la consola de Firebase |
| 3 | **Denunciar un mensaje** | En el chat, «Denunciar» en cada mensaje ajeno. Queda guardado para revisarlo (quién, qué mensaje, motivo) y quien administra la votación lo ve marcado. | Yo |
| 4 | **Ocultar un mensaje** | Quien administra la votación puede ocultar un mensaje del chat («Mensaje ocultado por un administrador»). Junto con expulsar (2.5.13), cubre lo que piden las tiendas: denunciar, retirar el contenido y apartar a quien molesta. | Yo |
| 5 | **Revisión de las denuncias** | Las denuncias llegan a una colección que solo puede leer el servidor; una Cloud Function te manda un correo con cada una. | Yo; tú decides qué hacer con cada una |
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
2. cualquier administrador;
3. cualquier participante aceptado.

Dentro de cada grupo se elige al azar, como ahora. Hoy se prefiere a un administrador; el cambio es mirar antes si
alguno tiene premium.

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
| Cerrar, reabrir (si cabe en su límite de abiertas, §9), desempatar y eliminar | Subir el máximo de personas por encima del límite gratuito |
| Editar la descripción | Editar el título o añadir días u opciones (ver «Reutilizar una votación con funciones de pago») |
| — | Nombrar administradores nuevos (los que ya había siguen) |
| Aceptar y rechazar solicitudes, para no dejar a nadie fuera, y expulsar a alguien (7.20) | Poner un plazo nuevo o alargarlo |
| Añadir correos a la lista: no aumenta las plazas, que es lo que se paga | Activar la aprobación, la lista de correos o los resultados ocultos si no estaban |
| Quitar el plazo, bajar el máximo o quitar administradores | — |

Además:

- **Los recordatorios automáticos dejan de enviarse.** Los avisos esenciales siguen (§10).
- **La votación caduca** como las gratuitas (3.6).
- **Cuenta en sus «abiertas a la vez»** (§9), aunque con ella pase del límite: la herencia no se puede rechazar.
  Mientras esté por encima, no podrá crear ni reabrir votaciones.

### Fisuras que cierra

| Truco | Por qué no funciona |
| --- | --- |
| Pagar un mes, crear muchas votaciones grandes y pasárselas a amigos sin premium | Los amigos no pueden ampliarlas ni nombrar administradores, y cada una cuenta en sus abiertas, así que no pueden crear más. Además, el tope de 50 abiertas en premium (3.8) limita cuántas se pueden fabricar. |
| Darse de baja y seguir gestionando con funciones de pago | Las reglas miran el plan en cada cambio: sin premium, lo de pago queda congelado. |
| Ser administrador de alguien con premium para usar sus funciones | Solo sirve en las votaciones de esa persona, no en las propias. |
| Cerrar y reabrir para esquivar el límite de abiertas | Reabrir cuenta como abrir (§9). |

Lo que queda, que alguien con premium organice votaciones para otros, es un uso legítimo.

### Reutilizar una votación con funciones de pago

**El problema.** Lo configurado con premium se mantiene (el máximo de 150, la aprobación, la lista de correos…). Si una
votación se pudiera editar sin límite, se podría reutilizar siempre: pagar un pase de 0,60 € o un mes, y después
cambiarle el título y los días para cada evento nuevo, sin cerrarla nunca.

**El cortafuegos**, para todas las votaciones:

1. **Lo que se vota y el título solo se cambian con premium si la votación tiene ajustes de pago** (más de 20
   personas, aprobación, lista de correos, administradores, plazo o resultados ocultos). Quien la gestiona sin
   premium, o cuando el pase ya ha acabado, puede cerrarla, reabrirla, desempatar, aceptar y expulsar, quitar el
   plazo y bajar el máximo, pero no editar el título ni añadir días u opciones. Una votación sin ajustes de pago se
   edita siempre, como ahora.
2. **El pase acaba la primera vez que la votación se cierra** (al cerrarla, al acabar el plazo o con un desempate
   definitivo) **o a los 60 días de comprarlo**, lo primero que llegue. Después, la votación sigue igual para los
   participantes, pero queda como la de quien no tiene premium (punto 1).
3. **Reabrir una votación cuyo pase ha acabado** cuenta como cualquier reapertura (§9) y no devuelve el pase.

Con suscripción no hace falta más: mientras se paga, reutilizarla es un uso legítimo.

Las reglas lo pueden comprobar: si la votación tiene ajustes de pago, editar el título o lo que se vota exige que
quien la gestiona tenga premium o que el pase siga vigente (`passUntil` en la votación, que escribe el servidor al
cobrarlo y se pone a 0 al cerrarse).

### Votaciones con pase (4.2)

El pase es de la votación, no de quien la gestiona: ya está pagada, así que sigue siendo premium la herede quien la
herede, también alguien sin premium. No abre ninguna fisura, porque cada pase sirve para una sola votación.

### Cómo se comprueba

El plan se guarda en `users/{uid}.premiumUntil` (hasta cuándo tiene premium), que solo escribe el servidor al
comprobar el pago. Las reglas lo leen del gestor actual en cada cambio de pago y lo comparan con la hora del
servidor, así que el premium caduca solo, sin que haga falta escribir nada al acabar la suscripción. Para elegir
heredero con premium, la app tiene que poder leer ese dato de los administradores (como mucho 20).

---

## 9. El límite de votaciones abiertas a la vez (3.1), caso por caso

Cada persona tiene en su perfil un contador de las votaciones abiertas que **gestiona** (las que ha creado o
heredado). Las votaciones en las que solo participa, o de las que es administrador, no cuentan. El límite es 3 sin
premium (y 50 con premium, 3.8).

| Qué pasa | Contador | Si ya está en el límite |
| --- | --- | --- |
| Crea una votación | +1 | No puede crearla. Mensaje: «Tienes 3 votaciones abiertas. Cierra una para crear otra o pásate a premium». |
| Duplica una votación | +1 (es crear) | Igual que crear. |
| Cierra una votación | −1 | — |
| Reabre una votación | +1 | No puede reabrirla. Así no se puede esquivar el límite cerrando y reabriendo. |
| Se acaba el plazo | −1 (lo hace la función que ya avisa del fin del plazo) | — |
| Cierra una votación con el plazo ya pasado | Nada: ya se descontó al acabar el plazo | — |
| Elimina una votación abierta | −1 | — |
| Archiva una votación | Nada: archivar solo la quita de su panel | — |
| Sale de una votación abierta que gestiona | −1 para quien sale y +1 para quien la hereda | La herencia no se bloquea: el heredero puede pasar del límite (§8). |
| Elimina su cuenta | Como salir de cada una | — |
| Se le acaba el premium con 10 abiertas | Nada cambia en ellas: siguen abiertas y funcionando | No puede crear ni reabrir hasta bajar de 3. |
| Crea una votación con pase (4.2) | +1, como cualquier otra | El pase da funciones, no más votaciones: con 3 abiertas tampoco puede crearla. |
| Al estrenar el límite, alguien ya tiene más de 3 | Se cuentan las que tiene | Igual: siguen funcionando y no puede crear más hasta bajar de 3. |

Crear, cerrar y reabrir suben o bajan el contador en la misma escritura que la votación, como ya se hace con
`members`, para que nadie pueda crear cinco de golpe antes de que se actualice. Lo que no hace el propio gestor (el
fin del plazo o recibir una herencia) lo apunta una Cloud Function.

---

## 10. Avisos esenciales y recordatorios

La regla en una frase: **un aviso esencial lo provoca algo que acaba de pasar; un recordatorio lo manda Hilemos por su
cuenta, porque pasa el tiempo.**

| Aviso | Quién lo recibe | Tipo |
| --- | --- | --- |
| «Ana quiere entrar en la votación» | Gestor | Esencial (gratis) |
| «Te han aceptado: ya puedes votar» | Quien pidió entrar | Esencial (gratis) |
| «Ana ha votado» (solo la primera vez) | Gestor | Esencial (gratis) |
| Se ha cerrado o se ha vuelto a abrir | Participantes | Esencial (gratis) |
| Hay un desempate; resultado definitivo o desempate sin ganadora | Participantes | Esencial (gratis) |
| Se ha acabado el plazo | Participantes | Esencial (gratis; el plazo ya es premium) |
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

### Otras ideas

| Idea | Qué sería | Para quién |
| --- | --- | --- |
| Estadísticas para quien organiza (7.19) | Participación por votación, quién suele faltar, cuánto tardan en votar | Plan de organizaciones (4.3) |
| Plan de organizaciones (4.3) | Más personas aún, varios organizadores con una factura, estadísticas | Asociaciones, clubes, empresas |
| Recordatorios por correo | Además de push, para quien no tiene la app (necesita un servicio de envío, 6.5) | Premium |
| Entrar con Apple y app de iPhone (7.14) | Obligatorio para la App Store si se ofrece entrar con Google | Todos |
| Otros idiomas (7.15) | Inglés y catalán, por ejemplo | Todos |
| Dominio propio | Correo de contacto y dirección de la web propios (hola@…) | — |

