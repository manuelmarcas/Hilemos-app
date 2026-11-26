# Publicar Hilemos en Google Play: de la versión al enlace de la prueba cerrada

Guía paso a paso de todo el proceso, tal como se hizo la primera vez (24 y 25 de noviembre de 2026): generar el
`.aab`, crear la app en Play Console, rellenar todos los formularios, montar la prueba cerrada con un grupo de
Google, pasar la revisión, conseguir los enlaces para los testers y dejar Firebase preparado para que la app de la
tienda funcione.

**Los apartados 1 a 16 van en el orden en que se hacen.** Del 17 en adelante: las versiones siguientes y lo que se
consulta cuando hace falta.

Los menús de Play Console cambian a menudo: si un nombre no coincide, busca el más parecido o usa la lupa de arriba.

---

## Índice

1. Lo que hace falta antes de empezar
2. Generar el `.aab`
3. Crear la app en Play Console
4. Configurar la app (formularios obligatorios)
5. Ficha de la tienda
6. Prueba cerrada: países y testers
7. Crear la versión y subir el `.aab`
8. Enviar a revisión
9. Huellas de la firma en Firebase (imprescindible)
10. App Check: registrar las apps y empezar a medir
11. Tras la aprobación: los enlaces para los testers
12. Comprobarlo antes de invitar a nadie
13. Invitar a los testers
14. Durante los 14 días
15. Exigir App Check (tras una semana midiendo)
16. Pedir el acceso a producción
17. Versiones siguientes
18. App Check, en detalle (consulta)
19. Problemas frecuentes
20. Datos de referencia

---

## 1. Lo que hace falta antes de empezar

| Qué | Dónde está / cómo se consigue |
| --- | --- |
| Cuenta de desarrollador de Google Play | Pagada (25 $) y verificada. Las cuentas personales nuevas necesitan una prueba cerrada de 12 personas durante 14 días antes de publicar. |
| Clave de subida | `hilemos-upload.jks`, **fuera del repositorio** (carpeta del proyecto en el Escritorio). Alias `hilemos-upload`. Sin ella y su contraseña no se pueden subir actualizaciones: guárdala con copia de seguridad. |
| `app/android/keystore.properties` | Dice dónde está la clave y sus contraseñas. Ignorado por git: **nunca** se sube ni se comparte. Sin él, la versión sale sin firmar. |
| JDK 21 | Temurin 21 (`C:\Program Files\Eclipse Adoptium\jdk-21…`). Gradle 8.14 no acepta el JDK 25 de Android Studio. |
| Android SDK | `%LOCALAPPDATA%\Android\Sdk` (lo instala Android Studio). |
| Node y dependencias | `npm install` en `app/`. |
| Correo de contacto | `hilemos.app@gmail.com` |
| Política de privacidad | `https://hilemos.web.app/#/privacidad` |

---

## 2. Generar el `.aab`

El `.aab` (Android App Bundle) es el archivo que se sube a Play. Lleva dentro la web compilada (`app/dist`), así que
**cualquier cambio en `app/src` necesita un `.aab` nuevo** para llegar a la app de Android. Lo que es del servidor
(reglas, Cloud Functions, `config/app`) no.

### 2.1 Comprobar que el código está listo

```bash
cd app
git status            # limpio y al día con origin/main
npm test              # todas las pruebas en verde
```

### 2.2 Número de versión

En `app/android/app/build.gradle`:

```gradle
versionCode 4        // entero; cada subida a Play tiene que ser mayor que la anterior
versionName "1.1"    // el que ve la gente
```

La primera versión salió como `1.0` con `versionCode 3`, porque Play ya daba por usados el 1 y el 2: un código
subido no se puede repetir. La siguiente es la `1.1`, con `versionCode 4`. Antes de compilar otra, mirar en
`build.gradle` el último y sumar uno.

### 2.3 Compilar la web para Android y sincronizar

```bash
cd app
npm run android       # tsc + vite build --mode android + cap sync android
```

### 2.4 Generar el bundle firmado

En Git Bash:

```bash
cd app/android
export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21.0.13.10002-hotspot"
export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"
./gradlew bundleRelease
```

Resultado:

