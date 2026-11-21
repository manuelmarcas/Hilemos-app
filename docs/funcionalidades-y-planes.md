# Funcionalidades de Hilemos y planes: gratis y premium

Este documento recoge todo lo que hace Hilemos hoy, una propuesta de qué podría ir en un plan premium y qué
límites podría tener el plan gratuito. Al final hay una lista de funcionalidades que aún no existen.

Cómo usarlo: en cada tabla, la columna **Propuesta** es una sugerencia para discutir. La columna **Decisión** está
vacía para marcarla (Gratis, Premium o Gratis con límite).

- **Gratis**: lo puede usar cualquiera, sin límite.
- **Premium**: solo con el plan de pago.
- **Gratis con límite**: gratis hasta una cifra; por encima, premium.

---

## 1. Criterios para decidir

1. **Quien vota nunca paga.** Los participantes llegan con un enlace y tienen que poder votar sin pagar ni
   registrarse. Si no, la votación no sale adelante. Además, cada votación trae gente nueva: es la forma en que
   Hilemos crece. Paga quien organiza.
2. **Lo básico tiene que ser gratis y completo**: crear, compartir, votar, ver resultados, desempatar y hablar en
   el chat. Si la primera votación sale mal por un límite, no habrá una segunda.
3. **Premium es más volumen, más control, automatización y mejor acabado.**
   - Más volumen: más votaciones y más gente.
   - Más control: privacidad y coorganizadores.
   - Automatización: plazos, recordatorios y avisos.
   - Mejor acabado: sin marca, exportar y personalizar.
4. **Lo que cuesta dinero de verdad encaja en premium.** Es lo que necesita servidor: avisos, recordatorios y
   correos.
5. **Un límite tiene que entenderse en una frase.** Además, conviene poder comprobarlo con las reglas de la base de
   datos, sin servidor.
6. **El plan va con quien organiza.** Una votación creada con premium conserva lo que se activó al crearla, aunque
   después pase a un «Delegado».

---

## 2. Inventario de funcionalidades

### 2.1 Cuenta y entrada

| Funcionalidad | Qué hace | Propuesta | Decisión |
| --- | --- | --- | --- |
| Entrar con Google | Inicio de sesión con la cuenta de Google (en la web y en Android). | Gratis | |
| Entrar con el correo | Un enlace al correo, sin contraseña; sirve en cualquier dispositivo. | Gratis | |
| Entrar sin cuenta | Solo con un nombre. Hilemos da una **clave de acceso** de 20 caracteres para volver a entrar. | Gratis | |
| Volver con la clave | Recupera la cuenta sin registro tras cerrar sesión, desinstalar o cambiar de móvil. | Gratis | |
| Crear una clave nueva | Anula la anterior. Sirve si se ha perdido. | Gratis | |
| Guardar la cuenta sin registro | La pasa a un correo o a Google sin perder votaciones ni votos. | Gratis | |
| Perfil | Nombre visible e imagen (o inicial sobre un color propio). | Gratis | |
| Tema | Claro, oscuro o automático. | Gratis | |
| Eliminar la cuenta | Sale de todas sus votaciones y borra sus datos. Google Play lo exige. | Gratis (obligatorio) | |
| Modo demo | Probar la app sin cuenta, con los datos guardados solo en el navegador. | Gratis | |

> Para pagar hace falta una cuenta con Google o con correo. Una cuenta sin registro solo se recupera con la clave,
> y no es buena base para una suscripción.

### 2.2 Crear una votación

| Funcionalidad | Qué hace | Propuesta | Decisión |
| --- | --- | --- | --- |
| Votación por días | Calendario de días; en cada día, hasta 4 opciones (comida, cena…) con emoji y nombre. | Gratis | |
| Votación por horas | Franjas periódicas (cada 30 minutos, 1 hora o 2 horas) u horas sueltas distintas en cada día. | Gratis | |
| Votación por semanas | Se vota la semana entera. | Gratis | |
| Votación por meses | Se vota el mes entero. | Gratis | |
| Varios meses y atajos | Elegir varios meses; marcar todos, de lunes a viernes o fines de semana. | Gratis | |
| Opciones por día | De 1 a 4 opciones por día, con vista previa de la casilla. | Gratis (posible límite: 2 gratis, 4 premium) | |
| Título y descripción | Con selector de emojis en el ordenador. | Gratis | |
| Votación anónima | Solo se ven los totales, no quién votó qué. | Gratis | |
| Plazo para votar | Se cierra sola en el día y la hora elegidos. | Premium | |
| Máximo de personas | De 2 a 150 por votación; se puede cambiar después. | Gratis con límite (p. ej. 25 gratis) | |
| Con aprobación | El organizador acepta o rechaza a cada persona que entra. | Premium | |
| Solo estos correos | Solo entran los correos de una lista (hasta 150). | Premium | |
| Grupo al crearla | Se guarda directamente en uno de sus grupos. | Gratis | |
| Duplicar | Crear otra igual, como plantilla (sin el plazo). | Gratis | |

