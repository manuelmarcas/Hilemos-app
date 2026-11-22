# Funcionalidades de Hilemos y planes: gratis y premium

Este documento recoge todo lo que hace Hilemos hoy, una propuesta de qué podría ir en un plan premium y qué
límites podría tener el plan gratuito. Al final hay una lista de funcionalidades que aún no existen.

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
- **Decisión**: vacía, para que la marques tú.

---

## 1. Criterios para decidir

| N.º | Criterio |
| --- | --- |
| 1.1 | **Quien vota nunca paga.** Los participantes llegan con un enlace y tienen que poder votar sin pagar ni registrarse. Si no, la votación no sale adelante. Además, cada votación trae gente nueva: es la forma en que Hilemos crece. Paga quien organiza. |
| 1.2 | **Lo básico tiene que ser gratis y completo**: crear, compartir, votar, ver resultados, desempatar y hablar en el chat. Si la primera votación sale mal por un límite, no habrá una segunda. |
| 1.3 | **Premium es más volumen** (más votaciones y más gente), **más control** (privacidad y coorganizadores), **automatización** (plazos, recordatorios y avisos) y **mejor acabado** (sin marca, exportar y personalizar). |
| 1.4 | **Lo que cuesta dinero de verdad encaja en premium.** Es lo que necesita servidor: avisos, recordatorios y correos. |
| 1.5 | **Un límite tiene que entenderse en una frase.** Además, conviene poder comprobarlo con las reglas de la base de datos, sin servidor. |
| 1.6 | **El plan va con quien organiza.** Una votación creada con premium conserva lo que se activó al crearla, aunque después pase a un «Delegado». |

---

## 2. Inventario de funcionalidades

### 2.1 Cuenta y entrada

| N.º | Funcionalidad | Qué hace | Propuesta | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- |
| 2.1.1 | Entrar con Google | Inicio de sesión con la cuenta de Google (en la web y en Android). | Gratis | No | |
| 2.1.2 | Entrar con el correo | Un enlace al correo, sin contraseña; sirve en cualquier dispositivo. | Gratis | No | |
| 2.1.3 | Entrar sin cuenta | Solo con un nombre. Hilemos da una **clave de acceso** de 20 caracteres para volver a entrar. | Gratis | No | |
| 2.1.4 | Volver con la clave | Recupera la cuenta sin registro tras cerrar sesión, desinstalar o cambiar de móvil. | Gratis | No | |
| 2.1.5 | Crear una clave nueva | Anula la anterior. Sirve si se ha perdido. | Gratis | No | |
| 2.1.6 | Guardar la cuenta sin registro | La pasa a un correo o a Google sin perder votaciones ni votos. | Gratis | No | |
| 2.1.7 | Perfil | Nombre visible e imagen (o inicial sobre un color propio). | Gratis | No | |
| 2.1.8 | Tema | Claro, oscuro o automático. | Gratis | No | |
| 2.1.9 | Eliminar la cuenta | Sale de todas sus votaciones y borra sus datos. Google Play lo exige. | Gratis (obligatorio) | No | |
| 2.1.10 | Modo demo | Probar la app sin cuenta, con los datos guardados solo en el navegador. | Gratis | No | |

> Para pagar hace falta una cuenta con Google o con correo. Una cuenta sin registro solo se recupera con la clave,
> y no es buena base para una suscripción.

### 2.2 Crear una votación

| N.º | Funcionalidad | Qué hace | Propuesta | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- |
| 2.2.1 | Votación por días | Calendario de días; en cada día, hasta 4 opciones (comida, cena…) con emoji y nombre. | Gratis | No | |
| 2.2.2 | Votación por horas | Franjas periódicas (cada 30 minutos, 1 hora o 2 horas) u horas sueltas distintas en cada día. | Gratis | No | |
| 2.2.3 | Votación por semanas | Se vota la semana entera. | Gratis | No | |
| 2.2.4 | Votación por meses | Se vota el mes entero. | Gratis | No | |
| 2.2.5 | Votación de opciones libres | Una lista sin fechas (restaurante, regalo, destino…), de 2 a 30 opciones con nombre y emoji opcional. | Gratis | No | |
| 2.2.6 | Varios meses y atajos | Elegir varios meses; marcar todos, de lunes a viernes o fines de semana. | Gratis | No | |
| 2.2.7 | Opciones por día | De 1 a 4 opciones por día, con vista previa de la casilla. | Gratis (posible límite: 2 gratis, 4 premium) | ★ | |
| 2.2.8 | Título y descripción | Con selector de emojis en el ordenador. | Gratis | No | |
| 2.2.9 | Votación anónima | Solo se ven los totales, no quién votó qué. | Gratis | No | |
| 2.2.10 | Plazo para votar | Se cierra sola en el día y la hora elegidos. | Premium | ★★ | |
| 2.2.11 | Máximo de personas | De 2 a 150 por votación; se puede cambiar después. | Gratis con límite (p. ej. 25 gratis) | ★★★ | |
| 2.2.12 | Con aprobación | El organizador acepta o rechaza a cada persona que entra. | Premium | ★★★ | |
| 2.2.13 | Solo estos correos | Solo entran los correos de una lista (hasta 150). | Premium | ★★★ | |
| 2.2.14 | Grupo al crearla | Se guarda directamente en uno de sus grupos. | Gratis | No | |
| 2.2.15 | Duplicar | Crear otra igual, como plantilla (sin el plazo). | Gratis | ★ | |
| 2.2.16 | Editar | Nombre y descripción siempre; añadir días, horas u opciones (sin quitar lo que tiene votos). Cada cambio se avisa en el chat. | Gratis | No | |

### 2.3 Votar

| N.º | Funcionalidad | Qué hace | Propuesta | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- |
| 2.3.1 | Calendario para votar | Pulsar las casillas (día y opción, semana, mes u hora) en las que se puede. | Gratis | No | |
| 2.3.2 | Cambiar el voto | Hasta que se cierre o se acabe el plazo. | Gratis | No | |
| 2.3.3 | Votar sin cuenta | En las votaciones abiertas, con solo un nombre. | Gratis | No | |
| 2.3.4 | Ver qué votó cada uno | Salvo en las anónimas. | Gratis | No | |

### 2.4 Resultados

| N.º | Funcionalidad | Qué hace | Propuesta | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- |
| 2.4.1 | Más votadas | Las 5 mejores (los empates comparten puesto) y quién votó cada una. | Gratis | No | |
| 2.4.2 | La más votada en el calendario | Un borde verde en la mejor casilla de cada opción. | Gratis | No | |
| 2.4.3 | Desempate | Cada persona elige una sola de las empatadas; abierto se puede anular; finalizado con ganadora es definitivo (no se reabre); sin ganadora, solo se repite. | Gratis | No | |
| 2.4.4 | Desempate que se ajusta solo | Si alguien se va y cambia el empate, se ajusta solo al momento y quien entra ve un aviso de lo que ha pasado. | Gratis | No | |
| 2.4.5 | Imagen del resultado | Una tarjeta PNG para compartir, con la marca Hilemos. | Gratis (premium: sin marca o personalizada) | ★★ | |
| 2.4.6 | Añadir al calendario | Google Calendar o un archivo .ics para Apple, Outlook y otros. | Gratis | No | |
| 2.4.7 | Avisar a quien falta | Un mensaje con los nombres de quien falta por votar, para WhatsApp o el menú de compartir. | Gratis | ★ (los recordatorios automáticos, 7.7, sí son ★★★) | |

### 2.5 Participantes y gestión

| N.º | Funcionalidad | Qué hace | Propuesta | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- |
| 2.5.1 | Tabla de participantes | Lo que ha votado cada uno, desplegable por persona. | Gratis | No | |
| 2.5.2 | Buscador y filtros | A partir de 10 personas: buscar y filtrar por quién ha votado y quién no. | Gratis | No | |
| 2.5.3 | «Se fueron» | Quien salió con la votación cerrada, aparte; sus votos siguen contando. Si vuelve con el enlace, recupera su nombre en sus votos y en el chat. | Gratis | No | |
| 2.5.4 | Cerrar y reabrir | Al reabrir se anula el desempate. | Gratis | No | |
| 2.5.5 | Hacerla anónima después | Sin vuelta atrás, para no destapar votos. | Gratis | No | |
| 2.5.6 | Administradores | El creador nombra coorganizadores que gestionan como él, salvo eliminarla y nombrar a otros. | Premium | ★★★ | |
| 2.5.7 | Delegado | Si el creador se va, la votación pasa a un administrador o a otro participante. | Gratis (es una garantía) | No | |
| 2.5.8 | Solicitudes | Aceptar, rechazar o volver a admitir (en las de aprobación). | Va con 2.2.12 | ★★★ (con 2.2.12) | |
| 2.5.9 | Acceso y plazas | Cambiar después el máximo de personas y la lista de correos. | Va con 2.2.11 y 2.2.13 | ★★ (con 2.2.11 y 2.2.13) | |
| 2.5.10 | Quitar el plazo | Vuelve a abrir la votación. | Va con 2.2.10 | ★★ (con 2.2.10) | |
| 2.5.11 | Eliminar la votación | La borra para todos. | Gratis | No | |
| 2.5.12 | Salir de la votación | Avisa de lo que pasa con los votos según el estado de la votación. | Gratis | No | |

### 2.6 Chat

| N.º | Funcionalidad | Qué hace | Propuesta | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- |
| 2.6.1 | Chat de cada votación | Para rematar el plan; funciona también con la votación cerrada. | Gratis | No | |
| 2.6.2 | Mensajes sin leer | Contador en la pestaña, sincronizado entre dispositivos. | Gratis | No | |
| 2.6.3 | Emojis | Selector propio en el ordenador; en el móvil, el del teclado. | Gratis | No | |

Se ven los últimos 200 mensajes y cada mensaje tiene como mucho 500 caracteres.

### 2.7 Organizar «Mis votaciones»

| N.º | Funcionalidad | Qué hace | Propuesta | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- |
| 2.7.1 | Grupos | Crear, renombrar, eliminar y plegar grupos (Familia, Trabajo…). | Gratis | No | |
| 2.7.2 | Mover de grupo | Con el menú ⋯ o arrastrando en el menú lateral. | Gratis | No | |
| 2.7.3 | Archivar | Saca la votación del panel y del menú sin salir de ella; se puede deshacer. | Gratis | No | |
| 2.7.4 | Menú lateral | Todas las votaciones a mano, con buscador. | Gratis | No | |
| 2.7.5 | Deslizar en el móvil | → archivar, ← salir. | Gratis | No | |

### 2.8 Compartir

| N.º | Funcionalidad | Qué hace | Propuesta | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- |
| 2.8.1 | Enlace | Copiar o compartir con el menú del sistema. | Gratis | No | |
| 2.8.2 | Código QR | Para enseñarlo en persona o descargarlo. | Gratis | No | |

### 2.9 Plataformas y avisos

| N.º | Funcionalidad | Qué hace | Propuesta | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- |
| 2.9.1 | Web y Android | La misma app, también instalable. | Gratis | No | |
| 2.9.2 | Mala conexión | Guarda una copia local: abre más rápido y aguanta cortes. | Gratis | No | |
| 2.9.3 | Avisos push | Alguien vota; cierre, desempate o fin del plazo; solicitudes. Cada uno se activa o desactiva en el perfil. Hechos en la web y en la app de Android, pero **no activos**: necesitan el plan Blaze de Firebase, la clave VAPID y desplegar las Cloud Functions. | Gratis los esenciales; premium los recordatorios (ver 6.4 y 7.7) | ★ (los recordatorios, ★★★) | |
| 2.9.4 | Privacidad y condiciones | Política de privacidad y condiciones de uso, enlazadas desde la entrada y el perfil. | Gratis (obligatorio) | No | |

