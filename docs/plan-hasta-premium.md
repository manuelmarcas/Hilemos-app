# Plan hasta activar premium

Hoja de ruta por fases, de hoy hasta el día en que se empieza a cobrar. Cada fase tiene un **objetivo**, el
**trabajo** que hay que hacer y una **condición para pasar a la siguiente**. Las decisiones de qué es gratis y qué es
premium están en [funcionalidades-y-planes.md](funcionalidades-y-planes.md); aquí solo se ordena el camino.

La idea de fondo: **lanzar gratis, con todo abierto, medir y cobrar solo cuando los números lo justifiquen**. Mientras
no se cobra no hace falta alta de autónomo, gestor ni declararse comerciante en Google Play, y el único gasto es
Firebase, que a esta escala es casi cero.

Los umbrales son una propuesta para decidir con datos y no a ojo. Se pueden cambiar, pero conviene cambiarlos aquí,
por escrito, y no sobre la marcha.

---

## Dónde estamos (24 de noviembre de 2026)

| Pieza | Estado |
| --- | --- |
| Web en hilemos.web.app | Publicada |
| App de Android | Funciona en el móvil (versión de depuración); recorrido automático de 60 de 60 |
| Firebase | Plan Blaze, alerta de presupuesto de 5 €, avisos push desplegados |
| Cuenta de Google Play | Verificada; falta crear la app y subir el primer `.aab` (firmado con la clave de subida) |
| Denunciar y ocultar mensajes | Hecho y publicado; el aviso a quien modera, sin configurar |
| Premium | Marcado en la app (etiquetas «Premium»). En el servidor, la herencia, las cuentas atrás y el cierre automático están hechos y **apagados** (`config/plan.freeForAll`). Faltan los límites en las reglas, el pase y el cobro |
| Medir el uso | No hay nada: no se sabe cuánta gente usa la app ni qué usa |
| Usuarios | Solo pruebas propias |

---

## Fase 1. Lista para la prueba cerrada

**Objetivo:** una versión que se pueda dar a 12 personas sin vergüenza ni riesgo, y que ya mida el uso desde el
primer día.

| # | Trabajo | Quién |
| --- | --- | --- |
| 1.1 | **Medir el uso** (ver «Qué se mide») ✔: totales diarios y mensuales que calcula el servidor cada noche en `stats/`, sin herramientas de analítica ni cookies. Se miran en la consola de Firebase. | Hecho |
| 1.2 | **Marca de premium**: las funciones que serán de pago llevan una etiqueta «Premium» con el aviso «Gratis durante el lanzamiento». Siguen funcionando igual. ✔ | Hecho |
| 1.3 | **Denunciar a una persona**, además de un mensaje: su perfil se abre al pulsar en su nombre en «Participantes». ✔ | Hecho |
| 1.4 | **Aviso de cada denuncia** ✔: por correo a hilemos.app@gmail.com (Brevo). El panel de moderación en la app queda para más adelante (planes de futuro, §11 de funcionalidades-y-planes.md). | Hecho |
| 1.5 | **App Check** en modo «solo medir». El código ya está (también en Android, con Play Integrity: va en el primer `.aab`); faltan las claves y registrar la app en la consola (pasos en `app/README.md`, «App Check»). | Tú, las claves; yo, el código ✔ |
| 1.6 | **Descargar mis datos** (7.16), que lo exige el RGPD en cuanto hay usuarios de verdad. ✔ | Hecho |
| 1.7 | **Clave de subida y primer `.aab`**; huellas de Google Play en Firebase. | Yo, con tu sitio para guardar la clave |
| 1.8 | **Play Console**: verificar la cuenta, crear la app, los formularios (privacidad, seguridad de los datos, clasificación, público, borrar la cuenta) y estado de «no comerciante». | Tú, con mi ayuda en las respuestas |
| 1.9 | **Ficha de la tienda**: capturas, imagen destacada y descripción. | Yo, las capturas y el texto; tú, revisarlos |
| 1.10 | **Versión mínima y aviso para todos** (`config/app`) ✔: sin publicar otra versión, pedir que se actualice una versión vieja o avisar de algo (una incidencia, el estreno de premium). | Hecho |
| 1.11 | **Lo que tiene que ir en el primer `.aab`**: todo lo que necesita código en la app y no se puede cambiar desde el servidor. Ya están la versión mínima, el aviso para todos y el aviso «Se cierra sola». Falta **App Check** (1.5): si se exige más adelante y la versión de la prueba no lo lleva, esa versión dejaría de funcionar. | Los dos |

