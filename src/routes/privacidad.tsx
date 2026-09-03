import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Declaración de privacidad — Bio Tokens" },
      { name: "description", content: "Cómo Bio Tokens recopila, usa y protege tus datos personales conforme al RGPD y la Ley 1581 de 2012." },
      { property: "og:title", content: "Declaración de privacidad — Bio Tokens" },
      { property: "og:description", content: "Política de tratamiento de datos personales de Bio Tokens." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacidadPage,
});

function PrivacidadPage() {
  const updated = "1 de julio de 2026";
  return (
    <article className="container mx-auto max-w-3xl px-4 py-12 prose prose-neutral dark:prose-invert">
      <h1>Declaración de privacidad</h1>
      <p className="text-sm text-muted-foreground">Última actualización: {updated}</p>
      <br />

      <p>
        En <strong>Bio Tokens</strong> respetamos tu privacidad y protegemos los datos
        personales que tratamos. Esta declaración explica qué información recopilamos, con qué
        finalidad, con quién la compartimos y qué derechos puedes ejercer, conforme al
        Reglamento (UE) 2016/679 (RGPD), la Ley 1581 de 2012 de Colombia y demás normativa
        aplicable.
      </p>
      <br />

      <h2>1. Responsable del tratamiento</h2>
      <p>
        Bio Tokens actúa como responsable del tratamiento de los datos recogidos a través de la
        plataforma. Para ejercer tus derechos o resolver dudas, contáctanos en{" "}
         <a href="/contacto">el servidor de Discord en la página de Contacto</a>.
      </p>
      <br />

      <h2>2. Datos que recopilamos</h2>
      <ul>
        <li><strong>Datos de cuenta:</strong> nombre, correo electrónico, organización, rol.</li>
        <li><strong>Datos de proyecto:</strong> nombre, ubicación (país, departamento, ciudad), sector, descripciones y evidencias.</li>
        <li><strong>Datos ambientales:</strong> lecturas de sensores IoT, mediciones, metadatos y sellos de tiempo.</li>
        <li><strong>Datos de billetera:</strong> clave pública Stellar y transacciones. <em>Nunca almacenamos claves secretas.</em></li>
        <li><strong>Datos técnicos:</strong> dirección IP, tipo de dispositivo, idioma, cookies y registros de uso.</li>
        <li><strong>Geolocalización aproximada:</strong> solo cuando el usuario la activa expresamente.</li>
        <br />
      </ul>

      <h2>3. Finalidades del tratamiento</h2>
      <ul>
        <li>Prestar y mejorar el servicio de certificación blockchain.</li>
        <li>Autenticar usuarios y prevenir el fraude.</li>
        <li>Emitir, validar y trazar tokens ambientales.</li>
        <li>Cumplir obligaciones legales, contables y fiscales.</li>
        <li>Enviar comunicaciones operativas y, con consentimiento, comerciales.</li>
        <li>Analítica agregada para medir impacto ambiental y desempeño de la plataforma.</li>
        <br />
      </ul>

      <h2>4. Bases legales</h2>
      <p>
        Tratamos tus datos con base en: (i) la ejecución del contrato de servicio; (ii) el
        cumplimiento de obligaciones legales; (iii) tu consentimiento (revocable en cualquier
        momento); y (iv) nuestro interés legítimo en garantizar la seguridad y mejorar la
        plataforma.
      </p>
      <br />

      <h2>5. Encargados y terceros</h2>
      <p>Compartimos datos únicamente con proveedores necesarios para operar el servicio:</p>
      <ul>
        <li><strong>Supabase</strong> (base de datos y autenticación).</li>
        <li><strong>Lovable Cloud</strong> (infraestructura y despliegue).</li>
        <li><strong>Stellar Development Foundation</strong> (red blockchain pública).</li>
        <li><strong>BigDataCloud</strong> (reverse geocoding opcional).</li>
        <li><strong>Microsoft</strong> (seguridad, automatización y exportación de datos).</li>
        <li>Proveedores de correo, analítica y seguridad, bajo acuerdos de confidencialidad.</li>
      </ul>
      <p>
        Algunos proveedores pueden estar ubicados fuera de tu país; en tales casos aplicamos
        cláusulas contractuales tipo u otros mecanismos válidos de transferencia internacional.
      </p>
      <br />

      <h2>6. Blockchain y datos públicos</h2>
      <p>
        Las transacciones registradas en Stellar son <strong>públicas e inmutables</strong>. No
        publicamos datos personales directamente en la cadena, pero los identificadores de
        billetera y los metadatos de los tokens quedan visibles por diseño.
      </p>
      <br />

      <h2>7. Conservación</h2>
      <p>
        Conservamos los datos mientras la cuenta esté activa y durante los plazos legales
        aplicables. Los registros ambientales certificados se conservan de forma indefinida por
        su valor probatorio de reducción de emisiones.
      </p>
      <br />

      <h2>8. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas: cifrado en tránsito (TLS) y en reposo,
        control de acceso basado en roles, autenticación multifactor, auditoría de logs,
        políticas Row Level Security en la base de datos y monitoreo continuo.
      </p>
      <br />

      <h2>9. Cookies</h2>
      <p>
        Utilizamos cookies estrictamente necesarias para la sesión y las preferencias
        (idioma, tema). Cualquier cookie analítica o de terceros se activa previo consentimiento.
      </p>
      <br />

      <h2>10. Tus derechos</h2>
      <p>Puedes ejercer los derechos de:</p>
      <ul>
        <li>Acceso, rectificación y actualización.</li>
        <li>Supresión («derecho al olvido») cuando proceda.</li>
        <li>Oposición y limitación del tratamiento.</li>
        <li>Portabilidad de tus datos en formato estructurado.</li>
        <li>Revocar el consentimiento otorgado.</li>
        <li>Presentar reclamación ante la autoridad de control (SIC en Colombia, AEPD en España, u otra competente).</li>
      </ul>
      <p>
        Escribe a <a href="mailto:biotokens@yamid.com.co">biotokens@yamid.com.co</a> y
        responderemos en un plazo máximo de 15 días hábiles.
      </p>
      <br />

      <h2>11. Menores de edad</h2>
      <p>
        El servicio no está dirigido a menores de 18 años. Si detectamos una cuenta de un menor,
        procederemos a su eliminación.
      </p>
      <br />

      <h2>12. Cambios en esta declaración</h2>
      <p>
        Podemos actualizar esta política. Notificaremos los cambios significativos por correo
        electrónico o mediante aviso destacado en la plataforma.
      </p>
    </article>
  );
}