---

## 3. Límites para el plan gratuito: alternativas

Ninguna cifra está decidida: son ejemplos para comparar.

| N.º | Límite | Ejemplo | A favor | En contra | ¿Hace falta servidor? | ¿Para premium? | Decisión |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3.1 | **Votaciones abiertas a la vez** | 3 abiertas; las cerradas no cuentan | No castiga a quien organiza de vez en cuando; se libera cerrando una | Cerrar y reabrir para esquivarlo (se arregla contando también al reabrir) | No: un contador en el perfil y las reglas | ★★★ | |
| 3.2 | **Votaciones creadas al mes** | 3 al mes | Muy fácil de explicar | Castiga los picos (Navidad, verano); el contador vuelve a cero cada mes | No: un contador con el mes, en las reglas | ★★ (mejor 3.1) | |
| 3.3 | **Personas por votación** | 25 gratis; 150 en premium | Pagan los grupos grandes: asociaciones, clubes, empresas, bodas | Un grupo grande de amigos se topa con él | No: ya existen `maxPeople` y `members` | ★★★ | |
| 3.4 | **Funciones de control** | Aprobación, solo correos, administradores y plazo en premium | Lo básico sigue completo; paga quien necesita control | Hay que elegir bien qué es «avanzado» | No: las reglas miran el plan al crear o cambiar | ★★★ | |
| 3.5 | **Opciones por día** | 2 gratis; 4 en premium | Sencillo | Diferencia poco y puede frustrar al crear | No | ★ | |
| 3.6 | **Caducidad** | Las gratuitas se borran N meses después del último movimiento | Ahorra almacenamiento | Molesta a quien quiere recordar; hay que avisar antes | Sí: una tarea programada | ★ | |
| 3.7 | **Marca en lo compartido** | Imagen del resultado con «Hecho con Hilemos» | Publicidad gratis cada vez que se comparte | Ninguno serio | No | ★★ | |

**Recomendación: 3.1 + 3.3 + 3.4, y opcionalmente 3.7.**

- 3 votaciones abiertas a la vez.
- Hasta 25 personas por votación.
- Aprobación, solo correos, administradores y plazo, en premium.
- Votar, resultados, desempate, chat, grupos y compartir: gratis y sin límite.

Prefiero 3.1 a 3.2 («3 al mes») por tres motivos:

- Quien organiza poco nunca lo nota.
- Quien organiza mucho lo nota justo cuando más usa la app, que es cuando más dispuesto está a pagar.
- Un límite mensual se siente como un castigo en los meses de más actividad.

---

## 4. Formas de cobrar

Los precios son orientativos: hay que compararlos con alternativas como Doodle antes de fijarlos.

| N.º | Modelo | Ejemplo | Para quién | Recomendación | Decisión |
| --- | --- | --- | --- | --- | --- |
| 4.1 | Suscripción de quien organiza | 2,99 €/mes o 24,99 €/año | Quien organiza a menudo: grupos de amigos, familia, deporte | ★★★ (la base) | |
| 4.2 | Pase para una votación | 1,99 € desbloquea premium en una sola votación | Eventos puntuales: una boda, un viaje, una cena de empresa | ★★★ (junto a 4.1) | |
| 4.3 | Plan para organizaciones | Precio por organizador, con facturación | Asociaciones, clubes, academias, empresas | ★★ (más adelante) | |

El pase para una votación (4.2) funciona bien con la recomendación de §3: quien solo necesita, una vez, más de 25
personas o la aprobación no tiene que suscribirse.

---

## 5. Qué hace falta técnicamente para cobrar

| N.º | Qué | Detalle |
| --- | --- | --- |
| 5.1 | **Cobro en Android** | En contenido digital dentro de la app, Google Play obliga a usar su sistema de pagos (Google Play Billing), con comisión (15 % en suscripciones). En la web se puede cobrar con Stripe u otro. |
| 5.2 | **Saber quién es premium** | Hace falta un dato que la app no pueda falsificar, por ejemplo `users/{uid}.plan` o una marca en la sesión de Firebase. Solo puede escribirlo un servidor después de comprobar el pago (con el aviso de Stripe, con la API de Google Play o con un servicio como RevenueCat). Esto obliga a pasar el proyecto de Firebase al plan **Blaze** (de pago por uso) y a desplegar Cloud Functions. Con el uso de ahora, Blaze costaría prácticamente 0 € al mes. |
| 5.3 | **Comprobar los límites** | 3.1, 3.2, 3.3, 3.4, 3.5 y 3.7 se pueden comprobar con las reglas de Firestore y contadores, sin servidor, como ya se hace con `members` y `maxPeople`. 3.6 necesita una tarea programada. |
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
| 7.1 | Política de privacidad y condiciones de uso | La Play Store y el RGPD las exigen. Falta una **dirección de contacto** en la política y, al cobrar, las condiciones de pago y de devolución. | Hecha (falta el contacto) | No | |
| 7.2 | Editar una votación ya creada | No se puede quitar lo que tiene votos y los cambios se avisan en el chat. | Hecho | No | |
| 7.3 | Elegir la ganadora | La ganadora la deciden los votos; finalizar el desempate deja el resultado definitivo y avisa a todos. | Descartado | No | |
| 7.4 | Protección contra abusos | App Check (que solo la app use la base de datos), límite de cuentas sin registro por dispositivo (bots) y denunciar o moderar mensajes del chat (las tiendas lo piden en apps con contenido de los usuarios). | Pendiente | No | |
| 7.5 | Activar los avisos push | Ya están hechos, también en la app de Android: falta pasar a Blaze, poner la clave VAPID y desplegar las funciones. | Pendiente | ★ (los recordatorios, 7.7, ★★★) | |
| **Muy útiles** | | | | | |
| 7.6 | «Si hace falta» | Además de «sí», una respuesta tibia: ayuda a encontrar fechas cuando nada encaja. | Pendiente | No | |
| 7.7 | Recordatorios automáticos | A quien falta por votar y antes de que acabe el plazo. | Pendiente | ★★★ | |
| 7.8 | Votaciones de opciones libres | Restaurante, regalo, destino… | Hecho | No | |
| 7.9 | Ocultar los resultados hasta votar o hasta el cierre | Para que nadie vote lo que ya va ganando. | Pendiente | ★★ | |
| 7.10 | Exportar los resultados | Excel/CSV o PDF. | Pendiente | ★★★ | |
| 7.11 | Una nota con el voto | «Llego a las 22:00», «solo por la tarde». | Pendiente | ★ | |
| 7.12 | Zona horaria | En las votaciones por horas, para grupos en varios países. | Pendiente | ★ | |
| 7.13 | Límite de elecciones por persona | «Elige como mucho 3». | Pendiente | ★ | |
| **Más adelante** | | | | | |
| 7.14 | Entrar con Apple | Obligatorio para publicar en la App Store si se ofrece entrar con Google. | Pendiente | No | |
| 7.15 | Otros idiomas | Inglés y catalán, por ejemplo. | Pendiente | No | |
| 7.16 | Descargar mis datos | El RGPD reconoce el derecho de acceso y portabilidad. | Pendiente | No | |
| 7.17 | Limpieza automática de datos viejos | Cuentas sin registro que nadie usa y votaciones abandonadas. | Pendiente | No | |
| 7.18 | Personalizar una votación | Un color o una imagen de portada. | Pendiente | ★★★ | |
| 7.19 | Estadísticas para quien organiza | Participación y quién suele faltar. | Pendiente | ★★★ (plan de organizaciones, 4.3) | |
