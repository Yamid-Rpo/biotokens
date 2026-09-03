import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terminos")({
  head: () => ({
    meta: [
      { title: "Términos de uso — Bio Tokens" },
      { name: "description", content: "Términos y condiciones de uso de la plataforma Bio Tokens para la certificación blockchain de reducción de emisiones de carbono." },
      { property: "og:title", content: "Términos de uso — Bio Tokens" },
      { property: "og:description", content: "Condiciones que rigen el uso de Bio Tokens." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TerminosPage,
});

function TerminosPage() {
  const updated = "1 de julio de 2026";
  return (
    <article className="container mx-auto max-w-3xl px-4 py-12 prose prose-neutral dark:prose-invert">
      <h1>Términos de uso</h1>
      <p className="text-sm text-muted-foreground">Última actualización: {updated}</p>
      <br />

      <p>
        Bienvenido/a a <strong>Bio Tokens</strong>, una plataforma de certificación blockchain
        para proyectos de reducción de emisiones de carbono. Al acceder o utilizar la plataforma
        aceptas estos Términos de uso. Si no estás de acuerdo, no utilices el servicio.
      </p>
      <br />

      <h2>1. Descripción del servicio</h2>
      <p>
        Bio Tokens permite crear, verificar y certificar proyectos ambientales (forestales,
        agrícolas, energía limpia, movilidad eléctrica, recuperación de agua, transformación de
        residuos y captura de CO₂), emitir tokens digitales que representan una unidad medible
        de impacto (m², kWh, kg, L) y registrarlos en redes blockchain como Stellar. Los tokens
        pueden ser intercambiados por activos digitales (XLM, USDC) según las condiciones de la
        red utilizada.
      </p>
      <br />

      <h2>2. Elegibilidad y cuenta</h2>
      <ul>
        <li>Debes ser mayor de edad en tu jurisdicción para registrarte.</li>
        <li>La información suministrada debe ser veraz, completa y actualizada.</li>
        <li>Eres responsable de la confidencialidad de tus credenciales y de toda actividad realizada bajo tu cuenta.</li>
        <li>Está prohibido crear cuentas para suplantar identidad o eludir sanciones.</li>
        <br />
      </ul>

      <h2>3. Uso aceptable</h2>
      <p>El usuario se compromete a no:</p>
      <ul>
        <li>Cargar datos ambientales falsos, duplicados o manipulados.</li>
        <li>Interferir con los sistemas de verificación, sensores IoT o algoritmos anti-manipulación.</li>
        <li>Utilizar la plataforma para actividades ilícitas, fraude, lavado de activos o financiación del terrorismo.</li>
        <li>Realizar ingeniería inversa, scraping masivo o ataques a la infraestructura.</li>
        <br />
      </ul>

      <h2>4. Emisión y validez de los certificados</h2>
      <p>
        Los certificados (Bio Tokens) se emiten únicamente cuando los registros ambientales son
        validados por los mecanismos automáticos y humanos de la plataforma. Bio Tokens no
        garantiza el valor de mercado de los tokens ni su aceptación por terceros. La trazabilidad
        se registra públicamente en la red blockchain seleccionada.
      </p>
      <br />

      <h2>5. Billetera y activos digitales</h2>
      <p>
        La conexión de billeteras Stellar se realiza mediante clave secreta procesada
        exclusivamente en el navegador del usuario; Bio Tokens no almacena claves privadas.
        El usuario es el único responsable de la custodia de sus claves. Las operaciones en
        blockchain son irreversibles.
      </p>
      <br />

      <h2>6. Propiedad intelectual</h2>
      <p>
        El software, la marca, el diseño y el contenido de la plataforma son propiedad de Bio
        Tokens o de sus licenciantes. Se concede al usuario una licencia limitada, personal, no
        exclusiva e intransferible para usar la plataforma conforme a estos Términos.
      </p>
      <br />

      <h2>7. Contenidos del usuario</h2>
      <p>
        El usuario conserva los derechos sobre la información y evidencias que aporta y otorga a
        Bio Tokens una licencia mundial, no exclusiva y gratuita para procesarlos con el fin de
        prestar el servicio, verificar el impacto y publicar métricas agregadas de trazabilidad.
      </p>
      <br />

      <h2>8. Servicios de terceros</h2>
      <p>
        La plataforma se integra con servicios de terceros (Stellar, Supabase, Microsoft, proveedores de
        geolocalización, oráculos de datos, entre otros). Su uso se rige por los términos y
        políticas de cada proveedor.
      </p>
      <br />

      <h2>9. Limitación de responsabilidad</h2>
      <p>
        El servicio se ofrece «tal cual» y «según disponibilidad». En la máxima medida permitida
        por la ley, Bio Tokens no será responsable por daños indirectos, incidentales, especiales
        o consecuentes, pérdida de beneficios, de datos o de valor de activos digitales.
      </p>
      <br />

      <h2>10. Suspensión y terminación</h2>
      <p>
        Podemos suspender o cerrar cuentas que incumplan estos Términos, presenten actividad
        fraudulenta o pongan en riesgo la integridad de la red de certificación.
      </p>
      <br />

      <h2>11. Modificaciones</h2>
      <p>
        Podemos actualizar estos Términos para reflejar cambios legales, técnicos o del servicio.
        Los cambios sustanciales se notificarán con antelación razonable. El uso continuado
        después de la entrada en vigor implica aceptación.
      </p>
      <br />

      <h2>12. Ley aplicable</h2>
      <p>
        Estos Términos se rigen por las leyes de la República de Colombia, sin perjuicio de las
        normas imperativas del país de residencia del usuario consumidor. Las controversias se
        resolverán ante los jueces competentes de dicho domicilio.
      </p>
      <br />

      <h2>13. Contacto</h2>
      <p>
        Para consultas sobre estos Términos escribe a{" "}
        <a href="mailto:biotokens@yamid.com.co">biotokens@yamid.com.co</a>
      </p>
    </article>
  );
}
