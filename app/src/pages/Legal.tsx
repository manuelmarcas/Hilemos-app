// Política de privacidad y condiciones de uso (#/privacidad y #/condiciones). Se ven con sesión (dentro de la app)
// y sin ella (enlazadas desde la entrada: App las muestra sin pedir que se entre).
//
// Si cambia lo que guarda la app (types.ts, store/), hay que revisar también «Qué datos tratamos».
import type { MouseEvent, ReactNode } from "react";
import type { LegalDoc } from "../state/route";
import { bem } from "../lib/util";
import { Icon } from "../components/Icon";
import { FREE_OPEN, FREE_PEOPLE } from "../lib/model";
import { ALWAYS_FREE, PREMIUM_INFO, TERMS_PREMIUM_ID } from "../lib/premium";

const UPDATED = "24 de noviembre de 2026";
const OWNER = "Manuel Martín Castrillo";
const CONTACT = "hilemos.app@gmail.com";
const mail = <a href={`mailto:${CONTACT}`}>{CONTACT}</a>;

// «Volver» lleva a la pantalla de antes (la entrada, el perfil…) y, si se ha abierto directamente, al inicio.
const goBack = (e: MouseEvent) => {
  if (history.length > 1) { e.preventDefault(); history.back(); }
};

function Section({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return <section className="step legal__section" id={id}><h2 className="step__title legal__title">{title}</h2>{children}</section>;
}

function Privacy() {
  return <>
    <p className="subtitle">
      Hilemos sirve para que un grupo se ponga de acuerdo en una fecha o una opción. Para eso necesita guardar
      algunos datos tuyos. Aquí te contamos cuáles, para qué y qué puedes hacer con ellos.
    </p>
    <Section title="Quién es el responsable">
      <p>El responsable del tratamiento de tus datos es <strong>{OWNER}</strong>, que desarrolla y mantiene Hilemos.</p>
      <p>Para cualquier duda sobre tus datos o para ejercer tus derechos, escribe a {mail}.</p>
    </Section>
    <Section title="Qué datos tratamos">
      <ul>
        <li>
          <strong>Tu cuenta.</strong> Si entras con Google: tu nombre, tu correo, tu foto y el identificador de tu cuenta
          de Google. Si entras con tu correo: tu correo. Si entras sin registrarte: solo el nombre que escribas; tu
          clave de acceso se guarda cifrada y nadie puede volver a verla.
        </li>
        <li><strong>Tu perfil.</strong> El nombre visible, la imagen de perfil (una versión reducida) y qué avisos quieres recibir.</li>
        <li>
          <strong>Las votaciones que creas.</strong> El título, la descripción, los días, horas u opciones, y sus
          ajustes (plazo, máximo de personas, anónima o no). En las privadas, los correos de quienes pueden entrar,
          que escribe quien la crea.
        </li>
        <li>
          <strong>Tu participación.</strong> Lo que votas, tu nombre y tu imagen (copiados en cada votación), cuándo
          entraste y, en las votaciones con aprobación, si estás pendiente, aceptado o rechazado. En las votaciones
          privadas (solo para unos correos), también con qué correo entraste, que solo ve quien la administra.
        </li>
        <li><strong>El chat.</strong> Los mensajes que escribes en cada votación, con tu nombre y la hora.</li>
        <li>
          <strong>Las denuncias.</strong> Si denuncias un mensaje del chat: una copia del mensaje y de quién lo escribió,
          tu nombre, el motivo y tu comentario, si lo escribes. Si denuncias a una persona: una copia de su nombre y su
          imagen tal como se veían, tu nombre, el motivo y tu comentario.
        </li>
        <li><strong>Tu lista.</strong> Las votaciones de tu menú, tus grupos, las que has archivado y hasta dónde has leído cada chat.</li>
        <li>
          <strong>Los avisos, si los activas.</strong> Un identificador de tu dispositivo para poder mandarte avisos y
          una descripción breve de tu navegador o tu móvil.
        </li>
        <li>
          <strong>Datos técnicos.</strong> Como cualquier servicio en internet, los servidores registran datos como la
          dirección IP para funcionar y protegerse de abusos.
        </li>
      </ul>
      <p>
        En tu dispositivo se guardan el tema elegido, una copia de tus datos para que la app abra rápido y aguante
        cortes de conexión, y lo necesario para mantener la sesión abierta. Hilemos no usa cookies de publicidad ni
        herramientas de analítica, y no vende ni cede tus datos a nadie.
      </p>
    </Section>
    <Section title="Para qué y con qué base">
      <ul>
        <li>
          <strong>Para que la app funcione</strong>: crear votaciones, votar, ver los resultados, hablar en el chat y
          guardar tu lista. Es necesario para prestarte el servicio que pides al usarla (artículo 6.1.b del RGPD).
        </li>
        <li>
          <strong>Para mandarte avisos</strong>, solo si los activas. La base es tu consentimiento (artículo 6.1.a), y
          puedes retirarlo cuando quieras desde «Tu perfil» o los ajustes de tu dispositivo.
        </li>
        <li>
          <strong>Para mantener el servicio seguro</strong> y evitar abusos. La base es el interés legítimo en que
          Hilemos funcione bien para todos (artículo 6.1.f).
        </li>
        <li>
          <strong>Correos de una votación privada</strong>: los escribe quien la crea para decidir quién puede entrar.
          Quien los escribe tiene que tener permiso de esas personas para hacerlo.
        </li>
      </ul>
    </Section>
    <Section title="Quién ve tus datos">
      <ul>
        <li>
          <strong>Las personas de cada votación</strong> ven tu nombre, tu imagen, lo que has votado (salvo en las
          votaciones anónimas) y tus mensajes del chat. Cualquiera que tenga el enlace de una votación abierta puede
          entrar en ella, así que compártelo solo con quien quieras.
        </li>
        <li>
          <strong>Quien administra una votación</strong> ve además las solicitudes para entrar y, en las privadas, la
          lista de correos permitidos y con qué correo entró cada participante, para poder quitarle el acceso. También
          ve las denuncias de los mensajes del chat y de las personas de la votación, con quién las hizo, y puede
          ocultar mensajes. La persona denunciada no ve quién la ha denunciado.
        </li>
        <li>
          <strong>Google</strong>, como proveedor técnico: Hilemos funciona sobre Firebase (inicio de sesión, base de
          datos, alojamiento de la web y envío de avisos). Google trata los datos por encargo de Hilemos y siguiendo
          sus instrucciones. Sus servidores pueden estar fuera del Espacio Económico Europeo; en ese caso, las
          transferencias se amparan en las garantías previstas por el RGPD, como las cláusulas contractuales tipo de
          la Comisión Europea.
        </li>
      </ul>
    </Section>
    <Section title="Cuánto tiempo los guardamos">
      <p>
        Tus datos se guardan mientras tengas la cuenta. Las votaciones duran hasta que quien las administra las
        elimina. Si sales de una votación o eliminas tu cuenta, tus votos y mensajes pueden quedarse en ella, pero con
        un nombre sin dueño (como «Un suspiro») y sin tu imagen, para no romper el resultado ni la conversación de
        los demás. Al eliminar la cuenta se borran tu perfil, tu lista, tus grupos y tu cuenta de inicio de sesión.
      </p>
    </Section>
    <Section title="Tus derechos">
      <p>
        Puedes acceder a tus datos, corregirlos, borrarlos, oponerte a su tratamiento, pedir que se limite y pedir
        una copia para llevártela a otro servicio. Desde la app ya puedes:
      </p>
      <ul>
        <li>cambiar tu nombre y tu imagen en «Tu perfil»;</li>
        <li>activar y desactivar los avisos;</li>
        <li>salir de cualquier votación;</li>
        <li>
          descargar una copia de tus datos (perfil, grupos, votaciones, votos, mensajes y denuncias) en «Tu perfil» →
          «Descargar mis datos», en un archivo JSON que puedes llevarte a otro servicio;
        </li>
        <li>eliminar tu cuenta en «Tu perfil» → «Eliminar mi cuenta».</li>
      </ul>
      <p>
        Para todo lo demás, escribe a {mail} desde el correo de tu cuenta o indicando tu nombre en la app. Te
        responderemos en un plazo máximo de un mes.
      </p>
      <p>
        Si crees que no se están respetando tus derechos, puedes reclamar ante la Agencia Española de Protección de
        Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">aepd.es</a>).
      </p>
    </Section>
    <Section title="Edad mínima">
      <p>
        Para usar Hilemos tienes que tener al menos 14 años. Si eres menor de esa edad, necesitas el consentimiento de
        tu madre, tu padre o tu tutor.
      </p>
    </Section>
    <Section title="Seguridad">
      <p>
        La conexión va siempre cifrada y las reglas de la base de datos impiden que nadie lea o cambie lo que no le
        corresponde: por ejemplo, tu lista y tu perfil solo los ves tú, y en las votaciones restringidas solo ven los
        votos quienes han sido aceptados.
      </p>
    </Section>
    <Section title="Cambios en esta política">
      <p>
        Si esta política cambia de forma importante, lo avisaremos en la app antes de que el cambio se aplique.
      </p>
    </Section>
  </>;
}

function Terms() {
  return <>
    <p className="subtitle">
      Estas condiciones explican cómo se puede usar Hilemos. Al usar la app las aceptas, junto con la{" "}
      <a href="#/privacidad">política de privacidad</a>.
    </p>
    <Section title="El servicio">
      <p>
        Hilemos es una app para crear votaciones de fechas, horas u opciones, compartirlas y ver los resultados. La
        ofrece <strong>{OWNER}</strong>. Hoy es gratuita. Para cualquier consulta, escribe a {mail}.
      </p>
      <p>
        Algunas funciones pasarán a ser de pago más adelante: lo explica el apartado «Premium y lanzamiento».
      </p>
    </Section>
    <Section title="Premium y lanzamiento" id={TERMS_PREMIUM_ID}>
      <p>
        Hilemos tendrá un plan gratuito y otro de pago, «premium». En la app, las funciones que serán premium llevan
        la etiqueta <strong>«Premium»</strong>. Son estas:
      </p>
      <ul>
        {Object.values(PREMIUM_INFO).map(i => <li key={i.title}><strong>{i.title}.</strong> {i.what}</li>)}
      </ul>
      <p>
        <strong>Durante el lanzamiento, todo es gratis para todos</strong>, también lo marcado como premium y sin límite
        de votaciones abiertas a la vez. Es una situación temporal: usar ahora una función premium gratis no da derecho
        a seguir usándola gratis después.
      </p>
      <p>Cuando empiece premium:</p>
      <ul>
        <li>lo avisaremos en la app con al menos 30 días de antelación;</li>
        <li>las funciones marcadas solo estarán disponibles con premium;</li>
        <li>
          empezará a contar el límite de votaciones abiertas a la vez que gestionas ({FREE_OPEN} en el plan gratuito;
          las cerradas no cuentan). Si tienes más, las que sobren se cerrarán solas 30 días después de avisarte, salvo
          que antes cierres otras o tengas premium. Lo mismo vale si heredas una votación (porque quien la gestionaba
          sale de ella) y con ella pasas del límite, pero entonces el plazo es de 7 días;
        </li>
        <li>
          las votaciones que ya tengas seguirán funcionando para quienes votan, con lo que ya tuvieran configurado,
          pero quien las gestione sin premium tendrá los límites del plan gratuito (por ejemplo, no podrá nombrar
          administradores nuevos, poner un plazo nuevo ni ampliar las plazas por encima de {FREE_PEOPLE}), y las que
          usen funciones premium se cerrarán solas 30 días después de que quien las gestiona deje de tener premium,
          avisando antes. Una votación cerrada sigue guardada con su resultado;
        </li>
        <li>
          los precios, la forma de pago, las renovaciones, las cancelaciones y las devoluciones se publicarán aquí antes
          de poder contratar nada.
        </li>
      </ul>
      <p>
        Los límites del plan gratuito (como el número de personas por votación o de votaciones abiertas a la vez)
        pueden cambiar antes de empezar a cobrar; si cambian, se publicarán aquí con el aviso. {ALWAYS_FREE}
      </p>
    </Section>
    <Section title="Tu cuenta">
      <ul>
        <li>Puedes entrar con Google, con tu correo o sin registrarte.</li>
        <li>
          Si entras sin registrarte, tu clave de acceso es la única forma de volver a tu cuenta. Guárdala bien: si la
          pierdes y cierras sesión, no se puede recuperar.
        </li>
        <li>Eres responsable de lo que se haga con tu cuenta. Puedes eliminarla cuando quieras desde «Tu perfil».</li>
      </ul>
    </Section>
    <Section title="Uso aceptable">
      <p>Al usar Hilemos te comprometes a no:</p>
      <ul>
        <li>publicar contenido ilegal, ofensivo, discriminatorio, violento o que acose a otras personas;</li>
        <li>hacerte pasar por otra persona ni usar datos de terceros sin su permiso;</li>
        <li>usar la app para mandar publicidad no deseada o engaños;</li>
        <li>intentar acceder a datos que no te corresponden, saltarte los límites de la app o sobrecargarla.</li>
      </ul>
    </Section>
    <Section title="Lo que escribes">
      <p>
        Lo que escribes (títulos, descripciones, opciones y mensajes) es tuyo y eres responsable de ello. Para que la
        app funcione, nos permites guardarlo y mostrarlo a las personas de cada votación. Cualquiera puede denunciar un
        mensaje del chat o a una persona (por su nombre, su imagen o cómo se comporta): quien administra la votación
        puede ocultar el mensaje o expulsar a esa persona, y nosotros revisamos las denuncias. Podemos retirar contenido o suspender cuentas que incumplan estas condiciones.
      </p>
    </Section>
    <Section title="Las votaciones">
      <ul>
        <li>
          Quien crea una votación y sus administradores deciden cómo se gestiona: pueden editarla, cerrarla, abrir un
          desempate o eliminarla. Al finalizar un desempate con una ganadora, el resultado es definitivo.
        </li>
        <li>
          Hilemos sirve para que un grupo se organice. No es un sistema de votación oficial: no lo uses para
          elecciones ni decisiones que exijan garantías legales.
        </li>
      </ul>
    </Section>
    <Section title="Disponibilidad y responsabilidad">
      <p>
        Hacemos lo posible para que Hilemos funcione bien y sin cortes, pero no podemos garantizar que esté siempre
        disponible ni libre de errores. Podemos cambiar, mejorar o dejar de ofrecer funciones; si un cambio te afecta
        de forma importante, lo avisaremos con antelación razonable.
      </p>
      <p>
        En la medida en que lo permita la ley, no respondemos de los daños indirectos que se deriven del uso de la
        app. Nada de lo que dicen estas condiciones limita los derechos que te reconoce la ley como consumidor.
      </p>
    </Section>
    <Section title="Ley aplicable">
      <p>
        Estas condiciones se rigen por la ley española. Si eres consumidor, para cualquier conflicto puedes acudir a
        los juzgados de tu domicilio.
      </p>
    </Section>
    <Section title="Cambios en estas condiciones">
      <p>
        Si estas condiciones cambian de forma importante, lo avisaremos en la app antes de que el cambio se aplique.
        Si no estás de acuerdo, puedes dejar de usar Hilemos y eliminar tu cuenta.
      </p>
    </Section>
  </>;
}

/** `centered`: sin el menú de la app (sin sesión), centrada en la página. */
export function Legal({ doc, centered }: { doc: LegalDoc; centered?: boolean }) {
  const privacy = doc === "privacidad";
  return (
    <div className={bem("legal", { centered })}>
      <div className="page-head legal__head">
        <a className="page-head__back" href="#/" onClick={goBack}><Icon name="back" /> Volver</a>
        <h1 className="page-head__title">{privacy ? "Política de privacidad" : "Condiciones de uso"}</h1>
        <p className="legal__date">Última actualización: {UPDATED}</p>
      </div>
      {privacy ? <Privacy /> : <Terms />}
      <p className="legal__other">
        {privacy
          ? <>Consulta también las <a href="#/condiciones">condiciones de uso</a>.</>
          : <>Consulta también la <a href="#/privacidad">política de privacidad</a>.</>}
      </p>
    </div>
  );
}

/** Las mismas páginas sin sesión: sin barra superior ni menú, con el mismo ancho de lectura. */
export function LegalStandalone({ doc }: { doc: LegalDoc }) {
  return <div id="app" className="app"><main id="view" className="app__view"><Legal doc={doc} centered /></main></div>;
}