**Para pasar a la fase 2:** el `.aab` está en la pista de prueba cerrada y hay al menos 12 personas apuntadas.

---

## Fase 2. Prueba cerrada (14 días como mínimo)

**Objetivo:** que Google dé acceso a producción y descubrir lo que falla con gente que no conoce la app.

| # | Trabajo | Quién |
| --- | --- | --- |
| 2.1 | Pedir a los 12 que la usen de verdad: que cada uno cree o vote al menos una votación con su grupo. | Tú |
| 2.2 | Probar lo que faltaba con dos cuentas: avisos push reales, icono del aviso, denuncia y moderación. | Los dos |
| 2.3 | Revisar cada pocos días los fallos (Play Console → Android vitals) y las opiniones. Arreglar lo urgente. | Los dos |
| 2.4 | A los 7 días, si App Check no rechaza a nadie legítimo, exigirlo. | Yo |
| 2.5 | Primera medida real del coste: lecturas y escrituras por votación (ver «Qué cuesta Firebase»). | Yo |

**Para pasar a la fase 3** (las tres cosas):

- 14 días seguidos con 12 personas apuntadas (lo exige Google).
- Ningún fallo que cierre la app o pierda datos sin arreglar.
- App Check exigido.

---

## Fase 3. Lanzamiento público gratis

**Objetivo:** conseguir uso real y saber si Hilemos engancha. Dura lo que haga falta; como referencia, de 3 a 6
meses.

| # | Trabajo | Quién |
| --- | --- | --- |
| 3.1 | Pedir el acceso a producción y publicar. | Tú |
| 3.2 | Darla a conocer: grupos propios, asociaciones, clubes. Cada votación invita sola a varias personas. | Tú |
| 3.3 | Mirar los números una vez al mes y apuntarlos al final de este documento («Registro»). | Los dos |
| 3.4 | Funciones gratuitas que faltan y suman uso: zona horaria (7.12) y limpieza de datos viejos (7.17). | Yo |
| 3.5 | Preparar el código de premium **apagado**: `premiumUntil`, límites en las reglas, pase y cortafuegos (§12, pasos 9 a 13), con un interruptor «todo gratis» encendido. | Yo |

**Señales para pasar a la fase 4** (con dos de las tres, merece la pena hablar con el gestor):

| Señal | Umbral propuesto | Por qué |
| --- | --- | --- |
| Uso sostenido | 300 personas que organizan al mes (crean al menos una votación), dos meses seguidos | Con un 3–5 % que pague, serían 10–15 suscripciones al empezar: poco, pero da una idea de la conversión real. |
| Interés por premium | Al menos el 15 % de las votaciones usan alguna función marcada «Premium» | Si casi nadie las usa, hay que revisar qué es premium antes de cobrar. |
| Coste | Firebase pasa de 5 € al mes dos meses seguidos | Ya no es «casi cero»: el uso empieza a costar dinero. |

**Si a los 6 meses no se cumple ninguna:** no se cobra. Se revisa qué falla (si la gente no vuelve, si no organiza) y
se decide si seguir igual, cambiar el enfoque o mantenerla gratis como proyecto propio, que cuesta poco.

---

## Fase 4. Preparar el cobro

**Objetivo:** tenerlo todo listo, legal y técnicamente, para encender el cobro un día concreto.

| # | Trabajo | Quién |
| --- | --- | --- |
| 4.1 | Gestor: alta en Hacienda, autónomo o no, IVA de ventas digitales y devoluciones (4.5). | Tú |
| 4.2 | Declararse comerciante en Google Play (se ven nombre, dirección, teléfono y correo en la UE) y perfil de pagos. | Tú |
| 4.3 | Cobro en Android (Google Play Billing) y, si se quiere, en la web; la función que comprueba cada pago y escribe `premiumUntil`. | Yo, con tus cuentas |
| 4.4 | Condiciones de pago y la casilla de renuncia al desistimiento (4.5). | Yo, con lo que diga el gestor |
| 4.5 | Avisar en la app con un mes de antelación (al menos 30 días: lo prometen las condiciones de uso, apartado «Premium y lanzamiento»): qué será premium, desde cuándo y el regalo para quien estuvo desde el principio. | Yo, el aviso; tú, la fecha |