```
app/android/app/build/outputs/bundle/release/app-release.aab
```

### 2.5 Comprobar la firma

```bash
"$JAVA_HOME/bin/jarsigner" -verify app/build/outputs/bundle/release/app-release.aab
# → jar verified.
"$JAVA_HOME/bin/keytool" -printcert -jarfile app/build/outputs/bundle/release/app-release.aab
# → Propietario: CN=Hilemos, O=Hilemos, C=ES
#   SHA1: BF:B3:E7:B3:…:B9:88   (la clave de subida)
```

Si sale firmado con `CN=Android Debug`, falta `keystore.properties` o está mal: Play lo rechazará.

---

## 3. Crear la app en Play Console

Play Console → **Crear aplicación**:

| Campo | Valor |
| --- | --- |
| Nombre de la aplicación | Hilemos |
| Idioma predeterminado | Español (España) – es-ES |
| Aplicación o juego | Aplicación |
| Gratis o de pago | **Gratis** (premium irá con compras dentro de la app; una app gratis no puede pasar a ser de pago) |
| Declaraciones | Marcar las dos (políticas y leyes de exportación de EE. UU.) |

**Nombre del paquete: `app.hilemos`.** Es el `applicationId` de `build.gradle` y el `appId` de
`capacitor.config.ts`. Queda fijado para siempre con la primera subida.

---

## 4. Configurar la app (formularios obligatorios)

Panel de la app → **Configura tu aplicación**. Cada apartado se guarda por separado.

### 4.1 Política de privacidad
`https://hilemos.web.app/#/privacidad`

### 4.2 Acceso a la aplicación
«Todas las funciones están disponibles sin restricciones de acceso especiales»: se puede entrar sin cuenta, solo con
un nombre.

### 4.3 Anuncios
No contiene anuncios.

### 4.4 Clasificación de contenido
Cuestionario de IARC: correo `hilemos.app@gmail.com`; categoría de comunicación / redes sociales. Los usuarios **sí**
interactúan y comparten contenido entre ellos (chat). No comparte ubicación. Sin compras digitales (por ahora).

### 4.5 Público objetivo
16-17 y 18 o más. No dirigida a menores de 13.

### 4.6 Aplicaciones de noticias, salud, gubernamentales
No a todo.

### 4.7 Funciones financieras
«Mi aplicación no ofrece funciones financieras». Cobrar premium con Google Play Billing no cuenta como función
financiera.

### 4.8 Contenido generado por IA
La app no tiene funciones de IA ni genera contenido con IA: no hay nada que etiquetar.

### 4.9 Seguridad de los datos

Preguntas generales:

| Pregunta | Respuesta |
| --- | --- |
| ¿Recoge o comparte datos? | Sí |
| ¿Cifrados en tránsito? | Sí |
| Métodos para crear la cuenta | OAuth (Google) y «Nombre de usuario y otra autenticación» (enlace al correo y clave de acceso) |
| Enlace para eliminar la cuenta | `https://hilemos.web.app/#/privacidad` |
| ¿Se pueden borrar datos sin eliminar la cuenta? | Sí (salir de votaciones, borrar las propias, quitar la foto, desactivar avisos; lo demás por correo) |

Tipos de datos que se marcan (lo demás, nada; el **calendario no**: la app no lee el del móvil):

| Categoría → tipo | ¿Obligatorio u opcional? | Para qué |
| --- | --- | --- |
| Información personal → Nombre | Necesaria | Funcionalidad de la aplicación, Gestión de cuentas |
| Información personal → Dirección de correo electrónico | Los usuarios pueden elegir | Funcionalidad de la aplicación, Gestión de cuentas |
| Información personal → IDs de usuario | Necesaria | Funcionalidad, Gestión de cuentas, Prevención de fraudes, seguridad y cumplimiento |
| Mensajes → Otros mensajes en la aplicación | Los usuarios pueden elegir | Funcionalidad, Prevención de fraudes, seguridad y cumplimiento |
| Fotos y vídeos → Fotos | Los usuarios pueden elegir | Funcionalidad, Gestión de cuentas |
| Actividad en la aplicación → Interacciones con la aplicación | Necesaria | Funcionalidad, Analíticas |
| Actividad en la aplicación → Otro contenido generado por el usuario | Necesaria | Funcionalidad, Analíticas |
| Dispositivo u otros identificadores | Los usuarios pueden elegir (solo si activa los avisos) | Funcionalidad de la aplicación |

En **cada** tipo: «Se recogen» marcado, «Se comparten» sin marcar (Firebase trata los datos por encargo: no cuenta
como compartir) y «No, estos datos no se procesan de forma temporal». Nunca «Publicidad», «Personalización» ni
«Comunicaciones del desarrollador».

Al terminar: **Siguiente** → la vista previa debe decir «No se comparten datos con terceros» → **Guardar**.

---

## 5. Ficha de la tienda

**Aumentar usuarios → Presencia en Play Store → Fichas de Play Store → ficha principal** (o predeterminada); ver 5.1 si no
aparece. Todo está en `docs/ficha-google-play/`
(textos en `textos.md`, con el tono desenfadado de la app).

| Campo | Qué poner |
| --- | --- |
| Nombre | Hilemos |
| Descripción breve (80) | La de `textos.md` |
| Descripción completa (4.000) | La de `textos.md`: cada párrafo en una línea, se pega tal cual |
| Icono | `icono-512.png` (512 × 512, PNG de 32 bits) |
| Gráfico de funciones | `imagen-destacada-1024x500.png` |
| Capturas del teléfono | `v2/1-votacion.png` … `v2/7-mis-votaciones.png`, en ese orden (1080 × 2160) |
| Tableta y vídeo | Vacíos (opcionales) |

Otros ajustes de la ficha:

- **Categoría:** Productividad. **Etiqueta:** Calendario (la única que ofrece).
- **Idiomas:** solo Español (España). Si aparecen otros idiomas con errores, se quitan en «Gestionar
  traducciones»: cada idioma exige su propio nombre y descripciones.
- **Datos de contacto:** `hilemos.app@gmail.com`, web `https://hilemos.web.app`.

Las capturas y la imagen destacada se rehacen con datos de ejemplo con
`.claude/skills/probar-en-navegador/scripts/ficha.mjs` (ver la skill `probar-en-navegador`).

### 5.1 Cambiar la ficha más adelante (también durante la prueba)

La descripción, las capturas y el resto de la ficha **no están en el código de la app**: se cambian en Play Console.
No hace falta compilar ni subir otro `.aab`, y `textos.md` es solo la copia: editarlo no cambia nada en la tienda.

1. Entrar en la app **Hilemos** (en la lista de todas las aplicaciones el menú es otro).
2. Menú izquierdo → **Aumentar usuarios** (o «Aumenta la cantidad de usuarios»; antes, «Crecimiento») → **Presencia en
   Play Store** → **Fichas de Play Store** → ficha principal o predeterminada → flecha o lápiz.
3. Cambiar los textos (breve: 80 caracteres; completa: 4.000) y **Guardar**.
4. **Resumen de la publicación** (o «Vista general de la publicación») → enviar los cambios a revisión si salen como
   pendientes. No se ven hasta que Google los aprueba.
5. Copiar el texto nuevo a `textos.md`.

Si no aparece el menú: escribir «ficha» en el buscador de arriba, usar un ordenador o abrir el menú con **☰**. No hay
que tocar la versión de la prueba ni a los testers.

---

## 6. Prueba cerrada: países y testers

**Prueba y publica (cohete) → Pruebas → Prueba cerrada → canal «Alpha» → Gestionar segmento.**

### 6.1 Países/Territorios
España y los países donde vivan los testers. Un tester en un país no marcado no puede instalarla. Es independiente de
los países de producción.

### 6.2 Grupo de Google para los testers (para no apuntar correos a mano)

1. `groups.google.com` → **Crear grupo**, con la cuenta `hilemos.app@gmail.com`.
2. Nombre: **hilemos-testers** → dirección `hilemos-testers@googlegroups.com`.
3. Privacidad:
   - Quién puede unirse: **cualquiera en la web**.
   - Quién puede ver los miembros: **solo propietarios y administradores** (que no se vean los correos).
   - Quién puede publicar: **solo propietarios y administradores** (sin spam).
4. Descripción:
   > ¡Hola! Somos el grupo de pruebas de Hilemos, la app para quedar sin liarse con mil mensajes. Únete, apúntate a la
   > prueba con el enlace, instala la app desde Google Play y no la borres en 14 días. Úsala con tu gente y cuéntanos
   > qué te parece o qué falla en hilemos.app@gmail.com. ¡Gracias! 🙌

### 6.3 Pestaña «Testers»
- Opción **Grupos de Google** → escribir `hilemos-testers@googlegroups.com`.
- Correo para comentarios: `hilemos.app@gmail.com`.
- **Guardar**.

---

## 7. Crear la versión y subir el `.aab`

En el mismo canal: pestaña **Versiones** → **Crear nueva versión**.

1. **Firma de apps de Google Play:** aceptar que Google genere y guarde la clave de firma (solo la primera vez).
   Google vuelve a firmar la app con sus claves; la tuya (la de subida) solo sirve para subir.
2. **Subir** `app/android/app/build/outputs/bundle/release/app-release.aab`.
3. Nombre de la versión: `1 (1.0)`.
4. Notas de la versión (es-ES): «Primera versión de prueba de Hilemos».
5. **Siguiente** → revisar avisos (los «advertencias» no bloquean; los «errores» sí) → **Guardar y publicar**
   (o «Iniciar lanzamiento en Prueba cerrada»).

---

## 8. Enviar a revisión

Menú izquierdo → **Resumen de la publicación**.

- Con **publicación gestionada desactivada** (como está), los cambios se envían y, al aprobarse, se publican solos.
- Si hay cambios listos, pulsar **Enviar cambios a revisión**.
- La primera revisión tardó **menos de un día** (24 → 25 de noviembre de 2026). Puede ir de unas horas a varios días.
- Cuando acaba, el resumen dice «Última publicación el …» y no queda nada pendiente.

---

## 9. Huellas de la firma en Firebase (imprescindible)

Se puede hacer en cuanto está subido el primer `.aab`, mientras Google revisa. Como Google firma la app con **sus**
claves, Firebase tiene que conocerlas. Si no:
- «Entrar con Google» **falla** en la app descargada de la tienda;
- los enlaces de `hilemos.web.app` se abren en el navegador en vez de en la app;
- App Check no reconoce la app.

### 9.1 Dónde están
Play Console → **escudo «Protegida con Play»** → fila **«Protección de Play Store»** (desplegar con ⌄) →
**Firma de apps de Play** → «Certificado de la clave de firma de la aplicación». Con la firma preparada para la era
cuántica hay **varias**: «Clave clásica», «Clave criptográfica poscuántica» y, en «Copiar todas las huellas
digitales», una tercera. Se copian **todas**, SHA-1 y SHA-256. También las de la **clave de subida**.

Las huellas **no son secretas** (cualquiera las saca de la app instalada). Lo secreto es el `.jks`, sus contraseñas y
`keystore.properties`.

### 9.2 Añadirlas a la app de Android de Firebase
Consola de Firebase → ⚙️ Configuración del proyecto → General → «Tus apps» → `app.hilemos` → **Añadir huella digital**,
una a una. O desde la terminal (en minúsculas y sin `:`):

```bash
firebase apps:android:sha:create 1:1092387940683:android:5b56f82b080e66f632a0ce <huella> --project votaciones-9bc95
firebase apps:android:sha:list   1:1092387940683:android:5b56f82b080e66f632a0ce --project votaciones-9bc95
```

### 9.3 Enlaces que abren la app (`assetlinks.json`)
Firebase Hosting genera solo `/.well-known/assetlinks.json`, **pero no se actualizó al añadir las huellas**. Por eso
se publica a mano: `app/public/.well-known/assetlinks.json` con todas las SHA-256 (Play, subida y depuración), y
`app/firebase.json` ya no ignora las carpetas que empiezan por punto. Después de cambiarlo: `npm run deploy` en `app/`.

Comprobar que Google lo ve:

```bash
curl "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://hilemos.web.app&relation=delegate_permission/common.handle_all_urls"
```

No hace falta generar otro `.aab` ni descargar otro `google-services.json`.

---

## 10. App Check: registrar las apps y empezar a medir

Con las huellas ya en Firebase, se registran las dos apps. En esta fase **solo se mide**: no se rechaza nada. Qué es
App Check y cómo está hecho, en el apartado 18. El código ya va en el primer `.aab`.

### 10.1 Android (Play Integrity)
1. Play Console → escudo **«Protegida con Play»** → fila **«API Play Integrity»** → **Empezar** → **vincular el
   proyecto de Google Cloud** `votaciones-9bc95` (número `1092387940683`). No hace falta nada más ahí.
2. Consola de Firebase → **App Check** (menú «Compilación» o «Seguridad», o en los accesos directos) → pestaña
   **Apps** → `app.hilemos` → **Play Integrity**.
3. Las casillas **«Huella digital del certificado SHA-256» salen ya rellenas** con las que se añadieron en el
   apartado 9. **No hay que cambiarlas, borrarlas ni añadir otras**: se comprueban contra la tabla del apartado 20 (son cinco:
   las tres de Google Play, la de subida y la de depuración). Si salieran vacías, se pegan las SHA-256 de esa tabla.
4. Dejar las demás opciones como están, aceptar las condiciones si las pide y **Guardar**. Esto también activa la API
   de App Check en el proyecto.
5. En la pestaña **Apps**, `app.hilemos` tiene que salir como **«Registrada»** con Play Integrity. La app web seguirá
   con el botón **Registrar**: es el paso siguiente.

### 10.2 Web: crear la clave de reCAPTCHA Enterprise
1. [reCAPTCHA en Google Cloud](https://console.cloud.google.com/security/recaptcha?project=votaciones-9bc95), con el
   proyecto `votaciones-9bc95` seleccionado. Si pide activar la API, activarla.
2. **Crear clave** → tipo **Web** («Sitio web»), nombre `Hilemos web`.
3. Dominios: **solo `hilemos.web.app`**, sin `https://`. **`localhost` no se añade**: en local la app usa el proveedor
   de depuración (apartado 18.3), y darlo de alta dejaría conseguir justificantes válidos desde fuera de la web.
4. **Sin desafío de casilla** (clave de puntuación).
5. Crear y copiar el **ID de la clave** (la «clave del sitio»).

### 10.3 Web: registrarla en Firebase
Firebase → App Check → **Apps** → fila **«App web»** → **Registrar** → **reCAPTCHA Enterprise** (no «reCAPTCHA v3»:
el código usa Enterprise) → pegar el ID de la clave → dejar los demás valores → **Guardar**.

### 10.4 Web: poner la clave en el código y publicar
1. El ID de la clave (es público) va en `appCheckSiteKey`, en `app/src/lib/config.ts`.
2. `npm test` y `npm run deploy` en `app/`. No hace falta otro `.aab`.

Hasta este paso la web no manda justificante, aunque Firebase la dé por registrada.

### 10.5 Comprobar
- En **Apps**, las dos salen como **«Registrada»**.
- Al abrir `https://hilemos.web.app`, la petición `exchangeRecaptchaEnterpriseToken` (pestaña Red del navegador)
  responde **200**.
- **No pulsar «Exigir» todavía** (apartado 15).

*Hecho el 25 de noviembre de 2026: las dos registradas y la web publicada con la clave.*

---

## 11. Tras la aprobación: los enlaces para los testers

Prueba cerrada → Alpha → pestaña **Testers** → abajo, **«Cómo se unen los testers a la prueba»**:

| Enlace | Para qué |
| --- | --- |
| **Unirse en la Web** → Copiar enlace | El que se manda a la gente: se abre en cualquier navegador, aceptan la prueba y de ahí van a Google Play. |
| **Unirse en Android** → Copiar enlace | Abre Google Play directamente en el móvil. |

Antes de la aprobación estos enlaces no aparecen (o no funcionan).

**iPhone:** «Unirse en la Web» no hace que funcione en iPhone; la app es solo de Android. En iPhone se usa
`https://hilemos.web.app` en Safari (y «Añadir a pantalla de inicio» para tenerla como app). No cuentan para los 12.

---

## 12. Comprobarlo antes de invitar a nadie

1. **Desinstalar** del móvil cualquier versión de depuración (firmada con otra clave: Play no instala encima).
2. Unirse al grupo `hilemos-testers` con la cuenta de Google del móvil.
3. Abrir «Unirse en la Web», aceptar e **instalar desde Google Play**.
4. **Entrar con Google** → tiene que funcionar (si falla justo después de añadir huellas, esperar unos minutos).
5. Desde WhatsApp, abrir un enlace `https://hilemos.web.app/#/v/…` → tiene que abrir **la app** (si abre el
   navegador, reinstalar: Android comprueba los enlaces al instalar).
6. Crear una votación, votar desde otra cuenta y comprobar que llega el aviso push.

---

## 13. Invitar a los testers

**Requisito de Google:** al menos **12 testers apuntados durante 14 días seguidos**. Conviene invitar a 15-20 por si
alguien se sale. Solo cuentan los que **aceptan la prueba** (no basta con estar en el grupo) y conviene que la usen:
Google puede denegar producción si no ve actividad. Todos con Android.

Orden para cada tester: **1) unirse al grupo → 2) abrir el enlace de la prueba → 3) instalar desde Google Play**, con
la misma cuenta de Google. Si abren el enlace antes de unirse al grupo, les dice que no tienen acceso.

Mensaje para WhatsApp (en WhatsApp, `*texto*` sale en negrita). Antes de enviarlo, comprobar el enlace del paso 2 con
el de **«Unirse en la Web»** (apartado 11) y que el del grupo deja unirse desde otra cuenta:

```text
¡Hola! 👋 Estoy a punto de sacar *Hilemos*, una app para quedar sin liarse con mil mensajes. 🎉

Creas una votación (qué día quedamos, dónde cenamos, qué regalamos…), la pasas al grupo y cada uno marca lo que le viene bien. Así se ve rápido qué gana. También tiene un chat para rematar los detalles.

*¿Qué necesito?* 🙏
Antes de publicarla, Google me pide que al menos 12 personas estén apuntadas a la prueba durante 14 días seguidos. ¿Me echas una mano? Necesitas un móvil Android.

*Son 3 pasos, en este orden:*

1️⃣ Únete al grupo de pruebas:
https://groups.google.com/g/hilemos-testers

2️⃣ Apúntate a la prueba:
https://play.google.com/apps/testing/app.hilemos

3️⃣ Instala la app desde Google Play.

⚠️ *Importante:*
• Usa siempre la misma cuenta de Google, la que tienes en Google Play.
• En esos 14 días, no te salgas de la prueba ni del grupo, y no borres la app.
• Ábrela de vez en cuando y úsala para algún plan de verdad.

Si algo falla, no se entiende o echas algo de menos, ¡cuéntamelo! 💬

¡Mil gracias! 🙌

🍏 *¿Tienes iPhone?* No cuentas para la prueba, pero puedes usar Hilemos como una aplicación:
1. Abre https://hilemos.web.app en Safari.
2. Pulsa el botón de compartir (el cuadrado con la flecha hacia arriba).
3. Elige «Añadir a pantalla de inicio» y pulsa «Añadir».

Te saldrá el icono de Hilemos junto a tus otras apps. 📲
```

Según la versión de iOS, el botón de compartir puede estar dentro del menú **⋯**, y puede que haya que bajar en la
lista para encontrar «Añadir a pantalla de inicio».

---

## 14. Durante los 14 días

- Comprobar cuántos testers hay **apuntados**: que no bajen de 12.
- Mirar cada pocos días **Android vitals** y las opiniones, y arreglar lo urgente.
- Mirar las métricas de App Check (abajo).
- La ficha se puede cambiar en cualquier momento (apartado 5.1).
- Se pueden subir versiones nuevas al canal cerrado (apartado 17). Según lo que se sabe, **no reinicia** el plazo
  (comprobarlo en Play Console).

**Medir App Check (una semana como mínimo):** Firebase → App Check → pestaña **APIs** → **Cloud Firestore** (y
Authentication). Muestra las peticiones de los últimos días: **verificadas**, **no verificadas: clientes obsoletos**
(versiones sin App Check), **no verificadas: origen desconocido** (scripts) y **no válidas**. Lo deseable es que casi
todo sea «verificadas».

---

## 15. Exigir App Check (tras una semana midiendo)

Solo cuando se cumplan las dos cosas:
- Android **y** web están registrados y la web publicada con la clave (si se exige sin la web, **la web deja de
  funcionar**);
- las peticiones verificadas son prácticamente todas durante **al menos una semana**.

Entonces: App Check → APIs → **Cloud Firestore → Exigir**. Authentication, de momento, no. Se puede **desactivar en
cualquier momento** con el mismo botón si algo falla.

Las Cloud Functions no se ven afectadas: escriben con permisos de servidor.

---

## 16. Pedir el acceso a producción

Con **14 días seguidos y al menos 12 testers apuntados**, pedir el **acceso a producción** desde el panel de la app.
Antes, repasar que no queda ningún fallo que cierre la app o pierda datos (`docs/plan-hasta-premium.md`, fase 2).

---

## 17. Versiones siguientes

1. Subir `versionCode` (y `versionName`) en `app/android/app/build.gradle`.
2. Apartados 2.3 a 2.5 (compilar, `bundleRelease`, comprobar la firma).
3. Prueba cerrada → Alpha → **Crear nueva versión** → subir el `.aab` → notas → guardar y publicar.
4. Resumen de la publicación → enviar a revisión.
5. Si la versión anterior deja de funcionar con algún cambio del servidor, poner en Firestore `config/app.minBuild` con
   el nuevo `versionCode`: las versiones anteriores muestran «Actualizar en Google Play».
6. Para avisar de algo a todos sin publicar versión: `config/app.notice` = `{ id, text, url? }`.

Las huellas no cambian entre versiones (salvo que Google rote sus claves: entonces aparecen en «Claves de firma
anteriores» y hay que añadir las nuevas).

---

## 18. App Check, en detalle (consulta)

### 18.1 Qué es y por qué
La configuración de Firebase de la web es pública (está en el código de la página). Con ella, cualquiera podría
escribir un programa que lea y escriba en la base de datos saltándose la app: las reglas impiden ver lo que no es
suyo, pero no impiden crear miles de cuentas y votaciones, y la factura la paga Hilemos.

**App Check** hace que cada petición a Firebase lleve un **justificante** de que viene de la app de verdad:
- **Android → Play Integrity:** Google Play certifica que es la app de la tienda, sin modificar, en un dispositivo
  real.
- **Web → reCAPTCHA Enterprise:** invisible; nadie tiene que marcar casillas.

### 18.2 Cómo está en Hilemos
- `app/src/lib/appCheck.ts` lo activa antes de Firestore y Auth. En Android usa el plugin nativo
  `@capacitor-firebase/app-check` (Play Integrity) y le pasa el token al SDK web con un `CustomProvider`.
- **El código ya va en el primer `.aab`.** Mientras no se registre en la consola, el token falla y la app funciona
  igual (comprobado en un móvil real el 24 de noviembre).
- En la web solo se activa si `appCheckSiteKey` (en `app/src/lib/config.ts`) tiene una clave. La tiene desde el
  25 de noviembre de 2026.
- Los pasos, en orden: registrar y medir (apartado 10), mirar las métricas (14) y exigir (15).

### 18.3 Desarrollo y pruebas
Las versiones de depuración (adb, Android Studio) y `localhost` no pasan Play Integrity ni reCAPTCHA. Con
`localStorage["hilemos-appcheck-debug"] = "1"` (en `localhost`, siempre) se usa el **proveedor de depuración**: el
token sale en logcat o en la consola del navegador y se da de alta en **App Check → Apps → ⋮ → Gestionar tokens de
depuración**. El modo demo (`?demo`) no usa Firebase: las pruebas automáticas no lo necesitan.

### 18.4 Coste
Play Integrity y reCAPTCHA Enterprise tienen cupo gratuito; a la escala de Hilemos no deberían costar nada.
Comprobar los cupos actuales en sus páginas de precios antes de crecer.

---

## 19. Problemas frecuentes

| Problema | Causa y solución |
| --- | --- |
| «Algunos idiomas tienen errores» en la ficha | Hay idiomas añadidos sin rellenar. Dejar solo es-ES en «Gestionar traducciones». |
| El `.aab` sale con `CN=Android Debug` | Falta o está mal `app/android/keystore.properties`. |
| «SDK location not found» al compilar | Falta `ANDROID_HOME` (apartado 2.4). |
| Gradle falla con Java 25 | Usar el JDK 21 (apartado 2.4). |
| «Entrar con Google» falla en la app de la tienda | Faltan las huellas de la firma de Google en Firebase (apartado 9). |
| Los enlaces abren el navegador | `assetlinks.json` sin la SHA-256 de Google, o la app se instaló antes de publicarlo: reinstalar. |
| «No tienes acceso» al abrir el enlace de la prueba | No está en el grupo, o con otra cuenta de Google, o su país no está marcado. |
| No sale «Copiar enlace» | La versión aún no está aprobada y publicada (apartado 8). |
| Play no deja instalar sobre la versión de depuración | Firmas distintas: desinstalar la de depuración. |
| Al subir: «El código de versión ya se ha usado» | Subir `versionCode` (apartado 17). |
| No aparece «Crecimiento» en el menú | Cambió de nombre: ahora es «Aumentar usuarios» (apartado 5.1). |
| La web no consigue el justificante de App Check (400 o 403) | La clave no está registrada en Firebase, no es la de `config.ts` o no tiene el dominio `hilemos.web.app` (apartado 10). |

---

## 20. Datos de referencia

| Dato | Valor |
| --- | --- |
| Paquete | `app.hilemos` |
| Proyecto de Firebase / Google Cloud | `votaciones-9bc95` (número `1092387940683`) |
| App de Android en Firebase | `1:1092387940683:android:5b56f82b080e66f632a0ce` |
| Canal de prueba | Prueba cerrada – Alpha |
| Grupo de testers | `hilemos-testers@googlegroups.com` (https://groups.google.com/g/hilemos-testers) |
| Clave de reCAPTCHA Enterprise (web, pública) | `6LcSWTIuAAAAAJ3q3bZqk4pHXhRSotZCQN6jq4NH` |
| Primera versión | `versionCode 3`, `1.0`, enviada el 24/11/2026, publicada en prueba cerrada el 25/11/2026 |

Huellas registradas en Firebase (públicas):

| Certificado | SHA-1 | SHA-256 |
| --- | --- | --- |
| Google Play, clave clásica | `B0:A9:B6:BB:F3:E7:12:FD:63:AD:37:74:84:9B:EF:9E:92:DD:6E:A5` | `03:C8:28:5D:27:AE:18:49:CB:7E:8A:03:38:CF:2D:A2:43:6D:E0:5B:22:14:40:75:1E:F5:8B:C5:8F:34:A8:91` |
| Google Play, clave poscuántica | `03:CC:A9:2A:74:60:7E:2D:CF:58:87:58:A4:29:79:A4:F9:79:09:4C` | `EF:33:38:E1:DA:E7:08:42:93:77:85:9D:FB:D6:56:E2:90:64:53:CD:43:B6:0E:EC:75:21:7E:DF:93:13:46:1C` |
| Google Play, tercera («Copiar todas») | `6A:22:FC:24:27:25:1E:3B:B7:11:A6:99:98:48:FD:61:94:2E:78:F1` | `1B:66:39:D3:1F:FF:12:96:8D:2A:71:59:19:22:2C:E8:7E:C8:9E:58:64:1E:63:78:CD:00:71:D3:4C:FD:02:B1` |
| Clave de subida (`hilemos-upload`) | `BF:B3:E7:B3:B2:64:0F:E4:49:A0:8D:30:43:F9:4F:F4:8D:8E:B9:88` | `3F:6F:27:A8:26:1B:93:44:E8:85:F7:4A:10:72:92:F9:F2:C1:20:E5:5E:6D:22:6D:D6:D1:A4:A4:CF:22:4E:02` |
| Depuración (este ordenador) | `59:69:35:7B:93:D4:1D:FE:0B:DA:71:A0:C6:DC:BC:53:B6:F4:D6:96` | `08:B9:2D:90:D2:43:6F:77:10:78:C8:0B:0E:02:C3:B9:39:DC:03:5D:FE:22:44:36:F1:E6:0A:E8:22:90:54:98` |