### 2.3 Votar

| Funcionalidad | Qué hace | Propuesta | Decisión |
| --- | --- | --- | --- |
| Calendario para votar | Pulsar las casillas (día y opción, semana, mes u hora) en las que se puede. | Gratis | |
| Cambiar el voto | Hasta que se cierre o se acabe el plazo. | Gratis | |
| Votar sin cuenta | En las votaciones abiertas, con solo un nombre. | Gratis | |
| Ver qué votó cada uno | Salvo en las anónimas. | Gratis | |

### 2.4 Resultados

| Funcionalidad | Qué hace | Propuesta | Decisión |
| --- | --- | --- | --- |
| Más votadas | Las 5 mejores (los empates comparten puesto) y quién votó cada una. | Gratis | |
| La más votada en el calendario | Un borde verde en la mejor casilla de cada opción. | Gratis | |
| Desempate | Cada persona elige una sola de las empatadas; se puede finalizar, repetir entre las que siguen empatadas o anular. | Gratis | |
| Desempate que se ajusta solo | Si alguien se va y cambia el empate, se recalcula al abrir la votación un administrador. | Gratis | |
| Imagen del resultado | Una tarjeta PNG para compartir, con la marca Hilemos. | Gratis (premium: sin marca o personalizada) | |
| Añadir al calendario | Google Calendar o un archivo .ics para Apple, Outlook y otros. | Gratis | |
| Avisar a quien falta | Un mensaje con los nombres de quien falta por votar, para WhatsApp o el menú de compartir. | Gratis | |

### 2.5 Participantes y gestión

| Funcionalidad | Qué hace | Propuesta | Decisión |
| --- | --- | --- | --- |
| Tabla de participantes | Lo que ha votado cada uno, desplegable por persona. | Gratis | |
| Buscador y filtros | A partir de 10 personas: buscar y filtrar por quién ha votado y quién no. | Gratis | |
| «Se fueron» | Quien salió con la votación cerrada, aparte; sus votos siguen contando. | Gratis | |
| Cerrar y reabrir | Al reabrir se anula el desempate. | Gratis | |
| Hacerla anónima después | Sin vuelta atrás, para no destapar votos. | Gratis | |
| Administradores | El creador nombra coorganizadores que gestionan como él, salvo eliminarla y nombrar a otros. | Premium | |
| Delegado | Si el creador se va, la votación pasa a un administrador o a otro participante. | Gratis (es una garantía) | |
| Solicitudes | Aceptar, rechazar o volver a admitir (en las de aprobación). | Va con «Con aprobación» | |
| Acceso y plazas | Cambiar después el máximo de personas y la lista de correos. | Va con el máximo y con «Solo estos correos» | |
| Quitar el plazo | Vuelve a abrir la votación. | Va con «Plazo para votar» | |
| Eliminar la votación | La borra para todos. | Gratis | |
| Salir de la votación | Avisa de lo que pasa con los votos según el estado de la votación. | Gratis | |

### 2.6 Chat

| Funcionalidad | Qué hace | Propuesta | Decisión |
| --- | --- | --- | --- |
| Chat de cada votación | Para rematar el plan; funciona también con la votación cerrada. | Gratis | |
| Mensajes sin leer | Contador en la pestaña, sincronizado entre dispositivos. | Gratis | |
| Emojis | Selector propio en el ordenador; en el móvil, el del teclado. | Gratis | |

Se ven los últimos 200 mensajes y cada mensaje tiene como mucho 500 caracteres.

### 2.7 Organizar «Mis votaciones»

| Funcionalidad | Qué hace | Propuesta | Decisión |
| --- | --- | --- | --- |
| Grupos | Crear, renombrar, eliminar y plegar grupos (Familia, Trabajo…). | Gratis | |
| Mover de grupo | Con el menú ⋯ o arrastrando en el menú lateral. | Gratis | |
| Archivar | Saca la votación del panel y del menú sin salir de ella; se puede deshacer. | Gratis | |
| Menú lateral | Todas las votaciones a mano, con buscador. | Gratis | |
| Deslizar en el móvil | → archivar, ← salir. | Gratis | |

### 2.8 Compartir

| Funcionalidad | Qué hace | Propuesta | Decisión |
| --- | --- | --- | --- |
| Enlace | Copiar o compartir con el menú del sistema. | Gratis | |
| Código QR | Para enseñarlo en persona o descargarlo. | Gratis | |

### 2.9 Plataformas y avisos

| Funcionalidad | Qué hace | Propuesta | Decisión |
| --- | --- | --- | --- |
| Web y Android | La misma app, también instalable. | Gratis | |
| Mala conexión | Guarda una copia local: abre más rápido y aguanta cortes. | Gratis | |
| Avisos push | Alguien vota; cierre, desempate o fin del plazo; solicitudes. Cada uno se activa o desactiva en el perfil. Está hecho, pero **no activo**: necesita el plan Blaze de Firebase y desplegar las Cloud Functions. | Gratis los esenciales; premium los recordatorios (ver §6) | |

---

## 3. Límites para el plan gratuito: alternativas

Ninguna cifra está decidida: son ejemplos para comparar.

| Límite | Ejemplo | A favor | En contra | ¿Hace falta servidor? |
| --- | --- | --- | --- | --- |
| **A. Votaciones abiertas a la vez** | 3 abiertas; las cerradas no cuentan | No castiga a quien organiza de vez en cuando; se libera cerrando una | Cerrar y reabrir para esquivarlo (se arregla contando también al reabrir) | No: un contador en el perfil y las reglas |
| **B. Votaciones creadas al mes** | 3 al mes | Muy fácil de explicar | Castiga los picos (Navidad, verano); el contador vuelve a cero cada mes | No: un contador con el mes, en las reglas |
| **C. Personas por votación** | 25 gratis; 150 en premium | Pagan los grupos grandes: asociaciones, clubes, empresas, bodas | Un grupo grande de amigos se topa con él | No: ya existen `maxPeople` y `members` |
| **D. Funciones de control** | Aprobación, solo correos, administradores y plazo en premium | Lo básico sigue completo; paga quien necesita control | Hay que elegir bien qué es «avanzado» | No: las reglas miran el plan al crear o cambiar |
| **E. Opciones por día** | 2 gratis; 4 en premium | Sencillo | Diferencia poco y puede frustrar al crear | No |
| **F. Caducidad** | Las gratuitas se borran N meses después del último movimiento | Ahorra almacenamiento | Molesta a quien quiere recordar; hay que avisar antes | Sí: una tarea programada |
| **G. Marca en lo compartido** | Imagen del resultado con «Hecho con Hilemos» | Publicidad gratis cada vez que se comparte | Ninguno serio | No |

**Recomendación: A + C + D, y opcionalmente G.**

- 3 votaciones abiertas a la vez.
- Hasta 25 personas por votación.
- Aprobación, solo correos, administradores y plazo, en premium.
- Votar, resultados, desempate, chat, grupos y compartir: gratis y sin límite.

Prefiero A a B («3 al mes») por tres motivos:

- Quien organiza poco nunca lo nota.
- Quien organiza mucho lo nota justo cuando más usa la app, que es cuando más dispuesto está a pagar.
- Un límite mensual se siente como un castigo en los meses de más actividad.

---

## 4. Formas de cobrar

Los precios son orientativos: hay que compararlos con alternativas como Doodle antes de fijarlos.

| Modelo | Ejemplo | Para quién |
| --- | --- | --- |
| Suscripción de quien organiza | 2,99 €/mes o 24,99 €/año | Quien organiza a menudo: grupos de amigos, familia, deporte |
| Pase para una votación | 1,99 € desbloquea premium en una sola votación | Eventos puntuales: una boda, un viaje, una cena de empresa |
| Plan para organizaciones | Precio por organizador, con facturación | Asociaciones, clubes, academias, empresas |

El pase para una votación funciona bien con la recomendación de §3: quien solo necesita, una vez, más de 25 personas
o la aprobación no tiene que suscribirse.

---

## 5. Qué hace falta técnicamente para cobrar

- **Cobro en Android.** En contenido digital dentro de la app, Google Play obliga a usar su sistema de pagos (Google
  Play Billing), con comisión (15 % en suscripciones). En la web se puede cobrar con Stripe u otro.
- **Saber quién es premium.** Hace falta un dato que la app no pueda falsificar, por ejemplo `users/{uid}.plan` o
  una marca en la sesión de Firebase. Solo puede escribirlo un servidor después de comprobar el pago:
  - con el aviso de Stripe;
  - con la API de Google Play;
  - o con un servicio como RevenueCat.

  Esto obliga a pasar el proyecto de Firebase al plan **Blaze** (de pago por uso) y a desplegar Cloud Functions.
  Con el uso de ahora, Blaze costaría prácticamente 0 € al mes.
- **Comprobar los límites.** A, B, C, D, E y G se pueden comprobar con las reglas de Firestore y contadores, sin
  servidor, como ya se hace con `members` y `maxPeople`. F necesita una tarea programada.
- **Los límites van en las reglas, no solo en la pantalla.** Si solo los comprueba la app, alguien con
  conocimientos técnicos se los salta.

---

## 6. Qué cuesta dinero (para fijar los límites)

- **Lecturas de la base de datos.** Abrir una votación lee la votación, todos sus votos y el chat (hasta 200
  mensajes). Mientras está abierta en pantalla, cada cambio se lee una vez por cada persona conectada. Lo más caro
  es una votación grande con el chat muy activo: por eso el límite C es el que más protege.
- **Escrituras.** Cada voto, mensaje o persona que entra.
- **Almacenamiento.** Poco: las imágenes de perfil son pequeñas (128 px, y 64 px en los votos).
- **Avisos push.** El envío (Firebase Cloud Messaging) es gratis. Las Cloud Functions que los mandan son
  prácticamente gratis a esta escala.
- **Correos.** El enlace de entrada lo manda Firebase sin coste. Unos recordatorios por correo necesitarían un
  servicio de envío (Brevo u otro).
- **Margen gratuito de Firebase (plan Spark).** Cada día, 50.000 lecturas y 20.000 escrituras; en total, 1 GiB
  guardado. Hoy sobra mucho.

---

## 7. Funcionalidades que echo en falta

### Imprescindibles antes de publicar en la tienda o de cobrar

1. **Política de privacidad, condiciones de uso y contacto.** La Play Store y el RGPD las exigen; al cobrar, también
   las condiciones de pago y de devolución.
2. **Editar una votación ya creada**: título, descripción y añadir días u opciones. Quitarlos tiene que avisar si
   ya tienen votos. Hoy solo se puede duplicar.
3. **Elegir la ganadora y anunciarla.** Un paso final que cierre la votación, avise a todos del resultado y les
   ofrezca añadirlo al calendario. Es el momento en que el plan queda cerrado.
4. **Protección contra abusos:**
   - App Check, para que solo la app use la base de datos;
   - un límite de cuentas sin registro por dispositivo (bots);
   - denunciar o moderar mensajes del chat (las tiendas lo piden en apps con contenido de los usuarios).
5. **Activar los avisos push.** Ya están hechos: falta pasar a Blaze y desplegar las funciones.

### Muy útiles

6. **«Si hace falta».** Además de «sí», una respuesta tibia: ayuda a encontrar fechas cuando nada encaja.
7. **Recordatorios automáticos**: a quien falta por votar y antes de que acabe el plazo. Buen candidato a premium.
8. **Votaciones de opciones libres**, sin fechas: restaurante, regalo, destino… Abre muchos más usos.
9. **Ocultar los resultados hasta votar o hasta el cierre**, para que nadie vote lo que ya va ganando.
10. **Exportar los resultados** (Excel/CSV o PDF). Buen candidato a premium.
11. **Una nota con el voto** («llego a las 22:00», «solo por la tarde»).
12. **Zona horaria** en las votaciones por horas, para grupos en varios países.
13. **Límite de elecciones por persona** («elige como mucho 3»).

### Más adelante

14. **Entrar con Apple.** Es obligatorio para publicar en la App Store si se ofrece entrar con Google.
15. **Otros idiomas**: inglés y catalán, por ejemplo.
16. **Descargar mis datos.** El RGPD reconoce el derecho de acceso y portabilidad.
17. **Limpieza automática de datos viejos**: cuentas sin registro que nadie usa y votaciones abandonadas.
18. **Personalizar una votación** con un color o una imagen de portada. Candidato a premium.
19. **Estadísticas para quien organiza**: participación y quién suele faltar. Candidato al plan de organizaciones.