**Para pasar a la fase 5:** pago de prueba completo en Android (compra, renovación y cancelación) y alta hecha.

---

## Fase 5. Premium activado

- Se apaga el interruptor «todo gratis»: los límites de §3 empiezan a contar.
- **Lo ya creado se respeta:** las votaciones que ya usaban funciones premium las siguen teniendo hasta su cierre.
- **Fundadores:** quien creó votaciones durante el lanzamiento recibe unos meses de premium (por ejemplo, 3).
  Así la etiqueta «Gratis durante el lanzamiento» se cumple y nadie siente que se le quita algo.
- Primera votación premium gratis para todas las cuentas (4.4).
- Seguir midiendo: qué porcentaje paga, cuánto dura una suscripción y el coste de Firebase frente a lo que se
  ingresa.

---

## Qué se mide

Contadores **agregados**, sin datos de cada persona: los calcula cada noche la Cloud Function `onDaily`
(`functions/stats.js`) a partir de lo que ya está guardado, y se guardan en `stats/{día}` (el día anterior) y, el
día 1, en `stats/{mes}`. No hace falta Google Analytics ni pedir permiso de cookies; la política de privacidad ya dice
que se cuentan totales anónimos. Lo único que manda la app son los `pings` (exportar, compartir la imagen, duplicar):
qué y cuándo, sin quién, y se borran al sumarlos.

| Dato | Campo | Para qué |
| --- | --- | --- |
| Votaciones creadas, por tipo | `polls`, `byType` (día y mes) | Uso general |
| Personas que organizan (distintas) | `organizers` (día y mes) | La señal principal de la fase 3: mirar el del mes |
| Personas que votan (distintas) | `voters` (día; en el mes, aproximado: quien cambia su voto el mes siguiente cuenta en ese) | Alcance: cada organizador trae a su grupo |
| Cuentas nuevas, con y sin registro, y total | `accounts.registered`, `accounts.anonymous`, `totalAccounts` (día) | Alcance y cuántos se registran |
| Votos tocados, entradas en votaciones y mensajes del chat | `votes`, `joins`, `chat` (día) | Actividad y coste (cada uno es una escritura y muchas lecturas) |
| Organizadores que vuelven | `returning` (mes): de quienes organizan este mes, cuántos organizaron también el anterior | Si engancha o es de un solo uso |
| Uso de cada función marcada «Premium» | `features` (plazo, aprobación, correos, administradores, más de 20 personas), `withPremium` y `premiumShare` (% del mes); `clicks` (`xlsx`, `pdf`, `csv`, `image`, `duplicate`) | Qué paga la gente de verdad y si los límites están bien puestos; `premiumShare` es la señal del 15 % |
| Denuncias | `reports` (día) | Si hace falta más moderación |

Lo que no se mide: quién hace qué, desde dónde ni con qué dispositivo. La imagen sin marca aún no existe; cuando
exista, se añade a `clicks`.

## Qué cuesta Firebase

El margen gratuito diario es de 50.000 lecturas y 20.000 escrituras, con 1 GiB guardado. Por encima, Firestore cobra
unos céntimos por cada 100.000 lecturas (el precio exacto depende de la región; míralo en la consola).

Cálculo aproximado, que la fase 2 tiene que confirmar con datos reales: una votación de 8 personas, con unas cuantas
visitas cada una y algo de chat, gasta del orden de **2.000 a 3.000 lecturas** a lo largo de su vida.

| Votaciones al mes | Lecturas al mes (aprox.) | Coste aproximado |
| --- | --- | --- |
| Hasta 500 | Hasta 1,5 millones | 0 € (dentro del margen gratuito) |
| 2.000 | 5 millones | 1–3 € |
| 10.000 | 25 millones | 8–15 € |

Las funciones (avisos push y denuncias) y el envío de los avisos son prácticamente gratis a esta escala (§6.4). La
alerta de presupuesto de 5 € avisa si algo se dispara; un salto sin más uso suele ser un abuso, y lo frena App Check.

---

## Registro

Una línea al mes desde el lanzamiento público: organizadores, votantes, votaciones, uso de premium y coste.

| Mes | Organizan | Votan | Votaciones | Con algo premium | Coste Firebase | Notas |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |
