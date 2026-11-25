# Publicar Hilemos en Google Play: de la versión al enlace de la prueba cerrada

Guía paso a paso de todo el proceso, tal como se hizo la primera vez (24 y 25 de noviembre de 2026): generar el
`.aab`, crear la app en Play Console, rellenar todos los formularios, montar la prueba cerrada con un grupo de
Google, pasar la revisión, conseguir los enlaces para los testers y dejar Firebase preparado para que la app de la
tienda funcione. Al final, App Check y lo que hay que hacer en cada versión nueva.

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
9. Tras la aprobación: los enlaces para los testers
10. Huellas de la firma en Firebase (imprescindible)
11. Comprobarlo antes de invitar a nadie
12. Invitar a los testers y los 14 días
13. Versiones siguientes
14. App Check, en detalle
15. Problemas frecuentes
16. Datos de referencia

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
versionCode 1        // entero; cada subida a Play tiene que ser mayor que la anterior
versionName "1.0"    // el que ve la gente
```

La primera subida fue `versionCode 1`, `versionName "1.0"`. Para la siguiente: `2` y `"1.1"` (o lo que toque).

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

**Crecimiento → Presencia en Google Play → Ficha principal.** Todo está en `docs/ficha-google-play/`
(textos en `textos.md`, con el tono desenfadado de la app).

| Campo | Qué poner |
| --- | --- |
| Nombre | Hilemos |
| Descripción breve (80) | La de `textos.md` |
| Descripción completa (4.000) | La de `textos.md`: cada párrafo en una línea, se pega tal cual |
| Icono | `icono-512.png` (512 × 512, PNG de 32 bits) |
| Gráfico de funciones | `imagen-destacada-1024x500.png` |
| Capturas del teléfono | `1-votacion.png` … `7-mis-votaciones.png`, en ese orden (1080 × 2160) |
| Tableta y vídeo | Vacíos (opcionales) |

Otros ajustes de la ficha:

- **Categoría:** Productividad. **Etiqueta:** Calendario (la única que ofrece).
- **Idiomas:** solo Español (España). Si aparecen otros idiomas con errores, se quitan en «Gestionar
  traducciones»: cada idioma exige su propio nombre y descripciones.
- **Datos de contacto:** `hilemos.app@gmail.com`, web `https://hilemos.web.app`.

Las capturas y la imagen destacada se rehacen con datos de ejemplo con
`.claude/skills/probar-en-navegador/scripts/ficha.mjs` (ver la skill `probar-en-navegador`).

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

## 9. Tras la aprobación: los enlaces para los testers

Prueba cerrada → Alpha → pestaña **Testers** → abajo, **«Cómo se unen los testers a la prueba»**:

| Enlace | Para qué |
| --- | --- |
| **Unirse en la Web** → Copiar enlace | El que se manda a la gente: se abre en cualquier navegador, aceptan la prueba y de ahí van a Google Play. |
| **Unirse en Android** → Copiar enlace | Abre Google Play directamente en el móvil. |

Antes de la aprobación estos enlaces no aparecen (o no funcionan).

**iPhone:** «Unirse en la Web» no hace que funcione en iPhone; la app es solo de Android. En iPhone se usa
`https://hilemos.web.app` en Safari (y «Añadir a pantalla de inicio» para tenerla como app). No cuentan para los 12.

---

## 10. Huellas de la firma en Firebase (imprescindible)

Como Google firma la app con **sus** claves, Firebase tiene que conocerlas. Si no:
- «Entrar con Google» **falla** en la app descargada de la tienda;
- los enlaces de `hilemos.web.app` se abren en el navegador en vez de en la app;
- App Check no reconoce la app.

### 10.1 Dónde están
Play Console → **escudo «Protegida con Play»** → fila **«Protección de Play Store»** (desplegar con ⌄) →
**Firma de apps de Play** → «Certificado de la clave de firma de la aplicación». Con la firma preparada para la era
cuántica hay **varias**: «Clave clásica», «Clave criptográfica poscuántica» y, en «Copiar todas las huellas
digitales», una tercera. Se copian **todas**, SHA-1 y SHA-256. También las de la **clave de subida**.

Las huellas **no son secretas** (cualquiera las saca de la app instalada). Lo secreto es el `.jks`, sus contraseñas y
`keystore.properties`.

### 10.2 Añadirlas a la app de Android de Firebase
Consola de Firebase → ⚙️ Configuración del proyecto → General → «Tus apps» → `app.hilemos` → **Añadir huella digital**,
una a una. O desde la terminal (en minúsculas y sin `:`):

```bash
firebase apps:android:sha:create 1:1092387940683:android:5b56f82b080e66f632a0ce <huella> --project votaciones-9bc95
firebase apps:android:sha:list   1:1092387940683:android:5b56f82b080e66f632a0ce --project votaciones-9bc95
```

### 10.3 Enlaces que abren la app (`assetlinks.json`)
Firebase Hosting genera solo `/.well-known/assetlinks.json`, **pero no se actualizó al añadir las huellas**. Por eso
se publica a mano: `app/public/.well-known/assetlinks.json` con todas las SHA-256 (Play, subida y depuración), y
`app/firebase.json` ya no ignora las carpetas que empiezan por punto. Después de cambiarlo: `npm run deploy` en `app/`.

Comprobar que Google lo ve:

```bash
curl "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://hilemos.web.app&relation=delegate_permission/common.handle_all_urls"
```

No hace falta generar otro `.aab` ni descargar otro `google-services.json`.

---

## 11. Comprobarlo antes de invitar a nadie

1. **Desinstalar** del móvil cualquier versión de depuración (firmada con otra clave: Play no instala encima).
2. Unirse al grupo `hilemos-testers` con la cuenta de Google del móvil.
3. Abrir «Unirse en la Web», aceptar e **instalar desde Google Play**.
4. **Entrar con Google** → tiene que funcionar (si falla justo después de añadir huellas, esperar unos minutos).
5. Desde WhatsApp, abrir un enlace `https://hilemos.web.app/#/v/…` → tiene que abrir **la app** (si abre el
   navegador, reinstalar: Android comprueba los enlaces al instalar).
6. Crear una votación, votar desde otra cuenta y comprobar que llega el aviso push.

---

## 12. Invitar a los testers y los 14 días

**Requisito de Google:** al menos **12 testers apuntados durante 14 días seguidos**. Conviene invitar a 15-20 por si
alguien se sale. Solo cuentan los que **aceptan la prueba** (no basta con estar en el grupo) y conviene que la usen:
Google puede denegar producción si no ve actividad. Todos con Android.

Orden para cada tester: **1) unirse al grupo → 2) abrir el enlace de la prueba → 3) instalar desde Google Play**, con
la misma cuenta de Google. Si abren el enlace antes de unirse al grupo, les dice que no tienen acceso.

Mensaje para WhatsApp (cambiar los dos enlaces):

> ¡Hola! 👋 Estoy a punto de sacar **Hilemos**, una app para quedar con tu gente sin liarse con mil mensajes: se
> propone el plan, cada uno vota y listo. 🎉
>
> Antes de publicarla, Google me pide que la prueben al menos 12 personas durante 14 días. ¿Me echas una mano? Son
> 3 pasos:
>
> 1️⃣ Únete al grupo de pruebas: https://groups.google.com/g/hilemos-testers
> 2️⃣ Apúntate a la prueba: [enlace «Unirse en la Web»]
> 3️⃣ Instálala desde Google Play.
>
> ⚠️ Usa siempre la misma cuenta de Google, la que tienes en Google Play. Y no la borres en 14 días.
>
> Úsala para tu próximo plan (una cena, un cumple, una escapada) y cuéntame qué te parece o qué falla. ¡Mil
> gracias! 🙌
>
> (Por ahora solo para Android. Desde iPhone se puede usar en hilemos.web.app.)

Durante los 14 días: mirar **Android vitals** y las opiniones cada pocos días. Subir una versión nueva al canal
cerrado **no reinicia** el plazo (según lo que se sabe; comprobarlo en Play Console). Al terminar: **pedir el acceso a
producción** desde el panel.

---

## 13. Versiones siguientes

1. Subir `versionCode` (y `versionName`) en `app/android/app/build.gradle`.
2. Secciones 2.3 a 2.5 (compilar, `bundleRelease`, comprobar la firma).
3. Prueba cerrada → Alpha → **Crear nueva versión** → subir el `.aab` → notas → guardar y publicar.
4. Resumen de la publicación → enviar a revisión.
5. Si la versión anterior deja de funcionar con algún cambio del servidor, poner en Firestore `config/app.minBuild` con
   el nuevo `versionCode`: las versiones anteriores muestran «Actualizar en Google Play».
6. Para avisar de algo a todos sin publicar versión: `config/app.notice` = `{ id, text, url? }`.

Las huellas no cambian entre versiones (salvo que Google rote sus claves: entonces aparecen en «Claves de firma
anteriores» y hay que añadir las nuevas).

---

## 14. App Check, en detalle

### 14.1 Qué es y por qué
La configuración de Firebase de la web es pública (está en el código de la página). Con ella, cualquiera podría
escribir un programa que lea y escriba en la base de datos saltándose la app: las reglas impiden ver lo que no es
suyo, pero no impiden crear miles de cuentas y votaciones, y la factura la paga Hilemos.

**App Check** hace que cada petición a Firebase lleve un **justificante** de que viene de la app de verdad:
- **Android → Play Integrity:** Google Play certifica que es la app de la tienda, sin modificar, en un dispositivo
  real.
- **Web → reCAPTCHA Enterprise:** invisible; nadie tiene que marcar casillas.

### 14.2 Cómo está en Hilemos
- `app/src/lib/appCheck.ts` lo activa antes de Firestore y Auth. En Android usa el plugin nativo
  `@capacitor-firebase/app-check` (Play Integrity) y le pasa el token al SDK web con un `CustomProvider`.
- **El código ya va en el primer `.aab`.** Mientras no se registre en la consola, el token falla y la app funciona
  igual (comprobado en un móvil real el 24 de noviembre).
- En la web solo se activa si `appCheckSiteKey` (en `app/src/lib/config.ts`) tiene una clave. Ahora está vacía.

### 14.3 Las dos fases
1. **Solo medir (sin exigir):** las peticiones sin justificante siguen funcionando; la consola cuenta cuántas llegan
   verificadas y cuántas no.
2. **Exigir:** las peticiones sin justificante se rechazan.

### 14.4 Pasos para activarlo

**A. Android (Play Integrity)**
1. Play Console → escudo **«Protegida con Play»** → fila **«API Play Integrity»** → **Empezar** → **vincular el
   proyecto de Google Cloud** `votaciones-9bc95` (número `1092387940683`). No hace falta nada más ahí.
2. Consola de Firebase → **App Check** (menú «Compilación» o «Seguridad») → pestaña **Apps** → `app.hilemos` →
   **Play Integrity** → pegar la **SHA-256 clásica** (`03:C8:28:5D:…:A8:91`; si deja varias, también las demás) →
   aceptar las condiciones → **Guardar**. Esto también activa la API de App Check en el proyecto.

**B. Web (reCAPTCHA Enterprise)**
1. Google Cloud Console (proyecto `votaciones-9bc95`) → **Seguridad → reCAPTCHA** → **Crear clave**:
   tipo **Sitio web**, dominios `hilemos.web.app` y `localhost`, sin casilla («Puntuación»).
2. Consola de Firebase → App Check → Apps → la app **web** → **reCAPTCHA Enterprise** → pegar la clave → Guardar.
3. Pasar la clave (es pública) para ponerla en `appCheckSiteKey` y publicar la web. No hace falta `.aab`.

**C. Medir (una semana como mínimo)**
Firebase → App Check → pestaña **APIs** → **Cloud Firestore** (y Authentication). Muestra las peticiones de los
últimos días: **verificadas**, **no verificadas: clientes obsoletos** (versiones sin App Check), **no verificadas:
origen desconocido** (scripts) y **no válidas**. Lo deseable es que casi todo sea «verificadas».

**D. Exigir**
Solo cuando:
- Android **y** web estén registrados (si se exige sin la web, **la web deja de funcionar**);
- las verificadas sean prácticamente todas durante varios días.

Entonces: App Check → APIs → **Cloud Firestore → Exigir**. Authentication, de momento, no. Se puede **desactivar
en cualquier momento** con el mismo botón si algo falla.

Las Cloud Functions no se ven afectadas: escriben con permisos de servidor.

### 14.5 Desarrollo y pruebas
Las versiones de depuración (adb, Android Studio) y `localhost` no pasan Play Integrity ni reCAPTCHA. Con
`localStorage["hilemos-appcheck-debug"] = "1"` (en `localhost`, siempre) se usa el **proveedor de depuración**: el
token sale en logcat o en la consola del navegador y se da de alta en **App Check → Apps → ⋮ → Gestionar tokens de
depuración**. El modo demo (`?demo`) no usa Firebase: las pruebas automáticas no lo necesitan.

### 14.6 Coste
Play Integrity y reCAPTCHA Enterprise tienen cupo gratuito; a la escala de Hilemos no deberían costar nada.
Comprobar los cupos actuales en sus páginas de precios antes de crecer.

---

## 15. Problemas frecuentes

| Problema | Causa y solución |
| --- | --- |
| «Algunos idiomas tienen errores» en la ficha | Hay idiomas añadidos sin rellenar. Dejar solo es-ES en «Gestionar traducciones». |
| El `.aab` sale con `CN=Android Debug` | Falta o está mal `app/android/keystore.properties`. |
| «SDK location not found» al compilar | Falta `ANDROID_HOME` (sección 2.4). |
| Gradle falla con Java 25 | Usar el JDK 21 (sección 2.4). |
| «Entrar con Google» falla en la app de la tienda | Faltan las huellas de la firma de Google en Firebase (sección 10). |
| Los enlaces abren el navegador | `assetlinks.json` sin la SHA-256 de Google, o la app se instaló antes de publicarlo: reinstalar. |
| «No tienes acceso» al abrir el enlace de la prueba | No está en el grupo, o con otra cuenta de Google, o su país no está marcado. |
| No sale «Copiar enlace» | La versión aún no está aprobada y publicada (sección 8). |
| Play no deja instalar sobre la versión de depuración | Firmas distintas: desinstalar la de depuración. |
| Al subir: «El código de versión ya se ha usado» | Subir `versionCode` (sección 13). |

---

## 16. Datos de referencia

| Dato | Valor |
| --- | --- |
| Paquete | `app.hilemos` |
| Proyecto de Firebase / Google Cloud | `votaciones-9bc95` (número `1092387940683`) |
| App de Android en Firebase | `1:1092387940683:android:5b56f82b080e66f632a0ce` |
| Canal de prueba | Prueba cerrada – Alpha |
| Grupo de testers | `hilemos-testers@googlegroups.com` |
| Primera versión | `versionCode 1`, `1.0`, enviada el 24/11/2026, publicada en prueba cerrada el 25/11/2026 |

Huellas registradas en Firebase (públicas):

| Certificado | SHA-1 | SHA-256 |
| --- | --- | --- |
| Google Play, clave clásica | `B0:A9:B6:BB:F3:E7:12:FD:63:AD:37:74:84:9B:EF:9E:92:DD:6E:A5` | `03:C8:28:5D:27:AE:18:49:CB:7E:8A:03:38:CF:2D:A2:43:6D:E0:5B:22:14:40:75:1E:F5:8B:C5:8F:34:A8:91` |
| Google Play, clave poscuántica | `03:CC:A9:2A:74:60:7E:2D:CF:58:87:58:A4:29:79:A4:F9:79:09:4C` | `EF:33:38:E1:DA:E7:08:42:93:77:85:9D:FB:D6:56:E2:90:64:53:CD:43:B6:0E:EC:75:21:7E:DF:93:13:46:1C` |
| Google Play, tercera («Copiar todas») | `6A:22:FC:24:27:25:1E:3B:B7:11:A6:99:98:48:FD:61:94:2E:78:F1` | `1B:66:39:D3:1F:FF:12:96:8D:2A:71:59:19:22:2C:E8:7E:C8:9E:58:64:1E:63:78:CD:00:71:D3:4C:FD:02:B1` |
| Clave de subida (`hilemos-upload`) | `BF:B3:E7:B3:B2:64:0F:E4:49:A0:8D:30:43:F9:4F:F4:8D:8E:B9:88` | `3F:6F:27:A8:26:1B:93:44:E8:85:F7:4A:10:72:92:F9:F2:C1:20:E5:5E:6D:22:6D:D6:D1:A4:A4:CF:22:4E:02` |
| Depuración (este ordenador) | `59:69:35:7B:93:D4:1D:FE:0B:DA:71:A0:C6:DC:BC:53:B6:F4:D6:96` | `08:B9:2D:90:D2:43:6F:77:10:78:C8:0B:0E:02:C3:B9:39:DC:03:5D:FE:22:44:36:F1:E6:0A:E8:22:90:54:98` |
